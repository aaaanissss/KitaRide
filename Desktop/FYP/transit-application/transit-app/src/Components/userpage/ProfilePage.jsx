import React, { useEffect, useState } from "react";
import "./ProfilePage.css";

export default function ProfilePage() {
  // 1. Read auth user ONCE into state
  const [authUser] = useState(() => {
    const stored = localStorage.getItem("authUser");
    return stored ? JSON.parse(stored) : null;
  });

  const [attractions, setAttractions] = useState([]);
  const [requests, setRequests] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // which sub-tab inside "My Submitted Attractions"
  const [attractionTab, setAttractionTab] = useState("new"); // "new" | "edit"

  // selection
  const [selectedAttraction, setSelectedAttraction] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);

  // For request diff view 
  const snapshot = selectedRequest?.existing_snapshot || {};
  const requestedChanges = selectedRequest?.requested_changes || {};
  const allDiffKeys = Array.from(
    new Set([...Object.keys(snapshot), ...Object.keys(requestedChanges)])
);

  const userId = authUser?.id ?? null;

  useEffect(() => {
    if (!userId) {
      setError("Missing user information.");
      setLoading(false);
      return;
    }

    async function loadProfileData() {
      try {
        setLoading(true);
        setError("");

        const token = localStorage.getItem("authToken") || "";
        const authHeaders = token
          ? { Authorization: `Bearer ${token}` }
          : undefined;

        const [attrRes, reviewRes, reqRes] = await Promise.all([
          fetch(`/api/users/${userId}/attractions`),
          fetch(`/api/users/${userId}/reviews`),
          fetch(`/api/users/${userId}/attraction-requests`, {
            headers: authHeaders,
          }),
        ]);

        if (!attrRes.ok || !reviewRes.ok || !reqRes.ok) {
          throw new Error("Failed to load profile data.");
        }

        const attrData = await attrRes.json();
        const reviewData = await reviewRes.json();
        const reqData = await reqRes.json();

        setAttractions(
          Array.isArray(attrData.attractions)
            ? attrData.attractions
            : Array.isArray(attrData)
            ? attrData
            : []
        );

        setReviews(
          Array.isArray(reviewData.reviews)
            ? reviewData.reviews
            : Array.isArray(reviewData)
            ? reviewData
            : []
        );

        setRequests(
          Array.isArray(reqData.requests)
            ? reqData.requests
            : Array.isArray(reqData)
            ? reqData
            : []
        );
      } catch (err) {
        console.error("Profile load error:", err);
        setError(err.message || "Failed to load profile data.");
      } finally {
        setLoading(false);
      }
    }

    loadProfileData();
  }, [userId]);

  const niceRole =
    authUser?.role === "commuter"
      ? "Commuter"
      : authUser?.role === "admin"
      ? "Administrator"
      : authUser?.role || "User";

  // small helpers
  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString() : "-";

  const formatDateTime = (d) =>
    d ? new Date(d).toLocaleString() : "-";

  const renderStatusPill = (rawStatus, isVerified) => {
    let statusSlug = (rawStatus || "").toLowerCase();
    if (!statusSlug) {
      statusSlug = isVerified ? "approved" : "pending";
    }

    const label =
      statusSlug === "approved"
        ? "Approved"
        : statusSlug === "rejected"
        ? "Rejected"
        : "Pending";

    return (
      <span className={"status-pill status-" + statusSlug}>{label}</span>
    );
  };

  return (
    <main className="profilePage with-fixed-header">
      <div className="profile-container">
        {/* Top card: basic user info */}
        <section className="profile-header-card">
          <div className="profile-avatar">
            {authUser?.username?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="profile-header-text">
            <h1>{authUser?.username || "User"}</h1>
            <p>{niceRole}</p>
          </div>
        </section>

        {/* Error / loading states */}
        {loading && <p className="profile-status">Loading your activity…</p>}
        {error && !loading && (
          <p className="profile-status profile-status--error">{error}</p>
        )}

        {!loading && !error && (
          <div className="profile-grid">
            {/* LEFT: attractions + change requests */}
            <section className="profile-section">
              <div className="profile-section-header-row">
                <div>
                  <h2>My Submitted Attractions</h2>
                  <p className="profile-section-sub">
                    Attractions you added to the network, and any change
                    requests you’ve made.
                  </p>
                </div>

                {/* toggle between New vs Edit/Delete view */}
                <div className="profile-toggle-pill">
                  <button
                    type="button"
                    className={
                      "profile-toggle-pill-btn" +
                      (attractionTab === "new"
                        ? " profile-toggle-pill-btn--active"
                        : "")
                    }
                    onClick={() => {
                      setAttractionTab("new");
                      setSelectedRequest(null);
                    }}
                  >
                    New attractions
                  </button>
                  <button
                    type="button"
                    className={
                      "profile-toggle-pill-btn" +
                      (attractionTab === "edit"
                        ? " profile-toggle-pill-btn--active"
                        : "")
                    }
                    onClick={() => {
                      setAttractionTab("edit");
                      setSelectedAttraction(null);
                    }}
                  >
                    Edit / delete
                  </button>
                </div>
              </div>

              {/* --- TAB 1: New attractions --- */}
              {attractionTab === "new" && (
                <>
                  {attractions.length === 0 ? (
                    <p className="profile-empty">
                      You haven’t submitted any attractions yet.
                    </p>
                  ) : (
                    <div className="profile-table">
                      <div className="profile-table-header">
                        <span>Attraction</span>
                        <span>Station</span>
                        <span>Status</span>
                        <span>Updated</span>
                      </div>
                      {attractions.map((a) => {
                        const isActive =
                          selectedAttraction?.atrid === a.atrid;

                        return (
                          <div
                            key={a.atrid || a.id}
                            className={
                              "profile-table-row profile-table-row--clickable" +
                              (isActive ? " profile-table-row--active" : "")
                            }
                            onClick={() => {
                              setSelectedAttraction(a);
                              setSelectedRequest(null);
                            }}
                          >
                            <span className="profile-main-name">
                              {a.atrname || a.name}
                            </span>
                            <span>{a.stationname || a.stationName || "—"}</span>
                            <span>
                              {renderStatusPill(a.status, a.isverified)}
                            </span>
                            <span>
                              {a.updatedat
                                ? formatDate(a.updatedat)
                                : a.created_at || a.createdat
                                ? formatDate(a.created_at || a.createdat)
                                : "-"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* detail card for selected attraction */}
                  {selectedAttraction && (
                    <div className="profile-detail-card">
                      <h3>{selectedAttraction.atrname}</h3>
                      <p className="profile-detail-meta">
                        {selectedAttraction.atrcategory || "—"}
                        <br />
                        Station:{" "}
                        {selectedAttraction.stationname || "—"} (
                        {selectedAttraction.stationid || "—"})
                        <br />
                        Status:{" "}
                        {renderStatusPill(
                          selectedAttraction.status,
                          selectedAttraction.isverified
                        )}{" "}
                        · Last updated{" "}
                        {selectedAttraction.updatedat
                          ? formatDateTime(selectedAttraction.updatedat)
                          : selectedAttraction.reviewed_at
                          ? formatDateTime(
                              selectedAttraction.reviewed_at
                            )
                          : selectedAttraction.created_at
                          ? formatDateTime(selectedAttraction.created_at)
                          : "-"}
                      </p>

                      {selectedAttraction.atraddress && (
                        <p className="profile-detail-text">
                          {selectedAttraction.atraddress}
                        </p>
                      )}

                      {selectedAttraction.openinghours && (
                        <p className="profile-detail-text">
                          🕒 {selectedAttraction.openinghours}
                        </p>
                      )}

                      <div className="profile-detail-links">
                        {selectedAttraction.atrwebsite && (
                          <a
                            href={selectedAttraction.atrwebsite}
                            target="_blank"
                            rel="noreferrer"
                          >
                            🌐 Website
                          </a>
                        )}
                        {selectedAttraction.atrmaplocation && (
                          <a
                            href={selectedAttraction.atrmaplocation}
                            target="_blank"
                            rel="noreferrer"
                          >
                            🗺 Open in Maps
                          </a>
                        )}
                      </div>

                      <div className="profile-detail-admin">
                        <strong>Admin remark</strong>
                        <p>
                          {selectedAttraction.admin_remark
                            ? selectedAttraction.admin_remark
                            : selectedAttraction.status === "pending"
                            ? "Awaiting admin review."
                            : "—"}
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* --- TAB 2: Edit / delete requests --- */}
              {attractionTab === "edit" && (
                <>
                  {requests.length === 0 ? (
                    <p className="profile-empty">
                      You don’t have any edit/delete requests yet.
                    </p>
                  ) : (
                    <div className="profile-table">
                      <div className="profile-table-header">
                        <span>ID</span>
                        <span>Attraction</span>
                        <span>Type</span>
                        <span>Status</span>
                      </div>
                      {requests.map((r) => {
                        const isActive =
                          selectedRequest?.requestid === r.requestid;
                        const statusSlug = (r.status || "").toLowerCase();

                        return (
                          <div
                            key={r.requestid}
                            className={
                              "profile-table-row profile-table-row--clickable" +
                              (isActive ? " profile-table-row--active" : "")
                            }
                            onClick={() => {
                              setSelectedRequest(r);
                              setSelectedAttraction(null);
                            }}
                          >
                            <span>{r.requestid}</span>
                            <span className="profile-main-name">
                              {r.atrname || `Attraction #${r.atrid}`}
                            </span>
                            <span>{r.request_type}</span>
                            <span>
                              <span
                                className={
                                  "status-pill status-" +
                                  (statusSlug || "pending")
                                }
                              >
                                {statusSlug || "pending"}
                              </span>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                )}

                {/* detail card for selected request */}
                {selectedRequest && (
                <div className="profile-detail-card">
                    <h3>
                    Request #{selectedRequest.requestid} ·{" "}
                    {selectedRequest.request_type.toUpperCase()}
                    </h3>
                    <p className="profile-detail-meta">
                    Attraction:{" "}
                    <strong>
                        {selectedRequest.atrname || `#${selectedRequest.atrid}`}
                    </strong>
                    <br />
                    Status:{" "}
                    <span className="profile-detail-status">
                        {renderStatusPill(selectedRequest.status, false)}
                    </span>
                    <br />
                    Created: {formatDateTime(selectedRequest.created_at)}
                    {selectedRequest.handled_at && (
                        <>
                        {" · "}Handled:{" "}
                        {formatDateTime(selectedRequest.handled_at)}
                        </>
                    )}
                    </p>

                    {selectedRequest.reason && (
                        <div className="profile-detail-admin">
                            <strong>Your reason</strong>
                            <p>{selectedRequest.reason}</p>
                        </div>
                    )}

                    {/* 🔍 current vs requested values, for EDIT requests */}
                    {selectedRequest.request_type === "edit" && allDiffKeys.length > 0 && (
                    <>
                        <p className="profile-request-sub">
                        Here’s how your request changes the existing attraction details:
                        </p>

                        <div className="profile-change-table">
                        <div className="profile-change-header">
                            <span>Field</span>
                            <span>Current</span>
                            <span>Requested</span>
                        </div>
                        {allDiffKeys.map((key) => (
                            <div key={key} className="profile-change-row">
                            <span>{key}</span>
                            <span>{snapshot[key] ?? "—"}</span>
                            <span>{requestedChanges[key] ?? "—"}</span>
                            </div>
                        ))}
                        </div>
                    </>
                    )}

                    <div className="profile-detail-admin profile-request-admin">
                    <strong>Admin response</strong>
                    <p>
                        {selectedRequest.admin_remark
                        ? selectedRequest.admin_remark
                        : selectedRequest.status === "pending"
                        ? "This request is waiting for admin review."
                        : "—"}
                    </p>
                    </div>
                </div>
                )}

                </>
              )}
            </section>

            {/* RIGHT: reviews submitted */}
            <section className="profile-section">
              <h2>My Reviews</h2>
              <p className="profile-section-sub">
                Feedback you’ve shared on attractions.
              </p>

              {reviews.length === 0 ? (
                <p className="profile-empty">
                  You haven’t written any reviews yet.
                </p>
              ) : (
                <div className="profile-reviews">
                  {reviews.map((r) => (
                    <div
                      key={r.revid || r.id}
                      className="profile-review-card"
                    >
                      <div className="profile-review-header">
                        <h3>{r.atrname || r.attractionName}</h3>
                        <div className="profile-review-rating">
                          {"★".repeat(Number(r.rating || 0)) || "★"}
                          <span>{Number(r.rating || 0).toFixed(1)}</span>
                        </div>
                      </div>
                      {r.comment && (
                        <p className="profile-review-comment">{r.comment}</p>
                      )}
                      <p className="profile-review-meta">
                        {r.created_at || r.createdat
                          ? new Date(
                              r.created_at || r.createdat
                            ).toLocaleString()
                          : ""}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

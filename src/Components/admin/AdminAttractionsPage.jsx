import React, { useEffect, useState } from "react";
import "../userpage/ProfilePage.css"; // reuse styling
import "./AdminPage.css";                 // <- make sure this imports your admin CSS

export default function AdminAttractionsPage() {
  const [statusFilter, setStatusFilter] = useState("pending");
  const [attractions, setAttractions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedAttraction, setSelectedAttraction] = useState(null);
  const [attractionRemark, setAttractionRemark] = useState("");

  // requests
  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [requestsError, setRequestsError] = useState("");
  const [requestFilter, setRequestFilter] = useState("pending");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [requestRemark, setRequestRemark] = useState("");
  const [toast, setToast] = useState(null);

  const token = localStorage.getItem("authToken");

  // ---------- ATTRACTIONS ----------

  const loadAttractions = async (status = statusFilter) => {
    if (!token) return;
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`/api/admin/attractions?status=${status}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("Failed to load attractions");
      const data = await res.json();
      setAttractions(data.attractions || []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Error loading admin data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttractions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const decideAttraction = async (atrid, decision) => {
    if (!token || !atrid) return;
    try {
      const res = await fetch(`/api/admin/attractions/${atrid}/decision`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          decision,
          adminRemark: attractionRemark || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to save decision");
      await res.json();
      setAttractionRemark("");
      await loadAttractions();
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to update attraction");
    }
  };

  // ---------- ATTRACTION REQUESTS ----------

  async function loadRequests(status = requestFilter) {
    if (!token) return;
    try {
      setLoadingRequests(true);
      setRequestsError("");

      const res = await fetch(
        `/api/admin/attraction-requests?status=${status}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) throw new Error("Failed to load requests");

      const data = await res.json();
      setRequests(data.requests || []);
    } catch (err) {
      console.error(err);
      setRequestsError(err.message || "Failed to load requests");
    } finally {
      setLoadingRequests(false);
    }
  }

  useEffect(() => {
    loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestFilter]);

  async function handleRequestDecision(decision) {
    if (!selectedRequest || !token) return;

    try {
      const res = await fetch(
        `/api/admin/attraction-requests/${selectedRequest.requestid}/decision`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            decision,
            adminRemark: requestRemark || undefined,
          }),
        }
      );
      if (!res.ok) throw new Error("Failed to update request");

      const actionLabel =
        decision === "approved" ? "Approved" : decision === "rejected" ? "Rejected" : "Updated";
      setToast({
        type: decision === "rejected" ? "error" : "success",
        message: `${actionLabel} request #${selectedRequest.requestid}.`,
      });

      setRequestRemark("");
      setSelectedRequest(null);
      await loadRequests();
      await loadAttractions(); // attraction status might change too
    } catch (err) {
      console.error(err);
      setToast({
        type: "error",
        message: err.message || "Failed to update request.",
      });
    }
  }

  // helper for request detail view
  const snapshot = selectedRequest?.existing_snapshot || {};
  const requestedChanges = selectedRequest?.requested_changes || {};
  const allKeys = Array.from(
    new Set([...Object.keys(snapshot), ...Object.keys(requestedChanges)])
  );
  const filteredKeys = allKeys.filter((k) => k !== "coverimageurl");
  const currentPhoto = snapshot?.coverimageurl || null;
  const requestedPhoto = requestedChanges?.coverimageurl || null;
  const formatValueWithUnit = (value, unit) => {
    if (value === null || value === undefined || value === "") return "-";
    return `${value} ${unit}`;
  };

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(id);
  }, [toast]);

  return (
    <main className="profilePage with-fixed-header">
      {toast && (
        <div className={`admin-toast admin-toast--${toast.type}`}>
          {toast.message}
        </div>
      )}
      <div className="profile-container">
        {/* header card */}
        <section className="profile-header-card admin-header-card">
          <div className="profile-avatar">A</div>
          <div className="profile-header-text">
            <h1>Admin Dashboard</h1>
            <p>Attraction moderation & approvals</p>
          </div>
        </section>

        {/* 3-column grid on desktop */}
        <div className="profile-grid admin-attractions-grid">
          {/* ===== COLUMN 1: Edit/Delete Requests ===== */}
          <section className="profile-section admin-requests-section">
            <div className="admin-section-header">
              <h2>Edit/Delete Requests</h2>
              <div className="admin-users-filters">
                {["pending", "approved", "rejected", "all"].map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={
                      "admin-chip" + (requestFilter === s ? " admin-chip--active" : "")
                    }
                    onClick={() => {
                      setRequestFilter(s);
                      setSelectedRequest(null);
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {loadingRequests && <p className="profile-status">Loading…</p>}
            {requestsError && !loadingRequests && (
              <p className="profile-status profile-status--error">
                {requestsError}
              </p>
            )}

            {!loadingRequests && !requestsError && requests.length === 0 && (
              <p className="profile-empty">No requests under this filter.</p>
            )}

            {!loadingRequests && !requestsError && requests.length > 0 && (
              <div className="profile-table admin-requests-table">
                <div className="profile-table-header">
                  <span>ID</span>
                  <span>Attraction</span>
                  <span>Type</span>
                  <span>User</span>
                </div>

                {requests.map((r) => (
                  <div
                    key={r.requestid}
                    className={
                      "profile-table-row admin-request-row" +
                      (selectedRequest?.requestid === r.requestid
                        ? " admin-request-row--active"
                        : "")
                    }
                    onClick={() => {
                      setSelectedRequest(r);
                      setRequestRemark(r.admin_remark || "");
                      // clear attraction selection
                      setSelectedAttraction(null);
                      setAttractionRemark("");
                    }}
                  >
                    <span>{r.requestid}</span>
                    <span className="profile-main-name">
                      {r.atrname || `#${r.atrid}`}
                    </span>
                    <span>{r.request_type}</span>
                    <span>{r.requester_username || "—"}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ===== COLUMN 2: Attractions list ===== */}
          <section className="profile-section">
            <div className="admin-section-header">
              <h2>Attractions</h2>
              <div className="admin-users-filters">
                {["pending", "approved", "rejected", "all"].map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={
                      "admin-chip" + (statusFilter === s ? " admin-chip--active" : "")
                    }
                    onClick={() => {
                      setStatusFilter(s);
                      setSelectedAttraction(null);
                    }}
                  >
                    {s[0].toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {loading && <p className="profile-status">Loading…</p>}
            {error && !loading && (
              <p className="profile-status profile-status--error">{error}</p>
            )}

            {!loading && !error && attractions.length === 0 && (
              <p className="profile-empty">No attractions under this filter.</p>
            )}

            {!loading && !error && attractions.length > 0 && (
              <div className="profile-table admin-attractions-table">
                <div className="profile-table-header">
                  <span>Attraction</span>
                  <span>Station</span>
                  <span>Status</span>
                  <span>Created</span>
                </div>
                {attractions.map((a) => (
                  <div
                    key={a.atrid}
                    className={
                      "profile-table-row" +
                      (selectedAttraction?.atrid === a.atrid
                        ? " admin-attraction-row--active"
                        : "")
                    }
                    style={{ cursor: "pointer" }}
                    onClick={() => {
                      setSelectedAttraction(a);
                      setAttractionRemark(a.admin_remark || "");
                      // clear request selection
                      setSelectedRequest(null);
                      setRequestRemark("");
                    }}
                  >
                    <span className="profile-main-name">{a.atrname}</span>
                    <span>{a.stationname || "—"}</span>
                    <span>
                      <span
                        className={
                          "status-pill status-" + (a.status || "pending")
                        }
                      >
                        {a.status || "pending"}
                      </span>
                    </span>
                    <span>
                      {a.created_at
                        ? new Date(a.created_at).toLocaleDateString()
                        : "-"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ===== COLUMN 3: Details & Decision ===== */}          {/* ===== COLUMN 3: Details & Decision ===== */}
          <section className="profile-section admin-details-section">
            <h2>Details & Decision</h2>

            {selectedRequest ? (
              /* ------- REQUEST MODE ------- */
              <div className="admin-detail-card">
                <h3>Request #{selectedRequest.requestid}</h3>
                <p className="admin-detail-meta">
                  <strong>{selectedRequest.request_type.toUpperCase()}</strong>{" "}
                  · {selectedRequest.atrname || `Attraction #${selectedRequest.atrid}`}
                  <br />
                  By {selectedRequest.requester_username || "Unknown"}
                  {selectedRequest.created_at && (
                    <>
                      {" · "}
                      {new Date(selectedRequest.created_at).toLocaleString()}
                    </>
                  )}
                </p>

                {selectedRequest.reason && (
                  <p className="admin-detail-reason">
                    <strong>Reason:</strong> {selectedRequest.reason}
                  </p>
                )}

                {/* Existing vs requested changes (for edit) */}
                {selectedRequest.request_type === "edit" && (currentPhoto || requestedPhoto) && (
                  <div className="admin-request-photos">
                    <div className="admin-request-photos-title">Photo change</div>
                    <div className="admin-request-photos-row">
                      <div className="admin-request-photo">
                        <div className="admin-request-photo-label">Current</div>
                        {currentPhoto ? (
                          <img src={currentPhoto} alt="Current attraction" />
                        ) : (
                          <div className="admin-request-photo-empty">No photo</div>
                        )}
                      </div>
                      <div className="admin-request-photo">
                        <div className="admin-request-photo-label">Requested</div>
                        {requestedPhoto ? (
                          <img src={requestedPhoto} alt="Requested attraction" />
                        ) : (
                          <div className="admin-request-photo-empty">No change</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {selectedRequest.request_type === "edit" && filteredKeys.length > 0 && (
                  <div className="admin-change-table">
                    <div className="admin-change-header">
                      <span>Field</span>
                      <span>Current</span>
                      <span>Requested</span>
                    </div>
                    {filteredKeys.map((key) => (
                      <div key={key} className="admin-change-row">
                        <span>{key}</span>
                        <span>{snapshot[key] ?? "-"}</span>
                        <span>{requestedChanges[key] ?? "-"}</span>
                      </div>
                    ))}
                  </div>
                )}

                <label className="admin-detail-label">
                  Admin remark for this request
                </label>
                <textarea
                  value={requestRemark}
                  onChange={(e) => setRequestRemark(e.target.value)}
                  className="admin-detail-textarea"
                  placeholder="Explain why you approve or reject this request…"
                />

                <div className="admin-detail-actions">
                  <button
                    type="button"
                    className="admin-btn admin-btn--danger"
                    onClick={() => handleRequestDecision("rejected")}
                  >
                    Reject Request
                  </button>
                  <button
                    type="button"
                    className="admin-btn admin-btn--primary"
                    onClick={() => handleRequestDecision("approved")}
                  >
                    Approve Request
                  </button>
                </div>
              </div>
            ) : selectedAttraction ? (
              /* ------- ATTRACTION MODE ------- */
              <div className="admin-detail-card">
                <h3>{selectedAttraction.atrname}</h3>
                <p className="admin-detail-meta">
                  {selectedAttraction.atrcategory || "—"}
                  <br />
                  Station: {selectedAttraction.stationname || "—"} (
                  {selectedAttraction.stationid || "—"})
                  <br />
                  By: {selectedAttraction.creator_username || "Unknown User"}
                  {selectedAttraction.created_at && (
                    <>
                      {" · "}
                      {new Date(selectedAttraction.created_at).toLocaleString()}
                    </>
                  )}
                </p>

                {/* Complete User-Submitted Information */}
                <div className="admin-attraction-form">
                  <h4>📋 Submitted Information</h4>
                  
                  <div className="admin-form-section">
                    <strong>Basic Details:</strong>
                    <p><strong>Name:</strong> {selectedAttraction.atrname || "—"}</p>
                    <p><strong>Category:</strong> {selectedAttraction.atrcategory || "—"}</p>
                    {selectedAttraction.atraddress && (
                      <p><strong>Address:</strong> {selectedAttraction.atraddress}</p>
                    )}
                    {selectedAttraction.atrwebsite && (
                      <p><strong>Website:</strong> <a href={selectedAttraction.atrwebsite} target="_blank" rel="noopener noreferrer">{selectedAttraction.atrwebsite}</a></p>
                    )}
                    {selectedAttraction.mapLocation && (
                      <p><strong>Map Location:</strong> {selectedAttraction.atrmaplocation}</p>
                    )}
                    {selectedAttraction.openinghours && (
                      <p><strong>Opening Hours:</strong> 🕒 {selectedAttraction.openinghours}</p>
                    )}
                  </div>

                  <div className="admin-form-section">
                    <strong>Location Details:</strong>
                    {selectedAttraction.atrlatitude && selectedAttraction.atrlongitude && (
                      <p><strong>Coordinates:</strong> {selectedAttraction.atrlatitude}, {selectedAttraction.atrlongitude}</p>
                    )}
                  </div>

                  <div className="admin-form-section">
                    <strong>Station Connection:</strong>
                    <p><strong>Station:</strong> {selectedAttraction.stationname || "-"} ({selectedAttraction.stationid || "-"})</p>
                    <p><strong>Distance:</strong> {formatValueWithUnit(selectedAttraction.distance, "meters")}</p>
                    <p><strong>Travel Time:</strong> {formatValueWithUnit(selectedAttraction.traveltimeminutes, "minutes")}</p>
                    {selectedAttraction.commuteoption && (
                      <p><strong>Commute Option:</strong> {selectedAttraction.commuteoption}</p>
                    )}
                  </div>

                  <div className="admin-form-section">
                    <strong>Media:</strong>
                    {selectedAttraction.coverimageurl && (
                      <div className="admin-image-preview">
                        <p><strong>Image:</strong></p>
                        <img 
                          src={selectedAttraction.coverimageurl} 
                          alt={selectedAttraction.atrname}
                          className="admin-attraction-image"
                          onError={(e) => e.target.style.display='none'}
                        />
                      </div>
                    )}
                  </div>

                  <div className="admin-form-section">
                    <strong>Review Stats:</strong>
                    <p><strong>Average Rating:</strong> {selectedAttraction.avg_rating || "No reviews"} ({selectedAttraction.review_count || 0} reviews)</p>
                  </div>

                  <div className="admin-form-section">
                    <strong>Status:</strong>
                    <span className={`status-pill status-${selectedAttraction.status || "pending"}`}>
                      {selectedAttraction.status || "pending"}
                    </span>
                  </div>
                </div>

                {/* Admin Remark Section */}
                <div className="admin-form-section">
                  <label className="admin-detail-label">
                    Admin remark for this attraction
                  </label>
                  <textarea
                    value={attractionRemark}
                    onChange={(e) => setAttractionRemark(e.target.value)}
                    className="admin-detail-textarea"
                    placeholder="Explain why you approve or reject this attraction…"
                  />
                </div>

                {/* Approval Actions */}
                <div className="admin-detail-actions">
                  <button
                    type="button"
                    className="admin-btn admin-btn--danger"
                    onClick={() =>
                      decideAttraction(selectedAttraction.atrid, "reject")
                    }
                  >
                    Reject Attraction
                  </button>
                  <button
                    type="button"
                    className="admin-btn admin-btn--primary"
                    onClick={() =>
                      decideAttraction(selectedAttraction.atrid, "approve")
                    }
                  >
                    Approve Attraction
                  </button>
                </div>
              </div>
            ) : (
              /* ------- NOTHING SELECTED ------- */
              <p className="profile-empty">
                Click a request on the left to review it, or an attraction in
                the middle to decide on it.
              </p>
            )}
          </section>

        </div>
      </div>
    </main>
  );
}

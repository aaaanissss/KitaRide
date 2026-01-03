// src/admin/AdminAttractionsPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import "../userpage/ProfilePage.css";
import "./AdminPage.css";
import { apiFetch } from "../../lib/api";

/**
 * AdminAttractionsPage (corrected)
 * - Fixes duplicate-key warnings by ensuring we render ONE row per attraction/request (server returns unique rows)
 * - Supports attraction.stations[] (aggregated JSONB from backend)
 * - Safer guards for null/undefined fields
 * - Clears selection properly when switching filters / clicking the other list
 * - Pagination stable
 */
export default function AdminAttractionsPage() {
  // ---- Filters
  const [statusFilter, setStatusFilter] = useState("pending"); // attractions: pending|approved|rejected|all
  const [requestFilter, setRequestFilter] = useState("pending"); // requests: pending|approved|rejected|all

  // ---- Attractions data
  const [attractions, setAttractions] = useState([]);
  const [loadingAttractions, setLoadingAttractions] = useState(true);
  const [attractionsError, setAttractionsError] = useState("");
  const [selectedAttraction, setSelectedAttraction] = useState(null);
  const [attractionRemark, setAttractionRemark] = useState("");

  // ---- Requests data
  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [requestsError, setRequestsError] = useState("");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [requestRemark, setRequestRemark] = useState("");

  // ---- Toast
  const [toast, setToast] = useState(null);

  // ---- Pagination
  const [attractionsPage, setAttractionsPage] = useState(1);
  const [requestsPage, setRequestsPage] = useState(1);
  const attractionsPerPage = 5;
  const requestsPerPage = 5;

  const token = localStorage.getItem("authToken");

  // =========================
  // Helpers
  // =========================
  const getPaginatedData = (data, page, perPage) => {
    const start = (page - 1) * perPage;
    return data.slice(start, start + perPage);
  };

  const getTotalPages = (data, perPage) =>
    Math.max(1, Math.ceil((data?.length || 0) / perPage));

  const renderPagination = (currentPage, totalPages, onPageChange) => {
    if (totalPages <= 1) return null;

    const pages = [];
    const maxVisible = 5;

    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    if (startPage > 1) {
      pages.push(
        <button
          key="page-1"
          onClick={() => onPageChange(1)}
          className="admin-page-btn"
          type="button"
        >
          1
        </button>
      );
      if (startPage > 2) {
        pages.push(
          <span key="start-ellipsis" className="admin-page-ellipsis">
            ...
          </span>
        );
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={`page-${i}`}
          onClick={() => onPageChange(i)}
          className={`admin-page-btn ${
            i === currentPage ? "admin-page-btn--active" : ""
          }`}
          type="button"
        >
          {i}
        </button>
      );
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pages.push(
          <span key="end-ellipsis" className="admin-page-ellipsis">
            ...
          </span>
        );
      }
      pages.push(
        <button
          key={`page-${totalPages}`}
          onClick={() => onPageChange(totalPages)}
          className="admin-page-btn"
          type="button"
        >
          {totalPages}
        </button>
      );
    }

    return (
      <div className="admin-pagination">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="admin-page-btn admin-page-btn--nav"
          type="button"
        >
          ←
        </button>
        {pages}
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="admin-page-btn admin-page-btn--nav"
          type="button"
        >
          →
        </button>
      </div>
    );
  };

  const formatValueWithUnit = (value, unit) => {
    if (value === null || value === undefined || value === "") return "-";
    return `${value} ${unit}`;
  };

  const safeArray = (v) => (Array.isArray(v) ? v : []);

  // =========================
  // Data loaders
  // =========================
  const loadAttractions = async (status = statusFilter) => {
    if (!token) {
      setAttractionsError("Missing auth token. Please login again.");
      setLoadingAttractions(false);
      return;
    }
    try {
      setLoadingAttractions(true);
      setAttractionsError("");

      const res = await apiFetch(`/api/admin/attractions?status=${status}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || "Failed to load attractions");
      }

      const data = await res.json();
      setAttractions(safeArray(data.attractions));
      setAttractionsPage(1);
    } catch (err) {
      console.error(err);
      setAttractionsError(err.message || "Error loading attractions");
    } finally {
      setLoadingAttractions(false);
    }
  };

  const loadRequests = async (status = requestFilter) => {
    if (!token) {
      setRequestsError("Missing auth token. Please login again.");
      setLoadingRequests(false);
      return;
    }
    try {
      setLoadingRequests(true);
      setRequestsError("");

      const res = await apiFetch(`/api/admin/attraction-requests?status=${status}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || "Failed to load requests");
      }

      const data = await res.json();
      setRequests(safeArray(data.requests));
      setRequestsPage(1);
    } catch (err) {
      console.error(err);
      setRequestsError(err.message || "Error loading requests");
    } finally {
      setLoadingRequests(false);
    }
  };

  // load on filter changes
  useEffect(() => {
    loadAttractions(statusFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  useEffect(() => {
    loadRequests(requestFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestFilter]);

  // toast auto-hide
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  // =========================
  // Decisions (Attractions)
  // =========================
  const decideAttraction = async (atrid, decision) => {
    if (!token || !atrid) return;

    try {
      const res = await apiFetch(`/api/admin/attractions/${atrid}/decision`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          decision, // "approve" | "reject"
          adminRemark: attractionRemark?.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || "Failed to save decision");
      }

      setToast({
        type: decision === "reject" ? "error" : "success",
        message: `${decision === "reject" ? "Rejected" : "Approved"} attraction #${atrid}.`,
      });

      setAttractionRemark("");
      setSelectedAttraction(null);

      await loadAttractions(statusFilter);
      // (optional) refresh requests too if you want
      // await loadRequests(requestFilter);
    } catch (err) {
      console.error(err);
      setToast({ type: "error", message: err.message || "Failed to update attraction" });
    }
  };

  // =========================
  // Decisions (Requests)
  // =========================
  const handleRequestDecision = async (decision) => {
    if (!selectedRequest || !token) return;

    try {
      const res = await apiFetch(
        `/api/admin/attraction-requests/${selectedRequest.requestid}/decision`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            decision, // "approved" | "rejected"
            adminRemark: requestRemark?.trim() || undefined,
          }),
        }
      );

      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || "Failed to update request");
      }

      const actionLabel = decision === "approved" ? "Approved" : "Rejected";

      setToast({
        type: decision === "rejected" ? "error" : "success",
        message: `${actionLabel} request #${selectedRequest.requestid}.`,
      });

      setRequestRemark("");
      setSelectedRequest(null);

      await loadRequests(requestFilter);
      await loadAttractions(statusFilter);
    } catch (err) {
      console.error(err);
      setToast({ type: "error", message: err.message || "Failed to update request." });
    }
  };

  // =========================
  // Derived details (Request)
  // =========================
  const snapshot = useMemo(() => selectedRequest?.existing_snapshot || {}, [selectedRequest]);
  const requestedChanges = useMemo(
    () => selectedRequest?.requested_changes || {},
    [selectedRequest]
  );

  const requestKeys = useMemo(() => {
    const keys = new Set([
      ...Object.keys(snapshot || {}),
      ...Object.keys(requestedChanges || {}),
    ]);
    keys.delete("coverimageurl"); // photo handled separately
    return Array.from(keys);
  }, [snapshot, requestedChanges]);

  const currentPhoto = snapshot?.coverimageurl || null;
  const requestedPhoto = requestedChanges?.coverimageurl || null;

  // =========================
  // Derived details (Attraction)
  // =========================
  const selectedStations = useMemo(() => {
    if (!selectedAttraction) return [];
    const stations = safeArray(selectedAttraction.stations);

    // sort by distance (nulls last)
    return stations
      .slice()
      .sort((a, b) => (a?.distance ?? 1e12) - (b?.distance ?? 1e12));
  }, [selectedAttraction]);

  // =========================
  // RENDER
  // =========================
  const attractionTotalPages = getTotalPages(attractions, attractionsPerPage);
  const requestTotalPages = getTotalPages(requests, requestsPerPage);

  return (
    <main className="profilePage with-fixed-header">
      {toast && (
        <div className={`admin-toast admin-toast--${toast.type}`}>{toast.message}</div>
      )}

      <div className="profile-container">
        {/* Header */}
        <section className="profile-header-card admin-header-card">
          <div className="profile-avatar">A</div>
          <div className="profile-header-text">
            <h1>Admin Dashboard</h1>
            <p>Attraction moderation & approvals</p>
          </div>
        </section>

        {/* 3-column grid */}
        <div className="profile-grid admin-attractions-grid">
          {/* =========================
              COLUMN 1: Requests
          ========================= */}
          <section className="profile-section admin-requests-section">
            <div className="admin-section-header">
              <h2>Edit/Delete Requests</h2>
              <div className="admin-users-filters">
                {["pending", "approved", "rejected", "all"].map((s) => (
                  <button
                    key={`req-filter-${s}`}
                    type="button"
                    className={"admin-chip" + (requestFilter === s ? " admin-chip--active" : "")}
                    onClick={() => {
                      setRequestFilter(s);
                      setSelectedRequest(null);
                      setRequestRemark("");
                      setRequestsPage(1);

                      // clear attraction selection too
                      setSelectedAttraction(null);
                      setAttractionRemark("");
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {loadingRequests && <p className="profile-status">Loading…</p>}
            {requestsError && !loadingRequests && (
              <p className="profile-status profile-status--error">{requestsError}</p>
            )}

            {!loadingRequests && !requestsError && requests.length === 0 && (
              <p className="profile-empty">No requests under this filter.</p>
            )}

            {!loadingRequests && !requestsError && requests.length > 0 && (
              <>
                <div className="profile-table admin-requests-table">
                  <div className="profile-table-header">
                    <span>ID</span>
                    <span>Attraction</span>
                    <span>Type</span>
                    <span>User</span>
                  </div>

                  {getPaginatedData(requests, requestsPage, requestsPerPage).map((r) => (
                    <div
                      key={`req-${r.requestid}`} // ✅ unique key
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
                      <span className="profile-main-name">{r.atrname || `#${r.atrid}`}</span>
                      <span>{r.request_type}</span>
                      <span>{r.requester_username || "—"}</span>
                    </div>
                  ))}
                </div>

                {renderPagination(requestsPage, requestTotalPages, setRequestsPage)}
              </>
            )}
          </section>

          {/* =========================
              COLUMN 2: Attractions
          ========================= */}
          <section className="profile-section">
            <div className="admin-section-header">
              <h2>Attractions</h2>
              <div className="admin-users-filters">
                {["pending", "approved", "rejected", "all"].map((s) => (
                  <button
                    key={`atr-filter-${s}`}
                    type="button"
                    className={"admin-chip" + (statusFilter === s ? " admin-chip--active" : "")}
                    onClick={() => {
                      setStatusFilter(s);
                      setSelectedAttraction(null);
                      setAttractionRemark("");
                      setAttractionsPage(1);

                      // clear request selection too
                      setSelectedRequest(null);
                      setRequestRemark("");
                    }}
                  >
                    {s[0].toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {loadingAttractions && <p className="profile-status">Loading…</p>}
            {attractionsError && !loadingAttractions && (
              <p className="profile-status profile-status--error">{attractionsError}</p>
            )}

            {!loadingAttractions && !attractionsError && attractions.length === 0 && (
              <p className="profile-empty">No attractions under this filter.</p>
            )}

            {!loadingAttractions && !attractionsError && attractions.length > 0 && (
              <>
                <div className="profile-table admin-attractions-table">
                  <div className="profile-table-header">
                    <span>Attraction</span>
                    <span>Nearby Stations</span>
                    <span>Status</span>
                    <span>Created</span>
                  </div>

                  {getPaginatedData(attractions, attractionsPage, attractionsPerPage).map((a) => {
                    const stations = safeArray(a.stations);
                    const first = stations?.[0];

                    const stationSummary = first
                      ? `${first.stationname}${stations.length > 1 ? ` +${stations.length - 1}` : ""}`
                      : "—";

                    return (
                      <div
                        key={`atr-${a.atrid}`} // ✅ unique key
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
                        <span title={stations.map((s) => s.stationname).join(", ")}>
                          {stationSummary}
                        </span>
                        <span>
                          <span className={"status-pill status-" + (a.status || "pending")}>
                            {a.status || "pending"}
                          </span>
                        </span>
                        <span>{a.created_at ? new Date(a.created_at).toLocaleDateString() : "-"}</span>
                      </div>
                    );
                  })}
                </div>

                {renderPagination(attractionsPage, attractionTotalPages, setAttractionsPage)}
              </>
            )}
          </section>

          {/* =========================
              COLUMN 3: Details & Decision
          ========================= */}
          <section className="profile-section admin-details-section">
            <h2>Details & Decision</h2>

            {/* -------- REQUEST MODE -------- */}
            {selectedRequest ? (
              <div className="admin-detail-card">
                <h3>Request #{selectedRequest.requestid}</h3>

                <p className="admin-detail-meta">
                  <strong>{String(selectedRequest.request_type || "").toUpperCase()}</strong> ·{" "}
                  {selectedRequest.atrname || `Attraction #${selectedRequest.atrid}`}
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

                {/* Photo change (edit only) */}
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

                {/* Existing vs requested changes */}
                {selectedRequest.request_type === "edit" && requestKeys.length > 0 && (
                  <div className="admin-change-table">
                    <div className="admin-change-header">
                      <span>Field</span>
                      <span>Current</span>
                      <span>Requested</span>
                    </div>

                    {requestKeys.map((key) => (
                      <div key={`req-field-${key}`} className="admin-change-row">
                        <span>{key}</span>
                        <span>{snapshot?.[key] ?? "-"}</span>
                        <span>{requestedChanges?.[key] ?? "-"}</span>
                      </div>
                    ))}
                  </div>
                )}

                <label className="admin-detail-label">Admin remark for this request</label>
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
            ) : /* -------- ATTRACTION MODE -------- */ selectedAttraction ? (
              <div className="admin-detail-card">
                <h3>{selectedAttraction.atrname}</h3>

                <p className="admin-detail-meta">
                  {selectedAttraction.atrcategory || "—"}
                  <br />
                  By: {selectedAttraction.creator_username || "Unknown User"}
                  {selectedAttraction.created_at && (
                    <>
                      {" · "}
                      {new Date(selectedAttraction.created_at).toLocaleString()}
                    </>
                  )}
                </p>

                <div className="admin-attraction-form">
                  <h4>📋 Submitted Information</h4>

                  <div className="admin-form-section">
                    <strong>Basic Details:</strong>
                    <p>
                      <strong>Name:</strong> {selectedAttraction.atrname || "—"}
                    </p>
                    <p>
                      <strong>Category:</strong> {selectedAttraction.atrcategory || "—"}
                    </p>
                    <p>
                      <strong>Address:</strong> {selectedAttraction.atraddress || "—"}
                    </p>
                    <p>
                      <strong>Website:</strong>{" "}
                      {selectedAttraction.atrwebsite ? (
                        <a
                          href={selectedAttraction.atrwebsite}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {selectedAttraction.atrwebsite}
                        </a>
                      ) : (
                        "—"
                      )}
                    </p>
                    <p>
                      <strong>Map Location:</strong> {selectedAttraction.atrmaplocation || "—"}
                    </p>
                    <p>
                      <strong>Opening Hours:</strong>{" "}
                      {selectedAttraction.openinghours ? `🕒 ${selectedAttraction.openinghours}` : "—"}
                    </p>
                  </div>

                  <div className="admin-form-section">
                    <strong>Location Details:</strong>
                    {selectedAttraction.atrlatitude && selectedAttraction.atrlongitude ? (
                      <p>
                        <strong>Coordinates:</strong> {selectedAttraction.atrlatitude},{" "}
                        {selectedAttraction.atrlongitude}
                      </p>
                    ) : (
                      <p>—</p>
                    )}
                  </div>

                  <div className="admin-form-section">
                    <strong>Nearby Stations:</strong>
                    {selectedStations.length ? (
                      <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                        {selectedStations.map((st) => (
                          <li key={`atr-st-${selectedAttraction.atrid}-${st.stationid}`}>
                            <strong>{st.stationname}</strong> ({st.stationid}) —{" "}
                            {formatValueWithUnit(st.distance, "m")},{" "}
                            {formatValueWithUnit(st.traveltimeminutes, "min")}
                            {st.commuteoption ? ` · ${st.commuteoption}` : ""}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>—</p>
                    )}
                  </div>

                  <div className="admin-form-section">
                    <strong>Media:</strong>
                    {selectedAttraction.coverimageurl ? (
                      <div className="admin-image-preview">
                        <p>
                          <strong>Image:</strong>
                        </p>
                        <img
                          src={selectedAttraction.coverimageurl}
                          alt={selectedAttraction.atrname}
                          className="admin-attraction-image"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      </div>
                    ) : (
                      <p>—</p>
                    )}
                  </div>

                  <div className="admin-form-section">
                    <strong>Review Stats:</strong>
                    <p>
                      <strong>Average Rating:</strong>{" "}
                      {Number(selectedAttraction.avg_rating || 0).toFixed(1)} (
                      {selectedAttraction.review_count || 0} reviews)
                    </p>
                  </div>

                  <div className="admin-form-section">
                    <strong>Status:</strong>{" "}
                    <span className={`status-pill status-${selectedAttraction.status || "pending"}`}>
                      {selectedAttraction.status || "pending"}
                    </span>
                  </div>
                </div>

                <div className="admin-form-section">
                  <label className="admin-detail-label">Admin remark for this attraction</label>
                  <textarea
                    value={attractionRemark}
                    onChange={(e) => setAttractionRemark(e.target.value)}
                    className="admin-detail-textarea"
                    placeholder="Explain why you approve or reject this attraction…"
                  />
                </div>

                <div className="admin-detail-actions">
                  <button
                    type="button"
                    className="admin-btn admin-btn--danger"
                    onClick={() => decideAttraction(selectedAttraction.atrid, "reject")}
                  >
                    Reject Attraction
                  </button>
                  <button
                    type="button"
                    className="admin-btn admin-btn--primary"
                    onClick={() => decideAttraction(selectedAttraction.atrid, "approve")}
                  >
                    Approve Attraction
                  </button>
                </div>
              </div>
            ) : (
              <p className="profile-empty">
                Click a request on the left to review it, or an attraction in the middle to decide on it.
              </p>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

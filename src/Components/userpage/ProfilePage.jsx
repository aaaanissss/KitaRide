import React, { useEffect, useMemo, useState } from "react";
import "./ProfilePage.css";
import { apiFetch } from "../../lib/api";

const PAGE_SIZE = 10;

function safeJson(value, fallback) {
  if (!value) return fallback;
  if (typeof value === "object") return value;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function normalizeText(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function formatDate(d) {
  if (!d) return "-";
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? String(d) : dt.toLocaleDateString();
}

function formatDateTime(d) {
  if (!d) return "-";
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? String(d) : dt.toLocaleString();
}

function renderStatusPill(rawStatus, isVerified) {
  let statusSlug = String(rawStatus || "").toLowerCase().trim();

  // fallback (older data)
  if (!statusSlug) statusSlug = isVerified ? "approved" : "pending";

  const label =
    statusSlug === "approved"
      ? "Approved"
      : statusSlug === "rejected"
      ? "Rejected"
      : "Pending";

  return <span className={"status-pill status-" + statusSlug}>{label}</span>;
}

export default function ProfilePage() {
  // read auth user once
  const [authUser] = useState(() => {
    const stored = localStorage.getItem("authUser");
    return stored ? JSON.parse(stored) : null;
  });

  const userId = authUser?.id ?? null;

  const [attractions, setAttractions] = useState([]);
  const [requests, setRequests] = useState([]);
  const [reviews, setReviews] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // tabs
  const [attractionTab, setAttractionTab] = useState("new"); // "new" | "edit"

  // selection
  const [selectedAttraction, setSelectedAttraction] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);

  // paging
  const [attractionPage, setAttractionPage] = useState(1);
  const [requestPage, setRequestPage] = useState(1);
  const [reviewPage, setReviewPage] = useState(1);

  // search
  const [attractionSearch, setAttractionSearch] = useState("");
  const [reviewSearch, setReviewSearch] = useState("");
  const [showAttractionSuggestions, setShowAttractionSuggestions] =
    useState(false);
  const [attractionStatusFilter, setAttractionStatusFilter] = useState("all");

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
        const authHeaders = token ? { Authorization: `Bearer ${token}` } : undefined;

        const [attrRes, reviewRes, reqRes] = await Promise.all([
          apiFetch(`/api/users/${userId}/attractions`, { headers: authHeaders }),
          apiFetch(`/api/users/${userId}/reviews`),
          apiFetch(`/api/users/${userId}/attraction-requests`, { headers: authHeaders }),
        ]);

        if (!attrRes.ok) throw new Error(`Failed to load attractions (${attrRes.status})`);
        if (!reviewRes.ok) throw new Error(`Failed to load reviews (${reviewRes.status})`);
        if (!reqRes.ok) throw new Error(`Failed to load requests (${reqRes.status})`);

        const attrData = await attrRes.json();
        const reviewData = await reviewRes.json();
        const reqData = await reqRes.json();

        setAttractions(Array.isArray(attrData?.attractions) ? attrData.attractions : []);
        setReviews(Array.isArray(reviewData?.reviews) ? reviewData.reviews : []);
        setRequests(Array.isArray(reqData?.requests) ? reqData.requests : []);
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

  // ---------- NEW ATTRACTIONS LIST (created + linked) ----------
  // You said: station-link submissions should appear under “New attractions”
  // So we include BOTH submission_type: created, linked
  const attractionSearchValue = normalizeText(attractionSearch);

  const newAttractionsBase = useMemo(() => {
    const rows = Array.isArray(attractions) ? attractions : [];

    // robust sort by "most recently changed"
    const score = (a) => {
      const d =
        a.link_updated_at ||
        a.link_created_at ||
        a.reviewed_at ||
        a.created_at ||
        null;
      const t = d ? new Date(d).getTime() : 0;
      return Number.isNaN(t) ? 0 : t;
    };

    return [...rows]
      .filter((a) => {
        const st = String(a.submission_type || "").toLowerCase();
        return st === "created" || st === "linked" || !st; // keep older rows too
      })
      .sort((a, b) => score(b) - score(a));
  }, [attractions]);

  const filteredNewAttractions = useMemo(() => {
    return newAttractionsBase.filter((a) => {
      const name = normalizeText(a.atrname || a.name);
      const station = normalizeText(a.stationname || a.stationName);
      const matchesText =
        !attractionSearchValue || `${name} ${station}`.includes(attractionSearchValue);
      const status = String(a.status || "").toLowerCase();
      const normalizedStatus =
        status ||
        (a.isverified === true
          ? "approved"
          : a.isverified === false
          ? "pending"
          : "");
      const matchesStatus =
        attractionStatusFilter === "all" ||
        normalizedStatus === attractionStatusFilter;
      return matchesText && matchesStatus;
    });
  }, [newAttractionsBase, attractionSearchValue, attractionStatusFilter]);

  const attractionSuggestions = useMemo(() => {
    if (!attractionSearchValue) return [];
    const uniq = new Set();
    for (const a of newAttractionsBase) {
      const n = String(a.atrname || a.name || "").trim();
      if (!n) continue;
      if (normalizeText(n).includes(attractionSearchValue)) uniq.add(n);
      if (uniq.size >= 6) break;
    }
    return Array.from(uniq);
  }, [newAttractionsBase, attractionSearchValue]);

  // ---------- REQUESTS ----------
  const requestTotalPages = Math.max(1, Math.ceil(requests.length / PAGE_SIZE));
  const pagedRequests = requests.slice((requestPage - 1) * PAGE_SIZE, requestPage * PAGE_SIZE);

  // ---------- REVIEWS ----------
  const normalizedReviewSearch = normalizeText(reviewSearch);

  const filteredReviews = useMemo(() => {
    if (!normalizedReviewSearch) return reviews;
    return reviews.filter((r) => normalizeText(r.atrname || r.attractionName).includes(normalizedReviewSearch));
  }, [reviews, normalizedReviewSearch]);

  // ---------- PAGINATION: new attractions ----------
  const attractionTotalPages = Math.max(1, Math.ceil(filteredNewAttractions.length / PAGE_SIZE));
  const pagedAttractions = filteredNewAttractions.slice(
    (attractionPage - 1) * PAGE_SIZE,
    attractionPage * PAGE_SIZE
  );

  // ---------- PAGINATION: reviews ----------
  const reviewTotalPages = Math.max(1, Math.ceil(filteredReviews.length / PAGE_SIZE));
  const pagedReviews = filteredReviews.slice((reviewPage - 1) * PAGE_SIZE, reviewPage * PAGE_SIZE);

  // keep pages in range
  useEffect(() => setAttractionPage((p) => Math.min(p, attractionTotalPages)), [attractionTotalPages]);
  useEffect(() => setRequestPage((p) => Math.min(p, requestTotalPages)), [requestTotalPages]);
  useEffect(() => setReviewPage((p) => Math.min(p, reviewTotalPages)), [reviewTotalPages]);

  // Request diff view (supports JSONB object or JSON string)
  const snapshot = useMemo(
    () => safeJson(selectedRequest?.existing_snapshot, {}),
    [selectedRequest]
  );
  const requestedChanges = useMemo(
    () => safeJson(selectedRequest?.requested_changes, {}),
    [selectedRequest]
  );
  const allDiffKeys = useMemo(() => {
    const keys = new Set([...Object.keys(snapshot || {}), ...Object.keys(requestedChanges || {})]);
    return Array.from(keys);
  }, [snapshot, requestedChanges]);

  const renderPagination = ({ currentPage, totalPages, onPageChange, label }) => {
    if (totalPages <= 1) return null;

    return (
      <div className="profile-pagination" aria-label={label}>
        <button
          type="button"
          className="profile-page-btn"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
        >
          Prev
        </button>
        <span className="profile-pagination-info">
          Page {currentPage} of {totalPages}
        </span>
        <button
          type="button"
          className="profile-page-btn"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
        >
          Next
        </button>
      </div>
    );
  };

  return (
    <main className="profilePage with-fixed-header">
      <div className="profile-container">
        <section className="profile-header-card">
          <div className="profile-avatar">
            {authUser?.username?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="profile-header-text">
            <h1>{authUser?.username || "User"}</h1>
            <p>{niceRole}</p>
          </div>
        </section>

        {loading && <p className="profile-status">Loading your activity…</p>}
        {error && !loading && <p className="profile-status profile-status--error">{error}</p>}

        {!loading && !error && (
          <div className="profile-grid">
            {/* LEFT */}
            <section className="profile-section">
              <div className="profile-section-header-row">
                <div className="profile-section-title">
                  <h2>My Submitted Attractions</h2>
                  <p className="profile-section-sub">
                    Attractions you added to the network, and any change requests you’ve made.
                  </p>

                    <div className="profile-search">
                      <div className="profile-search-field">
                        <input
                          className="profile-search-input"
                          type="search"
                        placeholder="Search attraction name"
                        value={attractionSearch}
                        onChange={(event) => {
                          setAttractionSearch(event.target.value);
                          setAttractionPage(1);
                          setSelectedAttraction(null);
                        }}
                        onFocus={() => setShowAttractionSuggestions(true)}
                        onBlur={() => setShowAttractionSuggestions(false)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && attractionSuggestions[0]) {
                            event.preventDefault();
                            setAttractionSearch(attractionSuggestions[0]);
                            setAttractionPage(1);
                            setSelectedAttraction(null);
                            setShowAttractionSuggestions(false);
                          }
                        }}
                      />

                      {showAttractionSuggestions && attractionSuggestions.length > 0 && (
                        <div className="profile-search-suggestions">
                          {attractionSuggestions.map((name) => (
                            <button
                              key={name}
                              type="button"
                              className="profile-search-suggestion"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                setAttractionSearch(name);
                                setAttractionPage(1);
                                setSelectedAttraction(null);
                                setShowAttractionSuggestions(false);
                              }}
                            >
                              {name}
                            </button>
                          ))}
                        </div>
                        )}
                      </div>
                      <select
                        className="profile-search-select"
                        value={attractionStatusFilter}
                        onChange={(event) => {
                          setAttractionStatusFilter(event.target.value);
                          setAttractionPage(1);
                          setSelectedAttraction(null);
                        }}
                        aria-label="Filter by status"
                      >
                        <option value="all">All statuses</option>
                        <option value="approved">Approved</option>
                        <option value="pending">Pending</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </div>
                </div>

                <div className="profile-toggle-pill">
                  <button
                    type="button"
                    className={
                      "profile-toggle-pill-btn" +
                      (attractionTab === "new" ? " profile-toggle-pill-btn--active" : "")
                    }
                    onClick={() => {
                      setAttractionTab("new");
                      setSelectedRequest(null);
                      setAttractionPage(1);
                    }}
                  >
                    New attractions
                  </button>

                  <button
                    type="button"
                    className={
                      "profile-toggle-pill-btn" +
                      (attractionTab === "edit" ? " profile-toggle-pill-btn--active" : "")
                    }
                    onClick={() => {
                      setAttractionTab("edit");
                      setSelectedAttraction(null);
                      setRequestPage(1);
                    }}
                  >
                    Edit / delete
                  </button>
                </div>
              </div>

              {/* TAB: New attractions */}
              {attractionTab === "new" && (
                <>
                  {filteredNewAttractions.length === 0 ? (
                    <p className="profile-empty">
                      {attractionSearchValue
                        ? "No attractions match your search."
                        : "You haven't submitted any attractions yet."}
                    </p>
                  ) : (
                    <div className="profile-table">
                      <div className="profile-table-header">
                        <span>Attraction</span>
                        <span>Station</span>
                        <span>Status</span>
                        <span>Updated</span>
                      </div>

                      {pagedAttractions.map((a, index) => {
                        // IMPORTANT: allow station-link rows to show
                        const key = `${a.atrid ?? "atr"}-${a.stationid ?? "st"}-${index}`;
                        const isActive =
                          selectedAttraction?.atrid === a.atrid &&
                          selectedAttraction?.stationid === a.stationid;

                        const updated =
                          a.link_updated_at ||
                          a.reviewed_at ||
                          a.created_at ||
                          a.link_created_at ||
                          null;

                        return (
                          <div
                            key={key}
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
                              {/* optional hint */}
                              {a.submission_type === "linked" ? (
                                <span style={{ marginLeft: 8, opacity: 0.7, fontSize: 12 }}>
                                  (linked)
                                </span>
                              ) : null}
                            </span>
                            <span>{a.stationname || a.stationName || "—"}</span>
                            <span>{renderStatusPill(a.status, a.isverified)}</span>
                            <span>{formatDate(updated)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {filteredNewAttractions.length > 0 &&
                    renderPagination({
                      currentPage: attractionPage,
                      totalPages: attractionTotalPages,
                      onPageChange: (page) => {
                        setAttractionPage(page);
                        setSelectedAttraction(null);
                      },
                      label: "Attractions pagination",
                    })}

                  {selectedAttraction && (
                    <div className="profile-detail-card">
                      <h3>{selectedAttraction.atrname}</h3>

                      <p className="profile-detail-meta">
                        {selectedAttraction.atrcategory || "—"}
                        <br />
                        Station: {selectedAttraction.stationname || "—"} ({selectedAttraction.stationid || "—"})
                        <br />
                        Status: {renderStatusPill(selectedAttraction.status, selectedAttraction.isverified)} · Last updated{" "}
                        {formatDateTime(
                          selectedAttraction.link_updated_at ||
                            selectedAttraction.reviewed_at ||
                            selectedAttraction.created_at ||
                            selectedAttraction.link_created_at
                        )}
                      </p>

                      {selectedAttraction.atraddress && (
                        <p className="profile-detail-text">{selectedAttraction.atraddress}</p>
                      )}

                      {selectedAttraction.openinghours && (
                        <p className="profile-detail-text">🕒 {selectedAttraction.openinghours}</p>
                      )}

                      <div className="profile-detail-links">
                        {selectedAttraction.atrwebsite && (
                          <a href={selectedAttraction.atrwebsite} target="_blank" rel="noreferrer">
                            🌐 Website
                          </a>
                        )}
                        {selectedAttraction.atrmaplocation && (
                          <a href={selectedAttraction.atrmaplocation} target="_blank" rel="noreferrer">
                            🗺 Open in Maps
                          </a>
                        )}
                      </div>

                      <div className="profile-detail-admin">
                        <strong>Admin remark</strong>
                        <p>
                          {selectedAttraction.admin_remark
                            ? selectedAttraction.admin_remark
                            : String(selectedAttraction.status || "").toLowerCase() === "pending"
                            ? "Awaiting admin review."
                            : "—"}
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* TAB: Edit/Delete requests */}
              {attractionTab === "edit" && (
                <>
                  {requests.length === 0 ? (
                    <p className="profile-empty">You don’t have any edit/delete requests yet.</p>
                  ) : (
                    <div className="profile-table">
                      <div className="profile-table-header">
                        <span>ID</span>
                        <span>Attraction</span>
                        <span>Type</span>
                        <span>Status</span>
                      </div>

                      {pagedRequests.map((r) => {
                        const isActive = selectedRequest?.requestid === r.requestid;
                        const statusSlug = String(r.status || "").toLowerCase().trim() || "pending";

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
                            <span className="profile-main-name">{r.atrname || `Attraction #${r.atrid}`}</span>
                            <span>{r.request_type}</span>
                            <span>
                              <span className={"status-pill status-" + statusSlug}>
                                {statusSlug}
                              </span>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {requests.length > 0 &&
                    renderPagination({
                      currentPage: requestPage,
                      totalPages: requestTotalPages,
                      onPageChange: (page) => {
                        setRequestPage(page);
                        setSelectedRequest(null);
                      },
                      label: "Requests pagination",
                    })}

                  {selectedRequest && (
                    <div className="profile-detail-card">
                      <h3>
                        Request #{selectedRequest.requestid} ·{" "}
                        {String(selectedRequest.request_type || "").toUpperCase()}
                      </h3>

                      <p className="profile-detail-meta">
                        Attraction: <strong>{selectedRequest.atrname || `#${selectedRequest.atrid}`}</strong>
                        <br />
                        Status:{" "}
                        <span className="profile-detail-status">
                          {renderStatusPill(selectedRequest.status, false)}
                        </span>
                        <br />
                        Created: {formatDateTime(selectedRequest.created_at)}
                        {selectedRequest.handled_at && (
                          <>
                            {" · "}Handled: {formatDateTime(selectedRequest.handled_at)}
                          </>
                        )}
                      </p>

                      {selectedRequest.reason && (
                        <div className="profile-detail-admin">
                          <strong>Your reason</strong>
                          <p>{selectedRequest.reason}</p>
                        </div>
                      )}

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
                                <span>{snapshot?.[key] ?? "—"}</span>
                                <span>{requestedChanges?.[key] ?? "—"}</span>
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
                            : String(selectedRequest.status || "").toLowerCase() === "pending"
                            ? "This request is waiting for admin review."
                            : "—"}
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </section>

            {/* RIGHT */}
            <section className="profile-section">
              <h2>My Reviews</h2>
              <p className="profile-section-sub">Feedback you've shared on attractions.</p>

              <div className="profile-search profile-search--reviews">
                <input
                  className="profile-search-input"
                  type="search"
                  placeholder="Search attraction name"
                  value={reviewSearch}
                  onChange={(event) => {
                    setReviewSearch(event.target.value);
                    setReviewPage(1);
                  }}
                  aria-label="Search reviews by attraction name"
                />
              </div>

              {filteredReviews.length === 0 ? (
                <p className="profile-empty">
                  {normalizedReviewSearch ? "No reviews match your search." : "You haven't written any reviews yet."}
                </p>
              ) : (
                <div className="profile-reviews">
                  {pagedReviews.map((r) => (
                    <div key={r.revid || r.id} className="profile-review-card">
                      <div className="profile-review-header">
                        <h3>{r.atrname || r.attractionName}</h3>
                        <div className="profile-review-rating">
                          {"★".repeat(Number(r.rating || 0)) || "★"}
                          <span>{Number(r.rating || 0).toFixed(1)}</span>
                        </div>
                      </div>

                      {r.comment && <p className="profile-review-comment">{r.comment}</p>}

                      <p className="profile-review-meta">
                        {r.created_at || r.createdat
                          ? new Date(r.created_at || r.createdat).toLocaleString()
                          : ""}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {filteredReviews.length > 0 &&
                renderPagination({
                  currentPage: reviewPage,
                  totalPages: reviewTotalPages,
                  onPageChange: setReviewPage,
                  label: "Reviews pagination",
                })}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

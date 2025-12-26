import React, { useEffect, useState } from "react";
import "../admin/AdminPage.css"; // reuse same background + card styles

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [filterRole, setFilterRole] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // NEW: pending role change for the modal
  const [confirmData, setConfirmData] = useState(null);
  // shape: { userId, username, newRole, currentRole }

  const token = localStorage.getItem("authToken");
  const authUserRaw = localStorage.getItem("authUser");
  const authUser = authUserRaw ? JSON.parse(authUserRaw) : null;
  const myUserId = authUser?.id;

  useEffect(() => {
    async function loadUsers() {
      try {
        if (!token) {
          setError("Missing auth token.");
          setLoading(false);
          return;
        }

        setLoading(true);
        setError("");

        const res = await fetch("/api/admin/users", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          let msg = "Failed to load users.";
          try {
            const data = await res.json();
            if (data?.message) msg = data.message;
          } catch {}
          throw new Error(msg);
        }

        const data = await res.json();
        setUsers(data.users || []);
      } catch (err) {
        console.error("Admin users load error:", err);
        setError(err.message || "Failed to load users.");
      } finally {
        setLoading(false);
      }
    }

    loadUsers();
  }, [token]);

  async function handleRoleChange(userId, newRole) {
    if (!token) return;

    const prevUsers = [...users];
    // optimistic update
    setUsers((list) =>
      list.map((u) =>
        u.userid === userId ? { ...u, role: newRole } : u
      )
    );

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (!res.ok) {
        let msg = "Failed to update user.";
        try {
          const data = await res.json();
          if (data?.message) msg = data.message;
        } catch {}
        throw new Error(msg);
      }
      // success, nothing else to do
    } catch (err) {
      console.error("Update user role error:", err);
      setError(err.message || "Failed to update user.");
      // revert
      setUsers(prevUsers);
    }
  }

  // NEW: open modal with selected change
  function requestRoleChange(user, newRole) {
    if (newRole === user.role) return; // no change
    setConfirmData({
      userId: user.userid,
      username: user.username,
      newRole,
      currentRole: user.role,
    });
  }

  // NEW: when user confirms in the modal
  function confirmRoleChange() {
    if (!confirmData) return;
    handleRoleChange(confirmData.userId, confirmData.newRole);
    setConfirmData(null);
  }

const filteredUsers = users
    .filter((u) => {
      // Filter by role
      const roleMatch = filterRole === "all" || u.role === filterRole;
      // Filter by username (case-insensitive)
      const nameMatch = searchQuery === "" || 
        u.username.toLowerCase().includes(searchQuery.toLowerCase());
      return roleMatch && nameMatch;
    });

    const ROLE_LABELS = {
        commuter: "Commuter",
        admin: "Admin",
        banned: "Banned",
    };

  return (
    <main className="profilePage with-fixed-header">
      <div className="profile-container">
        {/* Header card reused as a simple title banner */}
        <section className="profile-header-card admin-header-card">
          <div className="profile-header-text">
            <h1>Review Users</h1>
            <p>Manage commuters and administrators in the system.</p>
          </div>
        </section>

        {loading && (
          <p className="profile-status">Loading users…</p>
        )}
        {error && !loading && (
          <p className="profile-status profile-status--error">
            {error}
          </p>
        )}

        {!loading && !error && (
          <section className="profile-section admin-users-section">
<div className="admin-users-toolbar">
              <h2>User Accounts</h2>

              <div className="admin-users-search">
                <input
                  type="text"
                  placeholder="Search by username..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="admin-search-input"
                />
              </div>

              <div className="admin-users-filters">
                <button
                  type="button"
                  className={
                    filterRole === "all"
                      ? "admin-chip admin-chip--active"
                      : "admin-chip"
                  }
                  onClick={() => setFilterRole("all")}
                >
                  All
                </button>
                <button
                  type="button"
                  className={
                    filterRole === "commuter"
                      ? "admin-chip admin-chip--active"
                      : "admin-chip"
                  }
                  onClick={() => setFilterRole("commuter")}
                >
                  Commuters
                </button>
                <button
                  type="button"
                  className={
                    filterRole === "admin"
                      ? "admin-chip admin-chip--active"
                      : "admin-chip"
                  }
                  onClick={() => setFilterRole("admin")}
                >
                  Admins
                </button>
              </div>
            </div>

            {filteredUsers.length === 0 ? (
              <p className="profile-empty">
                No users match this filter.
              </p>
            ) : (
              <div className="profile-table admin-users-table">
                <div className="profile-table-header">
                  <span>ID</span>
                  <span>Username</span>
                  <span>Role</span>
                  <span>Attractions</span>
                  <span>Reviews</span>
                </div>

                {filteredUsers.map((u) => (
                  <div
                    key={u.userid}
                    className="profile-table-row"
                  >
                    <span>#{u.userid}</span>
                    <span className="profile-main-name">
                      {u.username}
                      {u.userid === myUserId && (
                        <span className="admin-tag">
                          you
                        </span>
                      )}
                    </span>
                    <span>
                      <select
                        value={u.role}
                        onChange={(e) => requestRoleChange(u, e.target.value)}
                        className="admin-role-select"
                        disabled={u.userid === myUserId}
                      >
                        <option value="commuter">Commuter</option>
                        <option value="admin">Admin</option>
                        <option value="banned">Banned</option>
                      </select>
                    </span>
                    <span>{u.attractions_count}</span>
                    <span>{u.reviews_count}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* NEW: Confirmation modal */}
        {confirmData && (
          <div className="admin-modal-backdrop">
            <div className="admin-modal">
              <h3>Change user role?</h3>
              <p>
                Are you sure you want to change{" "}
                <strong>{confirmData.username}</strong>&apos;s from{" "}
                <strong>{ROLE_LABELS[confirmData.currentRole]}</strong> to{" "}
                <strong>{ROLE_LABELS[confirmData.newRole]}</strong>?
              </p>

              <div className="admin-modal-actions">
                <button
                  type="button"
                  className="admin-modal-btn admin-modal-btn-secondary"
                  onClick={() => setConfirmData(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="admin-modal-btn admin-modal-btn-primary"
                  onClick={confirmRoleChange}
                >
                  Yes, change role
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

import React, { useState } from "react";
import "./UserPage.css";
import { NavLink, useNavigate } from "react-router-dom";
import { FaUserCircle } from "react-icons/fa";

function Header() {
  const navigate = useNavigate();

  // read user from localStorage (set during login)
  const storedUser = localStorage.getItem("authUser");
  const authUser = storedUser ? JSON.parse(storedUser) : null;

  const username = authUser?.username || "User";
  const role = authUser?.role || "commuter";
  const isAdmin = role === "admin";

  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
    // let App.jsx know auth changed (so it hides header etc.)
    window.dispatchEvent(new Event("auth-changed"));
    navigate("/login");
  };

  const toggleDropdown = () => setOpen((o) => !o);

  const goToProfile = () => {
    setOpen(false);
    navigate("/profile");
  };

  return (
    <header className="header">
      <NavLink to="/" className="logo">
        ALo
      </NavLink>

      <div className="header-right">
        <nav className="navbar">
          {/* Always show Exploration */}
          <NavLink
            to="/"
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
          >
            Exploration
          </NavLink>

          {/* Commuter menu */}
          {!isAdmin && (
            <>
              <NavLink
                to="/insight-board"
                className={({ isActive }) =>
                  isActive ? "nav-link active" : "nav-link"
                }
              >
                Insight Board
              </NavLink>
              <NavLink
                to="/ktm-dashboard"
                className={({ isActive }) =>
                  isActive ? "nav-link active" : "nav-link"
                }
              >
                KTM Dashboard
              </NavLink>
            </>
          )}

          {/* Admin menu */}
          {isAdmin && (
            <>
              <NavLink
                to="/admin/users"
                className={({ isActive }) =>
                  isActive ? "nav-link active" : "nav-link"
                }
              >
                Review Users
              </NavLink>
              <NavLink
                to="/admin"
                end   // only active on EXACT "/admin"
                className={({ isActive }) =>
                  isActive ? "nav-link active" : "nav-link"
                }
              >
                Review Attractions
              </NavLink>
            </>
          )}
        </nav>

        {/* Profile icon + dropdown */}
        <div className="profile-wrapper">
          <button
            type="button"
            className="profile-btn"
            onClick={toggleDropdown}
            aria-label="Open profile menu"
          >
            <FaUserCircle className="profile-icon" />
          </button>

          {open && (
            <div className="profile-dropdown">
              <div className="profile-greeting">
                Hi, <strong>{username}</strong>
                <br />
                {isAdmin ? "Administrator" : "Commuter"}
              </div>

              <button className="profile-item" onClick={goToProfile}>
                Profile
              </button>

              <button
                className="profile-item profile-item-danger"
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
export default Header;
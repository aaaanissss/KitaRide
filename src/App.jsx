import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import { apiFetch } from "./lib/api";
import LoginRegisterForm from "./Components/authentication/LoginRegisterForm.jsx";
import HomePage from "./Components/userpage/HomePage";
import InsightBoard from "./Components/userpage/InsightBoard.jsx";
import KtmDashboard from "./Components/userpage/KtmDashboard";
import PowerBIDashboard from "./Components/userpage/PowerBIDashboard.jsx";
import Header from "./Components/userpage/Header";
import ProfilePage from "./Components/userpage/ProfilePage";
import AdminAttractionsPage from "./Components/admin/AdminAttractionsPage.jsx";
import AdminUsersPage from "./Components/admin/AdminUsersPage.jsx";

// Guard for protected routes
function ProtectedRoute({ children, token }) {
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function AdminRoute({ children, token }) {
  const storedUser = localStorage.getItem("authUser");
  const user = storedUser ? JSON.parse(storedUser) : null;

  if (!token) return <Navigate to="/login" replace />;
  if (user?.role !== "admin") return <Navigate to="/" replace />; // block commuters

  return children;
}

function CommuterRoute({ children, token }) {
  const storedUser = localStorage.getItem("authUser");
  const user = storedUser ? JSON.parse(storedUser) : null;

  if (!token) return <Navigate to="/login" replace />;
  if (user?.role === "admin") return <Navigate to="/admin" replace />;

  return children;
}

function App() {
  // 🔑 keep token in React state so UI updates when it changes
  const [token, setToken] = useState(() => localStorage.getItem("authToken"));
  const [isApiWarm, setIsApiWarm] = useState(false);

  useEffect(() => {
    let isActive = true;

    const warmApi = async () => {
      try {
        const res = await apiFetch("/api/health");
        if (res.ok && isActive) {
          setIsApiWarm(true);
        }
      } catch {
        // ignore warm-up failures
      }
    };

    warmApi();
    const intervalId = window.setInterval(warmApi, 12 * 60 * 1000);

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
    };
  }, []);

  // listen for custom "auth-changed" events and update token from localStorage
  useEffect(() => {
    const handleAuthChanged = () => {
      setToken(localStorage.getItem("authToken"));
    };

    window.addEventListener("auth-changed", handleAuthChanged);
    return () => window.removeEventListener("auth-changed", handleAuthChanged);
  }, []);

  return (
    <Router>
      <div>
        {/* Show header only when logged in */}
        {token && <Header />}

        <Routes>
          {/* Login: if already logged in, send to home */}
          <Route
            path="/login"
            element={
              token ? <Navigate to="/" replace /> : <LoginRegisterForm isApiWarm={isApiWarm} />
            }
          />

          {/* Protected pages */}
          <Route
            path="/"
            element={
              <ProtectedRoute token={token}>
                <HomePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute token={token}>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <AdminRoute token={token}>
                <AdminAttractionsPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <AdminRoute token={token}>
                <AdminUsersPage />
              </AdminRoute>
            }
          />
          <Route
            path="/insight-board"
            element={
              <ProtectedRoute token={token}>
                <InsightBoard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/ktm-dashboard"
            element={
              <ProtectedRoute token={token}>
                <KtmDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/powerbi-dashboard"
            element={
              <CommuterRoute token={token}>
                <PowerBIDashboard />
              </CommuterRoute>
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

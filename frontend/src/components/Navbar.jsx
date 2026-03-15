import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useToast } from "./Toast.jsx";

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const [loggingOut, setLoggingOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const username = localStorage.getItem("lf_username") || "User";

  async function handleLogout() {
    setLoggingOut(true);
    try { await api.logout(); } catch {}
    localStorage.removeItem("lf_token");
    localStorage.removeItem("lf_username");
    navigate("/login");
  }

  const navLinks = [
    { to: "/", label: "Dashboard" },
    { to: "/products", label: "Products" },
    { to: "/print", label: "Quick Print" },
    { to: "/settings", label: "Settings" },
  ];

  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link to="/" className="nav-brand">
          <span className="nav-logo">LF</span>
          <span className="nav-brand-name">LabelFlow</span>
        </Link>

        <div className="nav-links">
          {navLinks.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={`nav-link${location.pathname === to ? " active" : ""}`}
            >
              {label}
            </Link>
          ))}
        </div>

        <div className="nav-right">
          <span className="nav-username">{username}</span>
          <button className="nav-logout" onClick={handleLogout} disabled={loggingOut}>
            {loggingOut ? "…" : "Log out"}
          </button>
        </div>

        <button className="nav-menu-btn" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
          {menuOpen ? "✕" : "☰"}
        </button>
      </div>

      {menuOpen && (
        <div className="nav-mobile-menu">
          {navLinks.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={`nav-mobile-link${location.pathname === to ? " active" : ""}`}
              onClick={() => setMenuOpen(false)}
            >
              {label}
            </Link>
          ))}
          <button className="nav-mobile-logout" onClick={handleLogout}>
            Log out ({username})
          </button>
        </div>
      )}
    </nav>
  );
}

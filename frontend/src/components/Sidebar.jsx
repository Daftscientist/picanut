import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { api } from "../api.js";
import { useToast } from "./Toast.jsx";

const CanopyLogo = () => (
  <svg width="26" height="22" viewBox="0 0 36 30" fill="none">
    <path d="M2 28 C2 14 8 4 18 4 C28 4 34 14 34 28" stroke="rgba(255,255,255,.85)" strokeWidth="2.2" strokeLinecap="round"/>
    <path d="M10 28 C10 20 13 15 18 15 C23 15 26 20 26 28" stroke="rgba(255,255,255,.85)" strokeWidth="2" strokeLinecap="round"/>
    <line x1="18" y1="4" x2="18" y2="15" stroke="rgba(255,255,255,.85)" strokeWidth="1.6" strokeLinecap="round"/>
    <line x1="13.5" y1="5.2" x2="12.2" y2="14.8" stroke="rgba(255,255,255,.6)" strokeWidth="1.4" strokeLinecap="round"/>
    <line x1="22.5" y1="5.2" x2="23.8" y2="14.8" stroke="rgba(255,255,255,.6)" strokeWidth="1.4" strokeLinecap="round"/>
    <line x1="9.5" y1="8.5" x2="7.2" y2="16.5" stroke="rgba(255,255,255,.4)" strokeWidth="1.2" strokeLinecap="round"/>
    <line x1="26.5" y1="8.5" x2="28.8" y2="16.5" stroke="rgba(255,255,255,.4)" strokeWidth="1.2" strokeLinecap="round"/>
    <line x1="18" y1="15" x2="18" y2="28" stroke="rgba(255,255,255,.85)" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);

// Icons
const icons = {
  dashboard: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  ),
  products: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    </svg>
  ),
  queue: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  ),
  orders: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  ),
  designer: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
    </svg>
  ),
  templates: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
      <line x1="3" y1="9" x2="21" y2="9"/>
      <line x1="9" y1="21" x2="9" y2="9"/>
    </svg>
  ),
  agents: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
      <line x1="8" y1="21" x2="16" y2="21"/>
      <line x1="12" y1="17" x2="12" y2="21"/>
    </svg>
  ),
  team: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  settings: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  billing: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
      <line x1="1" y1="10" x2="23" y2="10"/>
    </svg>
  ),
  admin: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  sun: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  ),
  moon: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  ),
};

function getTheme() {
  return localStorage.getItem("lf_theme") || "light";
}

function setTheme(theme) {
  localStorage.setItem("lf_theme", theme);
  document.documentElement.setAttribute("data-theme", theme);
}

export default function Sidebar({ pendingCount = 0 }) {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [theme, setThemeState] = useState(getTheme);
  const [open, setOpen] = useState(false);

  const username = localStorage.getItem("lf_username") || "User";
  const role = localStorage.getItem("lf_role") || "subuser";
  const isPlatformAdmin = localStorage.getItem("lf_is_platform_admin") === "true";
  const isManager = role === "manager" || isPlatformAdmin;

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  function toggleTheme() {
    const next = theme === "light" ? "dark" : "light";
    setThemeState(next);
    setTheme(next);
  }

  async function handleLogout() {
    try { await api.logout(); } catch {}
    localStorage.removeItem("lf_token");
    localStorage.removeItem("lf_username");
    localStorage.removeItem("lf_role");
    localStorage.removeItem("lf_is_platform_admin");
    localStorage.removeItem("lf_org_id");
    navigate("/login");
  }

  function navTo(path) {
    navigate(path);
    setOpen(false);
  }

  function NavItem({ path, label, icon, badge }) {
    const active = location.pathname === path || (path !== "/" && location.pathname.startsWith(path));
    return (
      <button className={`si${active ? " active" : ""}`} onClick={() => navTo(path)}>
        {icon}
        <span style={{ flex: 1 }}>{label}</span>
        {badge ? <span className="s-pill">{badge}</span> : null}
      </button>
    );
  }

  const sidebar = (
    <aside className={`sidebar${open ? " open" : ""}`}>
      <div className="s-head">
        <CanopyLogo />
        <span className="logo-text">Canopy BMS</span>
      </div>

      <nav className="s-nav">
        <div className="s-sec">Workspace</div>
        <NavItem path="/" label="Dashboard" icon={icons.dashboard} />
        <NavItem path="/products" label="Products" icon={icons.products} />
        <NavItem path="/queue" label="Print Queue" icon={icons.queue} badge={pendingCount > 0 ? pendingCount : null} />
        <NavItem path="/orders" label="Orders" icon={icons.orders} />

        <div className="s-sec">Design</div>
        <NavItem path="/print" label="Label Designer" icon={icons.designer} />
        <NavItem path="/templates" label="Templates" icon={icons.templates} />

        <div className="s-sec">Manage</div>
        <NavItem path="/agents" label="Print Agents" icon={icons.agents} />
        {isManager && <NavItem path="/team" label="Team" icon={icons.team} />}
        <NavItem path="/settings" label="Settings" icon={icons.settings} />

        {isManager && (
          <>
            <div className="s-sec">Account</div>
            <NavItem path="/billing" label="Billing" icon={icons.billing} />
          </>
        )}

        {isPlatformAdmin && (
          <>
            <div className="s-sec">Platform</div>
            <NavItem path="/admin" label="Admin Panel" icon={icons.admin} />
          </>
        )}
      </nav>

      <div className="s-foot">
        <div className="u-row">
          <div className="av" style={{
            background: `linear-gradient(135deg, hsl(${(username.charCodeAt(0) * 13) % 360}, 65%, 45%) 0%, hsl(${(username.charCodeAt(0) * 13 + 40) % 360}, 65%, 35%) 100%)`,
          }}>{username.charAt(0).toUpperCase()}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="u-name">{username}</div>
            <div className="u-role">{role}</div>
          </div>
          <button className="th-btn" onClick={toggleTheme} title="Toggle theme">
            {theme === "light" ? icons.moon : icons.sun}
          </button>
          <button className="th-btn" onClick={handleLogout} title="Log out" style={{ marginLeft: 2 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      {/* Mobile hamburger — lives in topbar via CSS */}
      <button
        className="ham"
        onClick={() => setOpen(!open)}
        aria-label="Menu"
        style={{ position: "fixed", top: 12, left: 12, zIndex: 300 }}
      >
        {open ? "✕" : "☰"}
      </button>

      {open && (
        <div
          className="sidebar-overlay"
          onClick={() => setOpen(false)}
          style={{ zIndex: 200 }}
        />
      )}

      {sidebar}
    </>
  );
}

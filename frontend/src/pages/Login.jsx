import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api, getToken } from "../api.js";
import { useToast } from "../components/Toast.jsx";

const CanopyLogo = () => (
  <svg width="40" height="34" viewBox="0 0 36 30" fill="none">
    <path d="M2 28 C2 14 8 4 18 4 C28 4 34 14 34 28" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round"/>
    <path d="M10 28 C10 20 13 15 18 15 C23 15 26 20 26 28" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round"/>
    <line x1="18" y1="4" x2="18" y2="15" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round"/>
    <line x1="13.5" y1="5.2" x2="12.2" y2="14.8" stroke="var(--accent2)" strokeWidth="1.4" strokeLinecap="round"/>
    <line x1="22.5" y1="5.2" x2="23.8" y2="14.8" stroke="var(--accent2)" strokeWidth="1.4" strokeLinecap="round"/>
    <line x1="9.5" y1="8.5" x2="7.2" y2="16.5" stroke="var(--accent-bg)" strokeWidth="1.2" strokeLinecap="round"/>
    <line x1="26.5" y1="8.5" x2="28.8" y2="16.5" stroke="var(--accent-bg)" strokeWidth="1.2" strokeLinecap="round"/>
    <line x1="18" y1="15" x2="18" y2="28" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);

export default function Login() {
  const navigate = useNavigate();
  const toast = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem("lf_theme") || "light");

  useEffect(() => {
    if (getToken()) navigate("/", { replace: true });
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  function toggleTheme() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("lf_theme", next);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!username || !password) {
      toast.error("Please enter username and password");
      return;
    }
    setLoading(true);
    try {
      const data = await api.login(username.trim(), password);
      localStorage.setItem("lf_token", data.token);
      localStorage.setItem("lf_username", data.username);
      localStorage.setItem("lf_role", data.role || "subuser");
      localStorage.setItem("lf_is_platform_admin", data.is_platform_admin ? "true" : "false");
      if (data.org_id) localStorage.setItem("lf_org_id", data.org_id);
      navigate("/", { replace: true });
    } catch (err) {
      toast.error(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--bg)",
      padding: 20,
    }}>
      <div style={{ position: "absolute", top: 16, right: 16 }}>
        <button
          onClick={toggleTheme}
          style={{ background: "none", border: "1px solid var(--border2)", borderRadius: "var(--rs)", padding: "6px 10px", cursor: "pointer", color: "var(--text2)", fontSize: 12 }}
        >
          {theme === "light" ? "🌙 Dark" : "☀ Light"}
        </button>
      </div>

      <div className="card" style={{ width: "100%", maxWidth: 400, padding: "40px 36px" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
            <CanopyLogo />
          </div>
          <h1 style={{ fontSize: "1.625rem", fontWeight: 700, marginBottom: 6, letterSpacing: "-0.02em" }}>
            Canopy BMS
          </h1>
          <p style={{ color: "var(--text2)", fontSize: "0.9375rem" }}>Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="fg">
            <label className="fl" htmlFor="username">Username</label>
            <input
              id="username"
              className="fi"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              autoComplete="username"
              autoFocus
              disabled={loading}
            />
          </div>

          <div className="fg">
            <label className="fl" htmlFor="password">Password</label>
            <input
              id="password"
              className="fi"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              disabled={loading}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <span style={{ fontSize: 12, color: "var(--accent)", cursor: "pointer" }}>Forgot password?</span>
          </div>

          <button
            type="submit"
            className="btn bp btn-lg w-full"
            disabled={loading}
            style={{ marginTop: 4 }}
          >
            {loading ? <span className="spinner" /> : "Sign in"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "var(--text2)" }}>
          Don't have an account?{" "}
          <Link to="/signup" style={{ color: "var(--accent)", fontWeight: 600 }}>Sign up</Link>
        </p>
      </div>
    </div>
  );
}

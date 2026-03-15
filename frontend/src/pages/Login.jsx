import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api, getToken } from "../api.js";
import { useToast } from "../components/Toast.jsx";

export default function Login() {
  const navigate = useNavigate();
  const toast = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getToken()) navigate("/", { replace: true });
  }, []);

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
      navigate("/", { replace: true });
    } catch (err) {
      toast.error(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logo}>LF</div>
          <h1 style={styles.title}>LabelFlow</h1>
          <p style={styles.subtitle}>Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              autoComplete="username"
              autoFocus
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg w-full"
            disabled={loading}
            style={{ marginTop: 8 }}
          >
            {loading ? <span className="spinner" /> : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "var(--bg-secondary)",
    padding: 20,
  },
  card: {
    background: "var(--bg)",
    borderRadius: "var(--radius-lg)",
    padding: "40px 36px",
    width: "100%",
    maxWidth: 400,
    boxShadow: "var(--shadow-lg)",
    border: "1px solid var(--border)",
  },
  header: {
    textAlign: "center",
    marginBottom: 32,
  },
  logo: {
    background: "var(--accent)",
    color: "white",
    width: 52,
    height: 52,
    borderRadius: "var(--radius-md)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    fontSize: "1.125rem",
    letterSpacing: "0.05em",
    marginBottom: 14,
  },
  title: {
    fontSize: "1.75rem",
    fontWeight: 800,
    marginBottom: 6,
    letterSpacing: "-0.02em",
  },
  subtitle: {
    color: "var(--text-muted)",
    fontSize: "0.9375rem",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },
};

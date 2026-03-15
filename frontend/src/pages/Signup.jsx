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
    <line x1="18" y1="15" x2="18" y2="28" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);

export default function Signup() {
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState({
    company_name: "",
    username: "",
    password: "",
    confirm_password: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getToken()) navigate("/", { replace: true });
  }, []);

  function validate() {
    const e = {};
    if (!form.company_name.trim()) e.company_name = "Company name is required";
    if (!form.username.trim()) e.username = "Username is required";
    if (!form.password) e.password = "Password is required";
    else if (form.password.length < 8) e.password = "Password must be at least 8 characters";
    if (form.password !== form.confirm_password) e.confirm_password = "Passwords do not match";
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const data = await api.signup({
        company_name: form.company_name.trim(),
        username: form.username.trim(),
        password: form.password,
      });
      localStorage.setItem("lf_token", data.token);
      localStorage.setItem("lf_username", data.username);
      localStorage.setItem("lf_role", data.role || "manager");
      localStorage.setItem("lf_is_platform_admin", data.is_platform_admin ? "true" : "false");
      if (data.org_id) localStorage.setItem("lf_org_id", data.org_id);
      navigate("/billing", { replace: true });
    } catch (err) {
      toast.error(err.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  function field(key, label, type = "text", placeholder = "") {
    return (
      <div className="fg">
        <label className="fl" htmlFor={key}>{label}</label>
        <input
          id={key}
          className="fi"
          type={type}
          value={form[key]}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          placeholder={placeholder}
          disabled={loading}
          autoComplete={type === "password" ? "new-password" : key}
        />
        {errors[key] && (
          <span style={{ fontSize: 11, color: "var(--danger)", marginTop: 2 }}>{errors[key]}</span>
        )}
      </div>
    );
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
      <div className="card" style={{ width: "100%", maxWidth: 420, padding: "40px 36px" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
            <CanopyLogo />
          </div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: 6, letterSpacing: "-0.02em" }}>
            Create your account
          </h1>
          <p style={{ color: "var(--text2)", fontSize: "0.875rem" }}>
            30-day free trial — no credit card required
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {field("company_name", "Company name", "text", "Acme Ltd")}
          {field("username", "Username", "text", "your_username")}
          {field("password", "Password", "password", "Min 8 characters")}
          {field("confirm_password", "Confirm password", "password", "Repeat password")}

          <button
            type="submit"
            className="btn bp btn-lg w-full"
            disabled={loading}
            style={{ marginTop: 8 }}
          >
            {loading ? <span className="spinner" /> : "Create account"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "var(--text2)" }}>
          Already have an account?{" "}
          <Link to="/login" style={{ color: "var(--accent)", fontWeight: 600 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}

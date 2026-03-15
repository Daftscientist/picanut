import React, { useState, useEffect, useCallback } from "react";
import { api } from "../api.js";
import { useToast } from "../components/Toast.jsx";

export default function Team() {
  const toast = useToast();
  const role = localStorage.getItem("lf_role") || "subuser";
  const isManager = role === "manager" || localStorage.getItem("lf_is_platform_admin") === "true";

  const [users, setUsers] = useState([]);
  const [billing, setBilling] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ username: "", password: "", role: "subuser" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [u, b] = await Promise.all([
        api.listUsers(),
        api.billingStatus(),
      ]);
      setUsers(u);
      setBilling(b);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.username || !form.password) { toast.error("Username and password required"); return; }
    setSaving(true);
    try {
      await api.createUser(form);
      toast.success("User created");
      setForm({ username: "", password: "", role: "subuser" });
      setShowAdd(false);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  const subuserCount = users.filter((u) => u.role === "subuser").length;
  const subuserLimit = billing?.usage?.subusers?.limit || 0;

  if (loading) {
    return (
      <div className="page" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
        <span className="spinner dark" style={{ width: 28, height: 28 }} />
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Team</h1>
          <p className="text-secondary text-sm mt-1">{users.length} member{users.length !== 1 ? "s" : ""}</p>
        </div>
        {isManager && (
          <button className="btn bp" onClick={() => setShowAdd(true)}>+ Add Member</button>
        )}
      </div>

      {/* Usage bar */}
      {billing && subuserLimit > 0 && (
        <div className="card section" style={{ marginBottom: 20 }}>
          <div className="ct">
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Sub-users</span>
              <span style={{ fontSize: 12, color: "var(--text2)" }}>{subuserCount} / {subuserLimit}</span>
            </div>
            <div className="prog">
              <div
                className="pf2"
                style={{
                  width: `${Math.min(100, (subuserCount / subuserLimit) * 100)}%`,
                  background: subuserCount >= subuserLimit ? "var(--danger)" : subuserCount / subuserLimit > 0.8 ? "var(--warn)" : "var(--accent)",
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Add user modal */}
      {showAdd && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowAdd(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2>Add Team Member</h2>
              <button className="btn bg btn-icon" onClick={() => setShowAdd(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="fg">
                <label className="fl">Username</label>
                <input className="fi" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="new_user" autoFocus autoComplete="off" />
              </div>
              <div className="fg">
                <label className="fl">Password (min 6 chars)</label>
                <input className="fi" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" autoComplete="new-password" />
              </div>
              <div className="fg">
                <label className="fl">Role</label>
                <select className="fi-sel" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  <option value="subuser">Sub-user</option>
                  <option value="manager">Manager</option>
                </select>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn bg" onClick={() => setShowAdd(false)}>Cancel</button>
                <button type="submit" className="btn bp" disabled={saving}>
                  {saving ? <span className="spinner" /> : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="tw">
        <table>
          <thead>
            <tr>
              <th>Username</th>
              <th>Role</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--accent-bg)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 11, color: "var(--accent-fg)", flexShrink: 0 }}>
                      {u.username.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontWeight: 600 }}>{u.username}</span>
                  </div>
                </td>
                <td>
                  <span className={`b ${u.role === "manager" ? "bg2" : "bx"}`}>
                    {u.role}
                  </span>
                </td>
                <td className="text-muted text-sm">{new Date(u.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

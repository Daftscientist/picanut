import React, { useState, useEffect } from "react";
import { api } from "../api.js";
import { useToast } from "../components/Toast.jsx";

export default function Settings() {
  const toast = useToast();
  const [tags, setTags] = useState([]);
  const [newTag, setNewTag] = useState({ name: "", colour: "#E8470A" });
  const [editTag, setEditTag] = useState(null);
  const [savingTag, setSavingTag] = useState(false);
  const [revokingAll, setRevokingAll] = useState(false);

  // WooCommerce webhook: uses default agent token
  const [defaultAgentToken, setDefaultAgentToken] = useState("");
  const webhookUrl = defaultAgentToken
    ? `${window.location.origin}/api/webhooks/woocommerce?token=${defaultAgentToken}`
    : `${window.location.origin}/api/webhooks/woocommerce?token=…`;

  useEffect(() => {
    loadTags();
    loadDefaultAgent();
  }, []);

  async function loadDefaultAgent() {
    try {
      const res = await api.agentStatus();
      const agents = res.agents || [];
      const def = agents.find((a) => a.is_default) || agents[0];
      if (def?.token) setDefaultAgentToken(def.token);
    } catch {}
  }

  async function loadTags() {
    try { setTags(await api.getTags()); } catch {}
  }

  async function handleCreateTag(e) {
    e.preventDefault();
    if (!newTag.name.trim()) { toast.error("Tag name required"); return; }
    setSavingTag(true);
    try {
      await api.createTag(newTag);
      toast.success("Tag created");
      setNewTag({ name: "", colour: "#E8470A" });
      loadTags();
    } catch (err) { toast.error(err.message); }
    finally { setSavingTag(false); }
  }

  async function handleSaveTag(e) {
    e.preventDefault();
    if (!editTag) return;
    setSavingTag(true);
    try {
      await api.updateTag(editTag.id, editTag);
      toast.success("Tag updated");
      setEditTag(null);
      loadTags();
    } catch (err) { toast.error(err.message); }
    finally { setSavingTag(false); }
  }

  async function handleDeleteTag(tag) {
    if (!confirm(`Delete tag "${tag.name}"?`)) return;
    try { await api.deleteTag(tag.id); toast.success("Tag deleted"); loadTags(); }
    catch (err) { toast.error(err.message); }
  }

  async function handleRevokeAll() {
    if (!confirm("This will log you out of all sessions. Continue?")) return;
    setRevokingAll(true);
    try {
      await api.revokeSessions();
      toast.success("All sessions revoked. Logging out…");
      setTimeout(() => {
        localStorage.clear();
        window.location.href = "/login";
      }, 1500);
    } catch (err) { toast.error(err.message); setRevokingAll(false); }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Settings</h1>
      </div>

      {/* WooCommerce Webhook */}
      <div className="card section" style={{ marginBottom: 24 }}>
        <div className="ch"><h2>WooCommerce Integration</h2></div>
        <div className="ct">
          <p className="text-secondary" style={{ marginBottom: 14, fontSize: 13 }}>
            Add this URL as a WooCommerce webhook (order.created) to import orders automatically.
            The token comes from your default print agent — manage agents in{" "}
            <a href="/agents" style={{ color: "var(--accent)" }}>Print Agents</a>.
          </p>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div className="token" style={{ flex: 1 }}>{webhookUrl}</div>
            <button className="btn bg btn-sm" onClick={() => { navigator.clipboard.writeText(webhookUrl); toast.success("Copied"); }}>
              Copy
            </button>
          </div>
        </div>
      </div>

      {/* Tags */}
      <div className="card section" style={{ marginBottom: 24 }}>
        <div className="ch"><h2>Tags</h2></div>
        <div className="ct">
          {tags.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
              {tags.map((tag) => (
                <div key={tag.id}>
                  {editTag?.id === tag.id ? (
                    <form onSubmit={handleSaveTag} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                      <input className="fi" value={editTag.name} onChange={(e) => setEditTag({ ...editTag, name: e.target.value })} style={{ flex: 1 }} autoFocus />
                      <input type="color" value={editTag.colour} onChange={(e) => setEditTag({ ...editTag, colour: e.target.value })} style={{ width: 50, padding: 2, height: 36, borderRadius: "var(--rs)", border: "1px solid var(--border2)" }} />
                      <button type="submit" className="btn bp btn-sm" disabled={savingTag}>{savingTag ? <span className="spinner" /> : "Save"}</button>
                      <button type="button" className="btn bg btn-sm" onClick={() => setEditTag(null)}>Cancel</button>
                    </form>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                      <span className="tag" style={{ background: tag.colour, minWidth: 80 }}>{tag.name}</span>
                      <code style={{ fontSize: 11, color: "var(--text3)", fontFamily: "var(--mono)" }}>{tag.colour}</code>
                      <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                        <button className="btn bg btn-sm" onClick={() => setEditTag({ ...tag })}>Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDeleteTag(tag)}>Delete</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          <form onSubmit={handleCreateTag} style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
            <div className="fg" style={{ flex: 1, marginBottom: 0 }}>
              <label className="fl">New Tag Name</label>
              <input className="fi" value={newTag.name} onChange={(e) => setNewTag({ ...newTag, name: e.target.value })} placeholder="e.g. Organic" />
            </div>
            <div className="fg" style={{ marginBottom: 0 }}>
              <label className="fl">Colour</label>
              <input type="color" value={newTag.colour} onChange={(e) => setNewTag({ ...newTag, colour: e.target.value })} style={{ width: 80, padding: 3, height: 36, cursor: "pointer", borderRadius: "var(--rs)", border: "1px solid var(--border2)" }} />
            </div>
            <button type="submit" className="btn bp" disabled={savingTag} style={{ flexShrink: 0 }}>
              {savingTag ? <span className="spinner" /> : "Add Tag"}
            </button>
          </form>
        </div>
      </div>

      {/* Sessions */}
      <div className="card section">
        <div className="ch"><h2>Session Management</h2></div>
        <div className="ct">
          <p className="text-secondary" style={{ marginBottom: 16, fontSize: 13 }}>
            Revoke all active sessions across all devices. You will be logged out immediately.
          </p>
          <button className="btn btn-danger" onClick={handleRevokeAll} disabled={revokingAll}>
            {revokingAll ? <span className="spinner" /> : "Revoke All Sessions"}
          </button>
        </div>
      </div>
    </div>
  );
}

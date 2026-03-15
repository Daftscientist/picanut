import React, { useState, useEffect } from "react";
import { api } from "../api.js";
import { useToast } from "../components/Toast.jsx";
import {
  getSelectedPrinter, setSelectedPrinter,
  checkAgentRunning, listPrinters,
  printBytes,
} from "../printer.js";

export default function Settings() {
  const toast = useToast();

  // Printer settings
  const [agentRunning, setAgentRunning] = useState(false);
  const [agentToken, setAgentToken] = useState("");
  const [checkingAgent, setCheckingAgent] = useState(false);
  const [printers, setPrinters] = useState([]);
  const [loadingPrinters, setLoadingPrinters] = useState(false);
  const [selectedPrinter, setSelectedPrinterState] = useState(getSelectedPrinter);
  const [testPrinting, setTestPrinting] = useState(false);

  // Tags, users, etc.
  const [tags, setTags] = useState([]);
  const [users, setUsers] = useState([]);
  const [newTag, setNewTag] = useState({ name: "", colour: "#E8470A" });
  const [editTag, setEditTag] = useState(null);
  const [newUser, setNewUser] = useState({ username: "", password: "" });
  const [savingTag, setSavingTag] = useState(false);
  const [savingUser, setSavingUser] = useState(false);
  const [revokingAll, setRevokingAll] = useState(false);

  const webhookUrl = `${window.location.origin}/api/webhooks/woocommerce`;

  useEffect(() => { loadAll(); handleCheckAgent(); }, []);

  async function loadAll() {
    try {
      const [t, u] = await Promise.all([api.getTags(), api.listUsers()]);
      setTags(t);
      setUsers(u);
    } catch {}
  }

  async function handleCheckAgent() {
    setCheckingAgent(true);
    try {
      const res = await api.agentStatus();
      setAgentRunning(res.connected === true);
      if (res.token) setAgentToken(res.token);
    } catch {
      setAgentRunning(false);
    }
    setCheckingAgent(false);
  }

  async function handleLoadPrinters() {
    setLoadingPrinters(true);
    try {
      const list = await listPrinters();
      setPrinters(list);
      if (list.length && !list.includes(selectedPrinter)) {
        // Auto-select first Brother printer, or first in list
        const brother = list.find((p) => p.toLowerCase().includes("brother"));
        const pick = brother || list[0];
        setSelectedPrinterState(pick);
        setSelectedPrinter(pick);
      }
    } catch (err) {
      toast.error(`Could not load printers: ${err.message}`, 5000);
    } finally {
      setLoadingPrinters(false);
    }
  }

  function handlePrinterSelect(name) {
    setSelectedPrinterState(name);
    setSelectedPrinter(name);
  }

  async function handleTestPrint() {
    setTestPrinting(true);
    toast.info("Sending test label…");
    try {
      const res = await api.renderLabel({
        variant_id: null,
        label_type: 2,
        quantity: 1,
        info_brand: "LabelFlow",
        info_title: "Test Print",
        info_body: "If you can read this, your printer is set up correctly.",
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const jobId = res.headers.get("X-Job-Id");
      const bytes = new Uint8Array(await res.arrayBuffer());
      await printBytes(bytes, selectedPrinter);
      if (jobId) await api.confirmPrint(jobId);
      toast.success("Test label printed!");
    } catch (err) {
      toast.error(`Test print failed: ${err.message}`, 6000);
    } finally {
      setTestPrinting(false);
    }
  }

  async function handleCreateTag(e) {
    e.preventDefault();
    if (!newTag.name.trim()) { toast.error("Tag name required"); return; }
    setSavingTag(true);
    try {
      await api.createTag(newTag);
      toast.success("Tag created");
      setNewTag({ name: "", colour: "#E8470A" });
      loadAll();
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
      loadAll();
    } catch (err) { toast.error(err.message); }
    finally { setSavingTag(false); }
  }

  async function handleDeleteTag(tag) {
    if (!confirm(`Delete tag "${tag.name}"?`)) return;
    try { await api.deleteTag(tag.id); toast.success("Tag deleted"); loadAll(); }
    catch (err) { toast.error(err.message); }
  }

  async function handleCreateUser(e) {
    e.preventDefault();
    if (!newUser.username || !newUser.password) { toast.error("Username and password required"); return; }
    setSavingUser(true);
    try {
      await api.createUser(newUser);
      toast.success("User created");
      setNewUser({ username: "", password: "" });
      loadAll();
    } catch (err) { toast.error(err.message); }
    finally { setSavingUser(false); }
  }

  async function handleRevokeAll() {
    if (!confirm("This will log out all sessions including your own. Continue?")) return;
    setRevokingAll(true);
    try {
      await api.revokeSessions();
      toast.success("All sessions revoked. Logging out…");
      setTimeout(() => {
        localStorage.removeItem("lf_token");
        localStorage.removeItem("lf_username");
        window.location.href = "/login";
      }, 1500);
    } catch (err) { toast.error(err.message); setRevokingAll(false); }
  }

  const printerReady = agentRunning && !!selectedPrinter;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Settings</h1>
      </div>

      {/* ── Printer ── */}
      <div className="card section">
        <h2 style={{ marginBottom: 20 }}>Printer</h2>

        {/* Agent status row */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
          <span className="status-dot" style={{ width: 12, height: 12, flexShrink: 0, background: agentRunning ? "var(--success)" : "var(--text-muted)" }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600 }}>{agentRunning ? "Print agent running" : "Print agent not detected"}</div>
            <div className="text-xs text-muted">ws://localhost:{AGENT_PORT}</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={handleCheckAgent} disabled={checkingAgent}>
            {checkingAgent ? <span className="spinner dark" style={{ width: 14, height: 14 }} /> : "Refresh"}
          </button>
        </div>

        {/* Printer selector */}
        <div className="form-group" style={{ marginBottom: 20 }}>
          <label>Printer</label>
          <div style={{ display: "flex", gap: 10 }}>
            <select
              value={selectedPrinter}
              onChange={(e) => handlePrinterSelect(e.target.value)}
              style={{ flex: 1 }}
              disabled={!agentRunning || printers.length === 0}
            >
              {printers.length === 0 ? (
                <option value="">— click Load Printers —</option>
              ) : (
                <>
                  <option value="">Select a printer…</option>
                  {printers.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </>
              )}
            </select>
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleLoadPrinters}
              disabled={!agentRunning || loadingPrinters}
            >
              {loadingPrinters ? <span className="spinner dark" style={{ width: 14, height: 14 }} /> : "Load Printers"}
            </button>
          </div>
          <p className="text-xs text-muted">Lists all printers installed on your local computer.</p>
        </div>

        {/* Test print */}
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 24, flexWrap: "wrap" }}>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleTestPrint}
            disabled={testPrinting || !printerReady || !selectedPrinter}
            title={!agentRunning ? "Start the print agent first" : !selectedPrinter ? "Select a printer first" : ""}
          >
            {testPrinting ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Printing…</> : "Test Print"}
          </button>
          {selectedPrinter && <span className="text-sm text-muted">→ {selectedPrinter}</span>}
        </div>

        {/* Setup instructions */}
        <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "16px 20px" }}>
          <div style={{ fontWeight: 700, marginBottom: 10, fontSize: "0.9375rem" }}>Setup (one time, on your Windows PC)</div>
          <ol style={{ paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8, color: "var(--text-secondary)", fontSize: "0.875rem" }}>
            <li>
              <a href="/print_agent.py" download style={{ color: "var(--accent)", fontWeight: 600 }}>
                Download print_agent.py
              </a>
              {" "}— save it anywhere on your Windows machine
            </li>
            <li>
              Install dependencies:
              <code style={{ display: "block", background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "8px 12px", marginTop: 6, fontSize: "0.8125rem", fontFamily: "monospace" }}>
                pip install websockets pywin32
              </code>
            </li>
            <li>
              Run the agent (connects to this server):
              <code style={{ display: "block", background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "8px 12px", marginTop: 6, fontSize: "0.8125rem", fontFamily: "monospace", whiteSpace: "pre" }}>
                {`python print_agent.py --url ${window.location.origin.replace("http", "ws")} --token ${agentToken || "YOUR_AGENT_TOKEN"}`}
              </code>
            </li>
            <li>Click <strong>Refresh</strong> above — the dot should turn green</li>
            <li>Click <strong>Load Printers</strong>, select your Brother printer, then <strong>Test Print</strong></li>
          </ol>
          <p className="text-xs text-muted" style={{ marginTop: 12 }}>
            The agent connects outbound to this server — print from any device, any network, even mobile data.
            To run it silently in the background, install it as a Windows service with NSSM using <code>pythonw.exe</code> — see the README.
          </p>
        </div>
      </div>

      {/* ── WooCommerce ── */}
      <div className="card section">
        <h2 style={{ marginBottom: 12 }}>WooCommerce Integration</h2>
        <p className="text-secondary" style={{ marginBottom: 14 }}>
          Add this URL as a WooCommerce webhook (order.created) to import orders automatically.
        </p>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <code style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "10px 16px", fontSize: "0.875rem", flex: 1, wordBreak: "break-all", display: "block" }}>
            {webhookUrl}
          </code>
          <button className="btn btn-ghost btn-sm" onClick={() => { navigator.clipboard.writeText(webhookUrl); toast.success("Copied"); }}>
            Copy
          </button>
        </div>
      </div>

      {/* ── Tags ── */}
      <div className="card section">
        <h2 style={{ marginBottom: 16 }}>Tags</h2>
        {tags.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
            {tags.map((tag) => (
              <div key={tag.id}>
                {editTag?.id === tag.id ? (
                  <form onSubmit={handleSaveTag} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <input value={editTag.name} onChange={(e) => setEditTag({ ...editTag, name: e.target.value })} style={{ flex: 1 }} autoFocus />
                    <input type="color" value={editTag.colour} onChange={(e) => setEditTag({ ...editTag, colour: e.target.value })} style={{ width: 50, padding: 2 }} />
                    <button type="submit" className="btn btn-primary btn-sm" disabled={savingTag}>{savingTag ? <span className="spinner" /> : "Save"}</button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditTag(null)}>Cancel</button>
                  </form>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <span className="tag-badge" style={{ background: tag.colour, minWidth: 80 }}>{tag.name}</span>
                    <code style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>{tag.colour}</code>
                    <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditTag({ ...tag })}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDeleteTag(tag)}>Delete</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        <form onSubmit={handleCreateTag} style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label>New Tag Name</label>
            <input value={newTag.name} onChange={(e) => setNewTag({ ...newTag, name: e.target.value })} placeholder="e.g. Organic" />
          </div>
          <div className="form-group">
            <label>Colour</label>
            <input type="color" value={newTag.colour} onChange={(e) => setNewTag({ ...newTag, colour: e.target.value })} style={{ width: 80, padding: 4, height: 44 }} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={savingTag} style={{ flexShrink: 0 }}>
            {savingTag ? <span className="spinner" /> : "Add Tag"}
          </button>
        </form>
      </div>

      {/* ── Users ── */}
      <div className="card section">
        <h2 style={{ marginBottom: 16 }}>User Accounts</h2>
        {users.length > 0 && (
          <div style={{ marginBottom: 20, overflowX: "auto" }}>
            <table>
              <thead><tr><th>Username</th><th>Created</th></tr></thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600 }}>{u.username}</td>
                    <td className="text-muted text-sm">{new Date(u.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <form onSubmit={handleCreateUser} style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div className="form-group" style={{ flex: "1 1 180px" }}>
            <label>Username</label>
            <input value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} placeholder="new_user" autoComplete="off" />
          </div>
          <div className="form-group" style={{ flex: "1 1 180px" }}>
            <label>Password</label>
            <input type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} placeholder="Min 6 characters" autoComplete="new-password" />
          </div>
          <button type="submit" className="btn btn-primary" disabled={savingUser} style={{ flexShrink: 0 }}>
            {savingUser ? <span className="spinner" /> : "Create User"}
          </button>
        </form>
      </div>

      {/* ── Sessions ── */}
      <div className="card section">
        <h2 style={{ marginBottom: 8 }}>Session Management</h2>
        <p className="text-secondary" style={{ marginBottom: 16 }}>Revoke all active sessions. You will be logged out immediately.</p>
        <button className="btn btn-danger" onClick={handleRevokeAll} disabled={revokingAll}>
          {revokingAll ? <span className="spinner" /> : "Revoke All Sessions"}
        </button>
      </div>
    </div>
  );
}

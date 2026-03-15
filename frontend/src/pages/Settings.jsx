import React, { useState, useEffect } from "react";
import { api } from "../api.js";
import { useToast } from "../components/Toast.jsx";
import {
  getPrinterMode, setPrinterMode,
  getPrinterIp, setPrinterIp,
  checkAgentRunning,
  usbGetOrRequestDevice,
  printBytes,
  useUsbConnected,
  AGENT_PORT,
} from "../printer.js";

export default function Settings() {
  const toast = useToast();
  const usbConnected = useUsbConnected();

  // Printer settings
  const [mode, setMode] = useState(getPrinterMode);
  const [printerIp, setPrinterIpState] = useState(getPrinterIp);
  const [agentRunning, setAgentRunning] = useState(false);
  const [checkingAgent, setCheckingAgent] = useState(false);
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

  useEffect(() => { loadAll(); }, []);

  // Check agent status whenever mode or IP changes
  useEffect(() => {
    if (mode === "network") handleCheckAgent();
  }, [mode, printerIp]);

  async function loadAll() {
    try {
      const [t, u] = await Promise.all([api.getTags(), api.listUsers()]);
      setTags(t);
      setUsers(u);
    } catch {}
  }

  function handleModeChange(newMode) {
    setMode(newMode);
    setPrinterMode(newMode);
  }

  function handleIpChange(ip) {
    setPrinterIpState(ip);
    setPrinterIp(ip);
  }

  async function handleCheckAgent() {
    setCheckingAgent(true);
    setAgentRunning(await checkAgentRunning());
    setCheckingAgent(false);
  }

  async function handleConnectUsb() {
    try {
      await usbGetOrRequestDevice();
      toast.success("Printer connected via USB");
    } catch (err) {
      if (err.name === "NotFoundError") return;
      toast.error(err.message, err.name === "ClaimError" ? 8000 : 4000);
    }
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
      await printBytes(bytes);
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

  const networkReady = mode === "network" && printerIp && agentRunning;
  const usbReady = mode === "usb" && usbConnected;
  const printerReady = networkReady || usbReady;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Settings</h1>
      </div>

      {/* ── Printer ── */}
      <div className="card section">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
          <h2>Printer</h2>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className={`btn btn-sm ${mode === "usb" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => handleModeChange("usb")}
            >
              USB
            </button>
            <button
              className={`btn btn-sm ${mode === "network" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => handleModeChange("network")}
            >
              Network
            </button>
          </div>
        </div>

        {mode === "usb" ? (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <span className="status-dot" style={{ width: 12, height: 12, background: usbConnected ? "var(--success)" : "var(--text-muted)" }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{usbConnected ? "Brother QL-820NWB connected" : "No printer connected"}</div>
                <div className="text-sm text-muted">{navigator.usb ? "WebUSB supported (Chrome / Edge)" : "WebUSB not supported — use Chrome or Edge"}</div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="btn btn-ghost btn-sm" onClick={handleConnectUsb}>
                  {usbConnected ? "Reconnect" : "Connect Printer"}
                </button>
                <button className="btn btn-primary btn-sm" onClick={handleTestPrint} disabled={testPrinting || !usbConnected}>
                  {testPrinting ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Printing…</> : "Test Print"}
                </button>
              </div>
            </div>
            <div style={{ marginTop: 14, padding: "12px 16px", background: "var(--warning-bg)", border: "1px solid #f5d5a8", borderRadius: "var(--radius-sm)", fontSize: "0.875rem", color: "var(--warning)" }}>
              <strong>Windows USB not working?</strong> Switch to <strong>Network mode</strong> — it's easier and keeps P-touch Editor working.
            </div>
          </div>
        ) : (
          <div>
            {/* Network mode */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Printer IP */}
              <div className="form-group">
                <label>Printer IP Address</label>
                <div style={{ display: "flex", gap: 10 }}>
                  <input
                    type="text"
                    placeholder="e.g. 192.168.1.100"
                    value={printerIp}
                    onChange={(e) => handleIpChange(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button className="btn btn-ghost btn-sm" onClick={handleCheckAgent} disabled={checkingAgent || !printerIp}>
                    {checkingAgent ? <span className="spinner dark" style={{ width: 14, height: 14 }} /> : "Check"}
                  </button>
                </div>
                <p className="text-xs text-muted">Find this in the printer's LCD menu or your router's device list.</p>
              </div>

              {/* Agent status */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                  <span className="status-dot" style={{ width: 12, height: 12, background: agentRunning ? "var(--success)" : "var(--text-muted)" }} />
                  <div>
                    <div style={{ fontWeight: 600 }}>{agentRunning ? "Print agent running" : "Print agent not detected"}</div>
                    <div className="text-xs text-muted">Listening on ws://localhost:{AGENT_PORT}</div>
                  </div>
                </div>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleTestPrint}
                  disabled={testPrinting || !networkReady}
                  title={!printerIp ? "Set printer IP first" : !agentRunning ? "Start the print agent first" : ""}
                >
                  {testPrinting ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Printing…</> : "Test Print"}
                </button>
              </div>

              {/* Setup instructions */}
              <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "16px 20px" }}>
                <div style={{ fontWeight: 700, marginBottom: 10, fontSize: "0.9375rem" }}>Setup (one time)</div>
                <ol style={{ paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8, color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                  <li>
                    <a href="/print_agent.py" download style={{ color: "var(--accent)", fontWeight: 600 }}>
                      Download print_agent.py
                    </a>
                    {" "}— save it anywhere on this computer
                  </li>
                  <li>
                    Open a terminal and run:
                    <code style={{ display: "block", background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "8px 12px", marginTop: 6, fontSize: "0.8125rem", fontFamily: "monospace" }}>
                      pip install websockets{"\n"}python print_agent.py
                    </code>
                  </li>
                  <li>Enter your printer's IP above and click <strong>Check</strong></li>
                  <li>Click <strong>Test Print</strong> to verify</li>
                </ol>
                <p className="text-xs text-muted" style={{ marginTop: 12 }}>
                  Leave the agent terminal open while using LabelFlow. P-touch Editor continues to work normally — the agent uses the network port, not USB.
                </p>
              </div>
            </div>
          </div>
        )}
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

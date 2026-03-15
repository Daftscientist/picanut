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

  const [regenerating, setRegenerating] = useState(false);
  const printerReady = agentRunning && !!selectedPrinter;
  const wsUrl = window.location.origin.replace(/^http/, "ws");
  const agentCmd = `python print_agent.py --url ${wsUrl} --token ${agentToken || "…"}`;

  async function handleRegenerateToken() {
    if (!confirm("This will disconnect the current agent. You'll need to restart it with the new token. Continue?")) return;
    setRegenerating(true);
    try {
      const res = await api.regenerateAgentToken();
      setAgentToken(res.token);
      setAgentRunning(false);
      toast.success("New token generated — restart the agent with the new command");
    } catch (err) {
      toast.error(`Failed: ${err.message}`);
    } finally {
      setRegenerating(false);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Settings</h1>
      </div>

      {/* ── Print Agent ── */}
      <div className="card section">
        <h2 style={{ marginBottom: 20 }}>Print Agent</h2>

        {/* Agent status row */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
          <span style={{ width: 12, height: 12, flexShrink: 0, borderRadius: "50%", background: agentRunning ? "var(--success)" : "var(--text-muted)", display: "inline-block" }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600 }}>{agentRunning ? "Agent connected" : "Agent not connected"}</div>
            <div className="text-xs text-muted">{agentRunning ? "Ready to receive print jobs" : "Start the agent on your Windows PC"}</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={handleCheckAgent} disabled={checkingAgent}>
            {checkingAgent ? <span className="spinner dark" style={{ width: 14, height: 14 }} /> : "Refresh"}
          </button>
        </div>

        {/* Token */}
        <div className="form-group" style={{ marginBottom: 24 }}>
          <label>Agent Token</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <code style={{ flex: 1, background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "10px 14px", fontSize: "0.8125rem", fontFamily: "monospace", wordBreak: "break-all", display: "block" }}>
              {agentToken || "Loading…"}
            </code>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => { navigator.clipboard.writeText(agentToken); toast.success("Copied"); }} disabled={!agentToken}>
                Copy
              </button>
              <button className="btn btn-danger btn-sm" onClick={handleRegenerateToken} disabled={regenerating || !agentToken}>
                {regenerating ? <span className="spinner" style={{ width: 14, height: 14 }} /> : "Regenerate"}
              </button>
            </div>
          </div>
          <p className="text-xs text-muted" style={{ marginTop: 6 }}>Regenerating disconnects the current agent — restart it with the new token.</p>
        </div>

        {/* Printer selector */}
        <div className="form-group" style={{ marginBottom: 20 }}>
          <label>Active Printer</label>
          <div style={{ display: "flex", gap: 10 }}>
            <select
              value={selectedPrinter}
              onChange={(e) => handlePrinterSelect(e.target.value)}
              style={{ flex: 1 }}
              disabled={!agentRunning || printers.length === 0}
            >
              {printers.length === 0 ? (
                <option value="">{agentRunning ? "— click Load Printers —" : "— connect agent first —"}</option>
              ) : (
                <>
                  <option value="">Select a printer…</option>
                  {printers.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </>
              )}
            </select>
            <button className="btn btn-ghost btn-sm" onClick={handleLoadPrinters} disabled={!agentRunning || loadingPrinters}>
              {loadingPrinters ? <span className="spinner dark" style={{ width: 14, height: 14 }} /> : "Load Printers"}
            </button>
          </div>
          <p className="text-xs text-muted">Printer list comes from the connected Windows PC.</p>
        </div>

        {/* Test print */}
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 28, flexWrap: "wrap" }}>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleTestPrint}
            disabled={testPrinting || !printerReady}
            title={!agentRunning ? "Connect the agent first" : !selectedPrinter ? "Select a printer first" : ""}
          >
            {testPrinting ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Printing…</> : "Test Print"}
          </button>
          {selectedPrinter && <span className="text-sm text-muted">→ {selectedPrinter}</span>}
        </div>

        {/* Setup instructions */}
        <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "20px 24px" }}>
          <div style={{ fontWeight: 700, marginBottom: 4, fontSize: "0.9375rem" }}>Agent Setup</div>
          <p className="text-sm text-muted" style={{ marginBottom: 16 }}>
            Run this once on the Windows PC connected to the printer. The agent connects outbound to this server, so printing works from any device on any network.
          </p>
          <ol style={{ paddingLeft: 20, display: "flex", flexDirection: "column", gap: 12, fontSize: "0.875rem", color: "var(--text-secondary)" }}>
            <li>
              <a href="/print_agent.py" download style={{ color: "var(--accent)", fontWeight: 600 }}>Download print_agent.py</a>
              {" "}and save it anywhere on the Windows PC.
            </li>
            <li>
              Install dependencies:
              <code style={{ display: "block", background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "10px 14px", marginTop: 8, fontSize: "0.8125rem", fontFamily: "monospace" }}>
                pip install websockets pywin32
              </code>
            </li>
            <li>
              Run the agent:
              <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "stretch" }}>
                <code style={{ flex: 1, background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "10px 14px", fontSize: "0.8125rem", fontFamily: "monospace", wordBreak: "break-all", display: "block" }}>
                  {agentCmd}
                </code>
                <button className="btn btn-ghost btn-sm" style={{ flexShrink: 0, alignSelf: "stretch" }} onClick={() => { navigator.clipboard.writeText(agentCmd); toast.success("Copied"); }}>
                  Copy
                </button>
              </div>
            </li>
            <li>Click <strong>Refresh</strong> above — the dot turns green when connected.</li>
            <li>Click <strong>Load Printers</strong>, select your Brother printer, then <strong>Test Print</strong>.</li>
          </ol>
          <div style={{ marginTop: 20, padding: "14px 16px", background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)" }}>
            <div style={{ fontWeight: 600, marginBottom: 8, fontSize: "0.875rem" }}>Run silently in the background (no window)</div>
            <p className="text-xs text-muted" style={{ marginBottom: 10 }}>Install as a Windows service with NSSM so it starts automatically and runs silently:</p>
            <code style={{ display: "block", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "10px 14px", fontSize: "0.8rem", fontFamily: "monospace", whiteSpace: "pre", overflowX: "auto" }}>
              {`nssm install LabelFlowAgent "C:\\Python311\\pythonw.exe"\nnssm set LabelFlowAgent AppParameters "C:\\path\\to\\print_agent.py --url ${wsUrl} --token ${agentToken || "…"}"\nnssm set LabelFlowAgent AppDirectory "C:\\path\\to\\agent\\folder"\nnssm start LabelFlowAgent`}
            </code>
            <p className="text-xs text-muted" style={{ marginTop: 8 }}>
              Logs are written to <code>print_agent.log</code> next to the script.
              Download NSSM from <strong>nssm.cc</strong>.
            </p>
          </div>
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

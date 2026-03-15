import React, { useState, useEffect, useCallback } from "react";
import { api } from "../api.js";
import { useToast } from "../components/Toast.jsx";
import { listPrinters } from "../printer.js";

export default function Agents() {
  const toast = useToast();
  const role = localStorage.getItem("lf_role") || "subuser";
  const isManager = role === "manager" || localStorage.getItem("lf_is_platform_admin") === "true";

  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [editAgent, setEditAgent] = useState(null);
  const [printerList, setPrinterList] = useState({});
  const [loadingPrinters, setLoadingPrinters] = useState({});
  const [showToken, setShowToken] = useState({});

  const load = useCallback(async () => {
    try {
      const data = await api.listAgents();
      setAgents(data.agents || []);
    } catch (err) {
      toast.error("Failed to load agents");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  async function handleCreate(e) {
    e.preventDefault();
    if (!newName.trim()) { toast.error("Name required"); return; }
    setCreating(true);
    try {
      await api.createAgent({ name: newName.trim() });
      toast.success("Agent created");
      setNewName("");
      setShowAdd(false);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(agent) {
    if (!confirm(`Delete agent "${agent.name}"? This cannot be undone.`)) return;
    try {
      await api.deleteAgent(agent.id);
      toast.success("Agent deleted");
      load();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleRegenToken(agent) {
    if (!confirm("This will disconnect the agent. It must be restarted with the new token.")) return;
    try {
      const res = await api.regenerateAgentToken(agent.id);
      toast.success("Token regenerated");
      load();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleSetDefault(agent) {
    try {
      await api.setDefaultAgent(agent.id);
      toast.success(`${agent.name} set as default`);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleLoadPrinters(agentId) {
    setLoadingPrinters((p) => ({ ...p, [agentId]: true }));
    try {
      const printers = await listPrinters(agentId);
      setPrinterList((p) => ({ ...p, [agentId]: printers }));
    } catch (err) {
      toast.error(`Could not load printers: ${err.message}`);
    } finally {
      setLoadingPrinters((p) => ({ ...p, [agentId]: false }));
    }
  }

  async function handleSavePrinter(agentId, printerName) {
    try {
      await api.updateAgent(agentId, { selected_printer: printerName });
      toast.success("Printer saved");
      load();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleUpdate(agentId, data) {
    try {
      await api.updateAgent(agentId, data);
      toast.success("Agent updated");
      setEditAgent(null);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  }

  const agentUrl = window.location.origin;
  const agentCmd = (token) => `python print_agent.py --url ${agentUrl} --token ${token}`;

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
          <h1>Print Agents</h1>
          <p className="text-secondary text-sm mt-1">
            {agents.length} agent{agents.length !== 1 ? "s" : ""} · {agents.filter((a) => a.connected).length} connected
          </p>
        </div>
        {isManager && (
          <button className="btn bp" onClick={() => setShowAdd(true)}>
            + Add Agent
          </button>
        )}
      </div>

      {/* Add agent modal */}
      {showAdd && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowAdd(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2>New Print Agent</h2>
              <button className="btn bg btn-icon" onClick={() => setShowAdd(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="fg">
                <label className="fl">Agent Name</label>
                <input
                  className="fi"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Warehouse Printer"
                  autoFocus
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn bg" onClick={() => setShowAdd(false)}>Cancel</button>
                <button type="submit" className="btn bp" disabled={creating}>
                  {creating ? <span className="spinner" /> : "Create Agent"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {agents.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: 40, marginBottom: 12 }}>🖨️</div>
          <h3>No print agents</h3>
          <p style={{ marginBottom: 20 }}>Create an agent to start printing labels from this workspace.</p>
          {isManager && (
            <button className="btn bp" onClick={() => setShowAdd(true)}>Add Agent</button>
          )}
        </div>
      ) : (
        <div className="grid-2" style={{ gap: 16 }}>
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              isManager={isManager}
              showToken={showToken[agent.id]}
              onToggleToken={() => setShowToken((s) => ({ ...s, [agent.id]: !s[agent.id] }))}
              printers={printerList[agent.id] || []}
              loadingPrinters={loadingPrinters[agent.id]}
              onLoadPrinters={() => handleLoadPrinters(agent.id)}
              onSavePrinter={(p) => handleSavePrinter(agent.id, p)}
              onSetDefault={() => handleSetDefault(agent)}
              onRegenToken={() => handleRegenToken(agent)}
              onDelete={() => handleDelete(agent)}
              onUpdate={(data) => handleUpdate(agent.id, data)}
              agentCmd={agentCmd(agent.token || "…")}
            />
          ))}
        </div>
      )}

      {/* Setup instructions */}
      <div className="card section" style={{ marginTop: 24 }}>
        <div className="ch"><h2>Setup Instructions</h2></div>
        <div className="ct">
          <p className="text-secondary" style={{ marginBottom: 16 }}>
            Run the print agent on any Windows PC connected to your label printer. It connects outbound so printing works from anywhere.
          </p>
          <ol style={{ paddingLeft: 20, display: "flex", flexDirection: "column", gap: 12, fontSize: 13, color: "var(--text2)" }}>
            <li><a href="/print_agent.py" download style={{ color: "var(--accent)", fontWeight: 600 }}>Download print_agent.py</a> and save it on the Windows PC.</li>
            <li>Install dependencies:
              <div className="token" style={{ marginTop: 6 }}>pip install aiohttp pywin32</div>
            </li>
            <li>Create an agent above, then run it with the token shown on the agent card.</li>
            <li>The status dot turns green when connected. Then load printers and configure.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

function AgentCard({ agent, isManager, showToken, onToggleToken, printers, loadingPrinters, onLoadPrinters, onSavePrinter, onSetDefault, onRegenToken, onDelete, onUpdate, agentCmd }) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(agent.name);

  function copy(text, label) {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  }

  return (
    <div className="card">
      <div className="ch">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className={`dot ${agent.connected ? "dg" : "dr"}`} />
          {editing ? (
            <input
              className="fi"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ fontSize: 14, fontWeight: 600, padding: "4px 8px" }}
              autoFocus
              onBlur={() => { if (name.trim() && name !== agent.name) onUpdate({ name: name.trim() }); setEditing(false); }}
              onKeyDown={(e) => { if (e.key === "Enter") { if (name.trim()) onUpdate({ name: name.trim() }); setEditing(false); } if (e.key === "Escape") { setName(agent.name); setEditing(false); } }}
            />
          ) : (
            <span style={{ fontWeight: 600, cursor: isManager ? "pointer" : "default" }} onClick={() => isManager && setEditing(true)}>
              {agent.name}
            </span>
          )}
          {agent.is_default && <span className="b bg2" style={{ fontSize: 10 }}>Default</span>}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {isManager && !agent.is_default && (
            <button className="btn bg btn-sm" onClick={onSetDefault}>Set default</button>
          )}
          {isManager && (
            <button className="btn btn-danger btn-sm" onClick={onDelete}>Delete</button>
          )}
        </div>
      </div>
      <div className="ct" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Status */}
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div className="text-xs text-muted" style={{ marginBottom: 2 }}>Status</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: agent.connected ? "var(--ok)" : "var(--danger)" }}>
              {agent.connected ? "Online" : "Offline"}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted" style={{ marginBottom: 2 }}>Printer</div>
            <div style={{ fontSize: 12 }}>{agent.selected_printer || "Not set"}</div>
          </div>
          {agent.paper_size && (
            <div>
              <div className="text-xs text-muted" style={{ marginBottom: 2 }}>Paper</div>
              <div style={{ fontSize: 12 }}>{agent.paper_size}</div>
            </div>
          )}
        </div>

        {/* Token */}
        <div>
          <div className="text-xs text-muted" style={{ marginBottom: 4 }}>Agent Token</div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <div className="token" style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: showToken ? "normal" : "nowrap" }}>
              {showToken ? agent.token : "••••••••••••••••••••••••"}
            </div>
            <button className="btn bg btn-sm" onClick={onToggleToken}>{showToken ? "Hide" : "Show"}</button>
            <button className="btn bg btn-sm" onClick={() => copy(agent.token, "Token")}>Copy</button>
          </div>
        </div>

        {/* Run command */}
        <div>
          <div className="text-xs text-muted" style={{ marginBottom: 4 }}>Run command</div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <div className="token" style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {agentCmd}
            </div>
            <button className="btn bg btn-sm" onClick={() => copy(agentCmd, "Command")}>Copy</button>
          </div>
        </div>

        {/* Printer selection */}
        {agent.connected && (
          <div>
            <div className="text-xs text-muted" style={{ marginBottom: 4 }}>Configure Printer</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <select
                className="fi-sel"
                style={{ flex: 1 }}
                value={agent.selected_printer || ""}
                onChange={(e) => onSavePrinter(e.target.value)}
                disabled={printers.length === 0}
              >
                {printers.length === 0
                  ? <option value="">— click Load Printers —</option>
                  : (
                    <>
                      <option value="">Select printer…</option>
                      {printers.map((p) => <option key={p} value={p}>{p}</option>)}
                    </>
                  )
                }
              </select>
              <button className="btn bg btn-sm" onClick={onLoadPrinters} disabled={loadingPrinters}>
                {loadingPrinters ? <span className="spinner dark" style={{ width: 12, height: 12 }} /> : "Load"}
              </button>
            </div>
          </div>
        )}

        {isManager && (
          <button className="btn btn-danger btn-sm" style={{ alignSelf: "flex-start" }} onClick={onRegenToken}>
            Regenerate token
          </button>
        )}
      </div>
    </div>
  );
}

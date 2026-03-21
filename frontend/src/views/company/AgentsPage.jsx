import { useEffect, useState } from 'react'
import { useAuth } from '../../auth/AuthProvider.jsx'
import { apiJson } from '../../lib/api.js'

export function AgentsPage() {
  const { token, user } = useAuth()
  const isManager = user?.role === 'manager' || user?.is_platform_admin
  const [agents, setAgents] = useState([])
  const [printers, setPrinters] = useState([])
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)
  const [newName, setNewName] = useState('')

  async function refresh() {
    const data = await apiJson('/api/agents', { token })
    const list = data?.agents || []
    setAgents(Array.isArray(list) ? list : [])
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        await refresh()
      } catch (e) {
        if (!cancelled) setErr(e?.message || 'Failed to load agents')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!isManager) return
      try {
        const data = await apiJson('/api/printers', { token })
        if (!cancelled) setPrinters(Array.isArray(data?.printers) ? data.printers : [])
      } catch {
        // printers can be unavailable if no agent connected; keep silent
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token, isManager])

  async function createAgent(e) {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    try {
      await apiJson('/api/agents', { method: 'POST', token, json: { name: newName || 'New Agent' } })
      setNewName('')
      await refresh()
    } catch (e2) {
      setErr(e2?.message || 'Failed to create agent')
    } finally {
      setBusy(false)
    }
  }

  async function setDefault(agentId) {
    setBusy(true)
    setErr(null)
    try {
      await apiJson(`/api/agents/${agentId}/set-default`, { method: 'POST', token })
      await refresh()
    } catch (e2) {
      setErr(e2?.message || 'Failed to set default agent')
    } finally {
      setBusy(false)
    }
  }

  async function regenerate(agentId) {
    setBusy(true)
    setErr(null)
    try {
      await apiJson(`/api/agents/${agentId}/regenerate-token`, { method: 'POST', token })
      await refresh()
    } catch (e2) {
      setErr(e2?.message || 'Failed to regenerate token')
    } finally {
      setBusy(false)
    }
  }

  async function updateAgent(agentId, patch) {
    setBusy(true)
    setErr(null)
    try {
      await apiJson(`/api/agents/${agentId}`, { method: 'PUT', token, json: patch })
      await refresh()
    } catch (e2) {
      setErr(e2?.message || 'Failed to update agent')
    } finally {
      setBusy(false)
    }
  }

  if (!isManager) {
    return (
      <div className="page-body">
        <div className="container-xl">
          <div className="alert alert-warning">
            Agents are a manager-only feature. Ask a manager to configure printers and agent tokens.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-body">
      <div className="container-xl">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2 className="mb-0">Agents</h2>
          <button className="btn btn-outline-secondary btn-sm" onClick={refresh} disabled={busy}>Refresh</button>
        </div>
        {err && <div className="alert alert-danger">{err}</div>}

        <div className="row row-cards">
          <div className="col-12 col-lg-4">
            <form className="card" onSubmit={createAgent}>
              <div className="card-header">
                <h3 className="card-title">Add agent</h3>
              </div>
              <div className="card-body">
                <div className="mb-3">
                  <label className="form-label">Name</label>
                  <input className="form-control" value={newName} onChange={(e) => setNewName(e.target.value)} />
                </div>
                <button className="btn btn-primary w-100" disabled={busy}>Create</button>
              </div>
            </form>
            <div className="alert alert-info mt-3">
              Printer list comes from <code>/api/printers</code> and requires an agent to be connected.
            </div>
          </div>
          <div className="col-12 col-lg-8">
            <div className="card">
              <div className="table-responsive">
                <table className="table table-vcenter card-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Connected</th>
                      <th>Printer</th>
                      <th>Default</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agents.map((a) => (
                      <tr key={a.id}>
                        <td className="fw-semibold">{a.name}</td>
                        <td>
                          {a.connected ? (
                            <span className="badge bg-success">Online</span>
                          ) : (
                            <span className="badge bg-secondary">Offline</span>
                          )}
                        </td>
                        <td>
                          <select
                            className="form-select form-select-sm"
                            value={a.selected_printer || ''}
                            onChange={(e) => updateAgent(a.id, { selected_printer: e.target.value || null })}
                            disabled={busy || printers.length === 0}
                          >
                            <option value="">(not set)</option>
                            {printers.map((p) => (
                              <option key={p} value={p}>{p}</option>
                            ))}
                          </select>
                        </td>
                        <td>{a.is_default ? <span className="badge bg-primary">Default</span> : <span className="text-muted">—</span>}</td>
                        <td className="text-end">
                          <div className="btn-list justify-content-end">
                            {!a.is_default && (
                              <button className="btn btn-sm btn-outline-primary" onClick={() => setDefault(a.id)} disabled={busy}>
                                Set default
                              </button>
                            )}
                            <button className="btn btn-sm btn-outline-secondary" onClick={() => regenerate(a.id)} disabled={busy}>
                              Regenerate token
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {agents.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-muted">No agents configured.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


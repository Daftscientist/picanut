import { useEffect, useState } from 'react'
import { useAuth } from '../../auth/AuthProvider.jsx'
import { apiJson } from '../../lib/api.js'

export function SettingsUsersPage() {
  const { token, user } = useAuth()
  const isManager = user?.role === 'manager' || user?.is_platform_admin
  const [users, setUsers] = useState([])
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newRole, setNewRole] = useState('subuser')

  async function refresh() {
    const data = await apiJson('/api/settings/users', { token })
    setUsers(Array.isArray(data) ? data : [])
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!isManager) return
      try {
        await refresh()
      } catch (e) {
        if (!cancelled) setErr(e?.message || 'Failed to load users')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token, isManager])

  async function createUser(e) {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    try {
      await apiJson('/api/settings/users', {
        method: 'POST',
        token,
        json: { username: newUsername.trim(), password: newPassword, role: newRole },
      })
      setNewUsername('')
      setNewPassword('')
      setNewRole('subuser')
      await refresh()
    } catch (e2) {
      setErr(e2?.message || 'Failed to create user')
    } finally {
      setBusy(false)
    }
  }

  async function revokeMySessions() {
    setBusy(true)
    setErr(null)
    try {
      await apiJson('/api/settings/revoke-sessions', { method: 'POST', token })
      // This revokes the current token too; next request will force logout.
      window.location.assign('/login')
    } catch (e2) {
      setErr(e2?.message || 'Failed to revoke sessions')
    } finally {
      setBusy(false)
    }
  }

  if (!isManager) {
    return (
      <div className="page-body">
        <div className="container-xl">
          <div className="alert alert-warning">Team management is a manager-only feature.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-body">
      <div className="container-xl">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2 className="mb-0">Team</h2>
          <button className="btn btn-outline-danger btn-sm" onClick={revokeMySessions} disabled={busy}>
            Revoke my sessions
          </button>
        </div>
        {err && <div className="alert alert-danger">{err}</div>}
        <div className="row row-cards">
          <div className="col-12 col-lg-5">
            <form className="card" onSubmit={createUser}>
              <div className="card-header">
                <h3 className="card-title">Add user</h3>
              </div>
              <div className="card-body">
                <div className="mb-3">
                  <label className="form-label">Username</label>
                  <input className="form-control" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} />
                </div>
                <div className="mb-3">
                  <label className="form-label">Password</label>
                  <input className="form-control" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                </div>
                <div className="mb-3">
                  <label className="form-label">Role</label>
                  <select className="form-select" value={newRole} onChange={(e) => setNewRole(e.target.value)}>
                    <option value="subuser">Sub-user (print ops)</option>
                    <option value="manager">Manager</option>
                  </select>
                </div>
                <button className="btn btn-primary w-100" disabled={busy}>Create</button>
              </div>
            </form>
          </div>
          <div className="col-12 col-lg-7">
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Users</h3>
              </div>
              <div className="table-responsive">
                <table className="table table-vcenter card-table">
                  <thead>
                    <tr>
                      <th>Username</th>
                      <th>Role</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td className="fw-semibold">{u.username}</td>
                        <td>{u.role}</td>
                        <td className="text-muted">{u.created_at ? new Date(u.created_at).toLocaleString() : '—'}</td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={3} className="text-muted">No users found.</td>
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


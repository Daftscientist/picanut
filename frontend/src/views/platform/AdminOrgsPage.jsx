import { useEffect, useState } from 'react'
import { useAuth } from '../../auth/AuthProvider.jsx'
import { apiJson } from '../../lib/api.js'

export function AdminOrgsPage() {
  const { token } = useAuth()
  const [orgs, setOrgs] = useState([])
  const [err, setErr] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await apiJson('/api/admin/organizations', { token })
        if (!cancelled) setOrgs(Array.isArray(data) ? data : [])
      } catch (e) {
        if (!cancelled) setErr(e?.message || 'Failed to load organisations')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token])

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Organizations</h3>
      </div>
      <div className="card-body">
        {err && <div className="alert alert-danger">{err}</div>}
        <div className="table-responsive">
          <table className="table table-vcenter">
            <thead>
              <tr>
                <th>Name</th>
                <th>Plan</th>
                <th>Status</th>
                <th className="text-end">Users</th>
                <th className="text-end">Agents</th>
              </tr>
            </thead>
            <tbody>
              {orgs.map((o) => (
                <tr key={o.id}>
                  <td className="fw-semibold">{o.name}</td>
                  <td>{o.plan_name || <span className="text-muted">—</span>}</td>
                  <td>{o.subscription_status}</td>
                  <td className="text-end">{o.user_count}</td>
                  <td className="text-end">{o.agent_count}</td>
                </tr>
              ))}
              {orgs.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-muted">No organisations found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}


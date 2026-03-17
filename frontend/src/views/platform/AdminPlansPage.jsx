import { useEffect, useState } from 'react'
import { useAuth } from '../../auth/AuthProvider.jsx'
import { apiJson } from '../../lib/api.js'

export function AdminPlansPage() {
  const { token } = useAuth()
  const [plans, setPlans] = useState([])
  const [err, setErr] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await apiJson('/api/admin/plans', { token })
        if (!cancelled) setPlans(Array.isArray(data) ? data : [])
      } catch (e) {
        if (!cancelled) setErr(e?.message || 'Failed to load plans')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token])

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Plans</h3>
      </div>
      <div className="card-body">
        {err && <div className="alert alert-danger">{err}</div>}
        <div className="table-responsive">
          <table className="table table-vcenter">
            <thead>
              <tr>
                <th>Name</th>
                <th>Price</th>
                <th>Trial</th>
                <th>Limits</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((p) => (
                <tr key={p.id}>
                  <td className="fw-semibold">{p.name}</td>
                  <td>£{((p.price_pence || 0) / 100).toFixed(2)}</td>
                  <td>{p.trial_days} days</td>
                  <td className="text-muted">
                    {p.subuser_limit} users · {p.agent_limit} agents · {p.product_limit} products · {p.print_quota} prints
                  </td>
                </tr>
              ))}
              {plans.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-muted">No plans found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}


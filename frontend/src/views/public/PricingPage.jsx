import { useEffect, useState } from 'react'
import { apiJson } from '../../lib/api.js'
import { Link } from 'react-router-dom'

export function PricingPage() {
  const [plans, setPlans] = useState([])
  const [err, setErr] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await apiJson('/api/billing/plans')
        if (!cancelled) setPlans(Array.isArray(data) ? data : [])
      } catch (e) {
        if (!cancelled) setErr(e?.message || 'Failed to load plans')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="page-body">
      <div className="container-xl">
        <div className="row">
          <div className="col-12">
            <h2 className="mb-3">Plans</h2>
            {err && <div className="alert alert-danger">{err}</div>}
          </div>
        </div>
        <div className="row row-cards">
          {plans.map((p) => (
            <div className="col-12 col-md-6 col-lg-4" key={p.id}>
              <div className="card">
                <div className="card-body">
                  <h3 className="card-title mb-1">{p.name}</h3>
                  <div className="text-muted mb-3">
                    £{((p.price_pence || 0) / 100).toFixed(2)} / month · {p.trial_days} day trial
                  </div>
                  <ul className="list-unstyled">
                    <li>- {p.subuser_limit} sub-users</li>
                    <li>- {p.agent_limit} agents</li>
                    <li>- {p.product_limit} products</li>
                    <li>- {p.print_quota} prints / month</li>
                  </ul>
                  <Link to="/signup" className="btn btn-primary w-100">Start trial</Link>
                </div>
              </div>
            </div>
          ))}
          {plans.length === 0 && !err && (
            <div className="col-12">
              <div className="text-muted">No public plans found.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


import { useEffect, useState } from 'react'
import { useAuth } from '../../auth/AuthProvider.jsx'
import { apiJson } from '../../lib/api.js'

export function CompanyHome() {
  const { token, user } = useAuth()
  const [billing, setBilling] = useState(null)
  const [orders, setOrders] = useState([])
  const [err, setErr] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [b, o] = await Promise.all([
          apiJson('/api/billing/status', { token }),
          apiJson('/api/print/orders/pending', { token }),
        ])
        if (!cancelled) {
          setBilling(b)
          setOrders(Array.isArray(o) ? o : [])
        }
      } catch (e) {
        if (!cancelled) setErr(e?.message || 'Failed to load dashboard')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token])

  return (
    <div className="page-body">
      <div className="container-xl">
        <div className="row mb-3">
          <div className="col">
            <h2 className="mb-0">Dashboard</h2>
            <div className="text-muted">Signed in as {user?.username}</div>
          </div>
        </div>

        {err && <div className="alert alert-danger">{err}</div>}

        <div className="row row-cards">
          <div className="col-12 col-lg-6">
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Pending orders</h3>
              </div>
              <div className="card-body">
                {orders.length === 0 ? (
                  <div className="text-muted">No pending orders.</div>
                ) : (
                  <ul className="list-unstyled mb-0">
                    {orders.slice(0, 5).map((o) => (
                      <li key={o.id} className="mb-2">
                        <div className="fw-semibold">{o.order_number}</div>
                        <div className="text-muted">{o.customer_name || '—'}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <div className="col-12 col-lg-6">
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Plan & usage</h3>
              </div>
              <div className="card-body">
                {!billing ? (
                  <div className="text-muted">Loading…</div>
                ) : (
                  <div className="d-grid gap-2">
                    <div>
                      <div className="fw-semibold">{billing.plan_name || 'Plan'}</div>
                      <div className="text-muted">Status: {billing.subscription_status}</div>
                    </div>
                    <div className="row g-2">
                      <div className="col-6">
                        <div className="text-muted">Prints</div>
                        <div className="fw-semibold">{billing.usage?.quota?.used} / {billing.usage?.quota?.limit}</div>
                      </div>
                      <div className="col-6">
                        <div className="text-muted">Products</div>
                        <div className="fw-semibold">{billing.usage?.products?.used} / {billing.usage?.products?.limit}</div>
                      </div>
                      <div className="col-6">
                        <div className="text-muted">Agents</div>
                        <div className="fw-semibold">{billing.usage?.agents?.used} / {billing.usage?.agents?.limit}</div>
                      </div>
                      <div className="col-6">
                        <div className="text-muted">Sub-users</div>
                        <div className="fw-semibold">{billing.usage?.subusers?.used} / {billing.usage?.subusers?.limit}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


import { useEffect, useState } from 'react'
import { useAuth } from '../../auth/AuthProvider.jsx'
import { apiJson } from '../../lib/api.js'

export function BillingPage() {
  const { token, user } = useAuth()
  const isManager = user?.role === 'manager' || user?.is_platform_admin
  const [status, setStatus] = useState(null)
  const [plans, setPlans] = useState([])
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!isManager) return
      try {
        const [s, p] = await Promise.all([
          apiJson('/api/billing/status', { token }),
          apiJson('/api/billing/plans'),
        ])
        if (!cancelled) setStatus(s)
        if (!cancelled) setPlans(Array.isArray(p) ? p : [])
      } catch (e) {
        if (!cancelled) setErr(e?.message || 'Failed to load billing')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token, isManager])

  async function openPortal() {
    setBusy(true)
    setErr(null)
    try {
      const res = await apiJson('/api/billing/portal', { method: 'POST', token })
      if (res?.url) window.location.assign(res.url)
      else throw new Error('No portal URL returned')
    } catch (e) {
      setErr(e?.message || 'Failed to open portal')
    } finally {
      setBusy(false)
    }
  }

  async function checkout(planId) {
    setBusy(true)
    setErr(null)
    try {
      const res = await apiJson('/api/billing/checkout', {
        method: 'POST',
        token,
        json: { plan_id: planId },
      })
      if (res?.url) window.location.assign(res.url)
      else throw new Error('No checkout URL returned')
    } catch (e) {
      setErr(e?.message || 'Failed to start checkout')
    } finally {
      setBusy(false)
    }
  }

  if (!isManager) {
    return (
      <div className="page-body">
        <div className="container-xl">
          <div className="alert alert-warning">Billing is a manager-only feature.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-body">
      <div className="container-xl">
        <h2 className="mb-3">Billing</h2>
        {err && <div className="alert alert-danger">{err}</div>}
        <div className="row row-cards">
          <div className="col-12 col-lg-5">
            <div className="card">
              <div className="card-body">
            {!status ? (
              <div className="text-muted">Loading…</div>
            ) : (
              <div className="d-grid gap-2">
                <div className="fw-semibold">{status.plan_name || 'Plan'}</div>
                <div className="text-muted">Status: {status.subscription_status}</div>
                <div className="text-muted">Trial ends: {status.trial_ends_at ? new Date(status.trial_ends_at).toLocaleString() : '—'}</div>
                <div className="d-flex gap-2">
                  <button className="btn btn-outline-secondary" onClick={openPortal} disabled={busy}>
                    Customer portal
                  </button>
                </div>
              </div>
            )}
              </div>
            </div>
          </div>
          <div className="col-12 col-lg-7">
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Upgrade / change plan</h3>
              </div>
              <div className="card-body">
                <div className="row row-cards">
                  {plans.map((p) => (
                    <div className="col-12 col-md-6" key={p.id}>
                      <div className="card card-sm">
                        <div className="card-body">
                          <div className="fw-semibold">{p.name}</div>
                          <div className="text-muted mb-2">£{((p.price_pence || 0) / 100).toFixed(2)} / month</div>
                          <button className="btn btn-sm btn-primary" onClick={() => checkout(p.id)} disabled={busy}>
                            Choose
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {plans.length === 0 && (
                    <div className="text-muted">No public plans available.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


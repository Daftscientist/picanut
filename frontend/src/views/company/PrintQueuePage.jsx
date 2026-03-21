import { useEffect, useState } from 'react'
import { useAuth } from '../../auth/AuthProvider.jsx'
import { apiJson } from '../../lib/api.js'

export function PrintQueuePage() {
  const { token } = useAuth()
  const [jobs, setJobs] = useState([])
  const [err, setErr] = useState(null)
  const [busyId, setBusyId] = useState(null)

  async function refresh() {
    const data = await apiJson('/api/print/jobs?limit=20', { token })
    setJobs(Array.isArray(data) ? data : [])
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        await refresh()
      } catch (e) {
        if (!cancelled) setErr(e?.message || 'Failed to load jobs')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token])

  async function confirm(jobId) {
    setBusyId(jobId)
    setErr(null)
    try {
      await apiJson(`/api/print/${jobId}/confirm`, { method: 'POST', token })
      await refresh()
    } catch (e) {
      setErr(e?.message || 'Confirm failed')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="page-body">
      <div className="container-xl">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h2 className="mb-0">Print queue</h2>
            <div className="text-muted">Recent print jobs</div>
          </div>
          <button className="btn btn-outline-secondary" onClick={refresh}>Refresh</button>
        </div>

        {err && <div className="alert alert-danger">{err}</div>}

        <div className="card">
          <div className="table-responsive">
            <table className="table table-vcenter card-table">
              <thead>
                <tr>
                  <th>Created</th>
                  <th>Status</th>
                  <th>Product</th>
                  <th>SKU</th>
                  <th className="text-end">Qty</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((j) => (
                  <tr key={j.id}>
                    <td className="text-muted">{j.created_at ? new Date(j.created_at).toLocaleString() : '—'}</td>
                    <td>{j.status}</td>
                    <td className="fw-semibold">{j.product_name || <span className="text-muted">—</span>}</td>
                    <td>{j.sku || <span className="text-muted">—</span>}</td>
                    <td className="text-end">{j.quantity}</td>
                    <td className="text-end">
                      {j.status === 'queued' ? (
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => confirm(j.id)}
                          disabled={busyId === j.id}
                        >
                          {busyId === j.id ? 'Confirming…' : 'Confirm printed'}
                        </button>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {jobs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-muted">No print jobs yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}


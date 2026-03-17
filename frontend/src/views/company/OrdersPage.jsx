import { useEffect, useState } from 'react'
import { useAuth } from '../../auth/AuthProvider.jsx'
import { apiJson, apiRequest } from '../../lib/api.js'

export function OrdersPage() {
  const { token } = useAuth()
  const [orders, setOrders] = useState([])
  const [err, setErr] = useState(null)
  const [busyId, setBusyId] = useState(null)

  async function refresh() {
    const data = await apiJson('/api/print/orders/pending', { token })
    setOrders(Array.isArray(data) ? data : [])
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        await refresh()
      } catch (e) {
        if (!cancelled) setErr(e?.message || 'Failed to load orders')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token])

  async function printAll(orderId) {
    setBusyId(orderId)
    setErr(null)
    try {
      const { resp, data } = await apiRequest(`/api/print/orders/${orderId}/print-all`, {
        method: 'POST',
        token,
      })
      const ids = resp.headers.get('X-Job-Ids') || resp.headers.get('x-job-ids') || ''

      if (!(data instanceof ArrayBuffer)) throw new Error('Expected binary response from print-all')

      // Dispatch to the configured default agent/printer (server resolves defaults if headers omitted).
      await apiRequest('/api/print/dispatch', {
        method: 'POST',
        token,
        body: new Uint8Array(data),
        headers: { 'Content-Type': 'application/octet-stream' },
        timeoutMs: 30000,
      })

      await refresh()
      if (ids) {
        // Soft feedback only
        console.info('Printed job ids:', ids)
      }
    } catch (e) {
      setErr(e?.message || 'Print failed')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="page-body">
      <div className="container-xl">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h2 className="mb-0">Orders</h2>
            <div className="text-muted">Pending WooCommerce orders</div>
          </div>
          <button className="btn btn-outline-secondary" onClick={refresh}>Refresh</button>
        </div>

        {err && <div className="alert alert-danger">{err}</div>}

        <div className="card">
          <div className="table-responsive">
            <table className="table table-vcenter card-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Unmatched</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td className="fw-semibold">{o.order_number}</td>
                    <td>{o.customer_name || <span className="text-muted">—</span>}</td>
                    <td>
                      {(o.unmatched || []).length ? (
                        <span className="badge bg-warning text-dark">{o.unmatched.length} unmatched</span>
                      ) : (
                        <span className="text-muted">0</span>
                      )}
                    </td>
                    <td className="text-end">
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => printAll(o.id)}
                        disabled={busyId === o.id}
                      >
                        {busyId === o.id ? 'Preparing…' : 'Print all'}
                      </button>
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-muted">No pending orders.</td>
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


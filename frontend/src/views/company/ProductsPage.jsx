import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../auth/AuthProvider.jsx'
import { apiJson } from '../../lib/api.js'

export function ProductsPage() {
  const { token, user } = useAuth()
  const isManager = user?.role === 'manager' || user?.is_platform_admin
  const [products, setProducts] = useState([])
  const [tags, setTags] = useState([])
  const [search, setSearch] = useState('')
  const [tagId, setTagId] = useState('')
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)

  const [newTagName, setNewTagName] = useState('')
  const [newTagColour, setNewTagColour] = useState('#206BC4')
  const [newProductName, setNewProductName] = useState('')
  const [newProductBrand, setNewProductBrand] = useState('')
  const [newProductDesc, setNewProductDesc] = useState('')

  const query = useMemo(() => {
    const q = new URLSearchParams()
    if (search.trim()) q.set('search', search.trim())
    if (tagId) q.set('tag_id', tagId)
    return q.toString()
  }, [search, tagId])

  async function refresh() {
    const [t, p] = await Promise.all([
      apiJson('/api/tags', { token }),
      apiJson(`/api/products${query ? `?${query}` : ''}`, { token }),
    ])
    setTags(Array.isArray(t) ? t : [])
    setProducts(Array.isArray(p) ? p : [])
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        await refresh()
      } catch (e) {
        if (!cancelled) setErr(e?.message || 'Failed to load products')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token, query])

  async function createTag(e) {
    e.preventDefault()
    if (!isManager) return
    setBusy(true)
    setErr(null)
    try {
      await apiJson('/api/tags', { method: 'POST', token, json: { name: newTagName.trim(), colour: newTagColour } })
      setNewTagName('')
      await refresh()
    } catch (e2) {
      setErr(e2?.message || 'Failed to create tag')
    } finally {
      setBusy(false)
    }
  }

  async function createProduct(e) {
    e.preventDefault()
    if (!isManager) return
    setBusy(true)
    setErr(null)
    try {
      await apiJson('/api/products', {
        method: 'POST',
        token,
        json: {
          name: newProductName.trim(),
          brand: newProductBrand,
          description: newProductDesc,
          tag_ids: tagId ? [tagId] : [],
        },
      })
      setNewProductName('')
      setNewProductBrand('')
      setNewProductDesc('')
      await refresh()
    } catch (e2) {
      setErr(e2?.message || 'Failed to create product')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page-body">
      <div className="container-xl">
        <div className="row align-items-center mb-3">
          <div className="col">
            <h2 className="mb-0">Products</h2>
            {!isManager && <div className="text-muted">Read-only (print operations role)</div>}
          </div>
        </div>

        {err && <div className="alert alert-danger">{err}</div>}

        <div className="row row-cards mb-3">
          <div className="col-12 col-lg-7">
            <div className="card">
              <div className="card-body">
                <div className="row g-2">
                  <div className="col-12 col-md-6">
                    <input
                      className="form-control"
                      placeholder="Search by name or brand…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <div className="col-12 col-md-6">
                    <select className="form-select" value={tagId} onChange={(e) => setTagId(e.target.value)}>
                      <option value="">All tags</option>
                      {tags.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {isManager && (
            <div className="col-12 col-lg-5">
              <div className="card">
                <div className="card-body">
                  <div className="row g-3">
                    <div className="col-12">
                      <form onSubmit={createTag}>
                        <div className="fw-semibold mb-2">New tag</div>
                        <div className="input-group">
                          <input className="form-control" placeholder="Tag name" value={newTagName} onChange={(e) => setNewTagName(e.target.value)} />
                          <input className="form-control form-control-color" type="color" value={newTagColour} onChange={(e) => setNewTagColour(e.target.value)} title="Tag colour" />
                          <button className="btn btn-outline-primary" disabled={busy || !newTagName.trim()}>Add</button>
                        </div>
                      </form>
                    </div>
                    <div className="col-12">
                      <form onSubmit={createProduct}>
                        <div className="fw-semibold mb-2">New product</div>
                        <input className="form-control mb-2" placeholder="Name" value={newProductName} onChange={(e) => setNewProductName(e.target.value)} />
                        <input className="form-control mb-2" placeholder="Brand" value={newProductBrand} onChange={(e) => setNewProductBrand(e.target.value)} />
                        <textarea className="form-control mb-2" placeholder="Description" rows={2} value={newProductDesc} onChange={(e) => setNewProductDesc(e.target.value)} />
                        <button className="btn btn-primary w-100" disabled={busy || !newProductName.trim()}>Create product</button>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <div className="table-responsive">
            <table className="table table-vcenter card-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Brand</th>
                  <th>Tags</th>
                  <th className="text-end">Variants</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td className="fw-semibold">{p.name}</td>
                    <td>{p.brand || <span className="text-muted">—</span>}</td>
                    <td>
                      {(p.tags || []).map((t) => (
                        <span key={t.id} className="badge me-1" style={{ background: t.colour, color: '#fff' }}>
                          {t.name}
                        </span>
                      ))}
                    </td>
                    <td className="text-end">{p.variant_count ?? 0}</td>
                  </tr>
                ))}
                {products.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-muted">No products found.</td>
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


import { useState, useEffect } from 'react';
import { Plus, Search, Filter, RefreshCcw, Package, MoreVertical, Edit3, Trash2 } from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface Product {
  id: string;
  name: string;
  description: string | null;
  brand: string | null;
  tags: { id: string; name: string; colour: string }[];
  variant_count: number;
}

export default function Products() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get<Product[]>('/products', { search });
      setProducts(data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const isManager = user?.role === 'manager' || user?.is_platform_admin;

  return (
    <>
      <div className="page-header d-print-none mb-4">
        <div className="row g-2 align-items-center">
          <div className="col">
            <div className="page-pretitle text-uppercase fw-bold text-muted small tracking-wider mb-1">Inventory</div>
            <h2 className="page-title h1 fw-black tracking-tight mb-0">Product Catalog</h2>
          </div>
          <div className="col-auto ms-auto">
            <div className="btn-list">
              <button onClick={fetchProducts} className="btn btn-white btn-icon rounded-circle shadow-sm border-0 transition-all hover-rotate-180" title="Refresh">
                <RefreshCcw size={18} className="text-muted" />
              </button>
              {isManager && (
                <button className="btn btn-primary d-inline-flex align-items-center gap-2 px-4 py-2 rounded-pill shadow-sm fw-bold">
                  <Plus size={18} />
                  Add Product
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="row g-2 mt-4">
          <div className="col-lg-9 col-md-8">
            <div className="input-icon shadow-sm rounded-3">
              <span className="input-icon-addon">
                <Search size={18} className="text-muted" />
              </span>
              <input
                type="text"
                className="form-control form-control-lg border-0 bg-white"
                placeholder="Search products by name, SKU or description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchProducts()}
              />
            </div>
          </div>
          <div className="col-lg-3 col-md-4">
            <div className="input-icon shadow-sm rounded-3">
              <span className="input-icon-addon">
                <Filter size={18} className="text-muted" />
              </span>
              <select className="form-select form-select-lg border-0 bg-white cursor-pointer">
                <option value="">All Categories</option>
                <option value="electronics">Electronics</option>
                <option value="apparel">Apparel</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="page-body">
        <div className="card border-0 shadow-sm rounded-3 overflow-hidden">
          <div className="table-responsive">
            <table className="table table-vcenter table-mobile-md card-table table-hover">
              <thead>
                <tr className="bg-light bg-opacity-50">
                  <th className="fw-bold small text-muted text-uppercase tracking-wider py-3">Product Details</th>
                  <th className="fw-bold small text-muted text-uppercase tracking-wider py-3">Brand</th>
                  <th className="fw-bold small text-muted text-uppercase tracking-wider py-3">Tags</th>
                  <th className="fw-bold small text-muted text-uppercase tracking-wider py-3 text-center">Variants</th>
                  {isManager && <th className="w-1 py-3"></th>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8">
                       <div className="spinner-border text-primary" role="status"></div>
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8">
                      <div className="empty p-0">
                        <div className="empty-img mb-3 opacity-20">
                          <Package size={64} />
                        </div>
                        <p className="empty-title text-muted fw-bold h3">No products found</p>
                        <p className="empty-subtitle text-muted">Try adjusting your search or filters to find what you're looking for.</p>
                        {isManager && (
                          <div className="empty-action">
                            <button className="btn btn-primary rounded-pill px-4 shadow-sm fw-bold">
                              <Plus size={18} className="me-2" /> Create First Product
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  products.map(product => (
                    <tr key={product.id} className="transition-all">
                      <td data-label="Product" className="py-3">
                        <div className="d-flex align-items-center">
                          <span className="avatar avatar-md rounded bg-blue-lt me-3 fw-bold text-primary shadow-sm">
                            {product.name[0].toUpperCase()}
                          </span>
                          <div>
                            <div className="fw-bold text-dark h4 mb-0">{product.name}</div>
                            <div className="text-muted small text-truncate" style={{ maxWidth: '300px' }}>{product.description || 'No description provided'}</div>
                          </div>
                        </div>
                      </td>
                      <td data-label="Brand" className="py-3">
                        <span className="fw-medium text-muted">{product.brand || 'Generic'}</span>
                      </td>
                      <td data-label="Tags" className="py-3">
                        <div className="d-flex flex-wrap gap-1">
                          {product.tags.length > 0 ? product.tags.map(tag => (
                            <span
                              key={tag.id}
                              className="badge rounded-pill px-2 py-1 small fw-bold"
                              style={{ backgroundColor: `${tag.colour}22`, color: tag.colour, border: `1px solid ${tag.colour}44` }}
                            >
                              {tag.name}
                            </span>
                          )) : <span className="text-muted opacity-50 small">Uncategorized</span>}
                        </div>
                      </td>
                      <td data-label="Variants" className="text-center py-3">
                        <span className="badge bg-blue-lt rounded-pill px-3 py-1 fw-bold">{product.variant_count} items</span>
                      </td>
                      {isManager && (
                        <td className="text-end py-3">
                          <div className="dropdown">
                            <button className="btn btn-ghost-secondary btn-icon btn-sm rounded-circle border-0 shadow-none" data-bs-toggle="dropdown">
                               <MoreVertical size={18} />
                            </button>
                            <div className="dropdown-menu dropdown-menu-end shadow-lg border-0 rounded-3">
                               <button className="dropdown-item d-flex align-items-center gap-2 py-2">
                                  <Edit3 size={16} className="text-primary" /> Edit Product
                               </button>
                               <button className="dropdown-item d-flex align-items-center gap-2 py-2 text-danger">
                                  <Trash2 size={16} /> Delete Product
                               </button>
                            </div>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <style>{`
        .fw-black { font-weight: 900; }
        .ls-wider { letter-spacing: 0.05em; }
        .tracking-wider { letter-spacing: 0.05em; }
        .tracking-tight { letter-spacing: -0.025em; }
        .bg-blue-lt { background-color: rgba(32, 107, 196, 0.1) !important; }
        .hover-rotate-180:hover svg { transform: rotate(180deg); }
        .transition-all { transition: all 0.3s ease; }
        tr:hover { background-color: rgba(32, 107, 196, 0.02) !important; }
      `}</style>
    </>
  );
}

import { useState, useEffect } from 'react';
import { Plus, Search, Filter, RefreshCcw } from 'lucide-react';
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
      <div className="page-header d-print-none text-white">
        <div className="container-xl">
          <div className="row g-2 align-items-center">
            <div className="col">
              <h2 className="page-title">Product Catalog</h2>
              <div className="text-muted mt-1">Manage and search your product database</div>
            </div>
            <div className="col-auto ms-auto d-print-none">
              <div className="btn-list">
                <button onClick={fetchProducts} className="btn btn-icon btn-ghost-light">
                  <RefreshCcw size={18} />
                </button>
                {isManager && (
                  <button className="btn btn-primary d-none d-sm-inline-block">
                    <Plus size={18} className="me-2" />
                    New product
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="row g-2 mt-3">
            <div className="col-md-10">
              <div className="input-icon">
                <span className="input-icon-addon">
                  <Search size={18} />
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search products..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchProducts()}
                />
              </div>
            </div>
            <div className="col-md-2">
              <div className="input-icon">
                <span className="input-icon-addon">
                  <Filter size={18} />
                </span>
                <select className="form-select">
                  <option value="">All Tags</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="page-body">
        <div className="container-xl">
          <div className="card shadow-sm border-0">
            <div className="table-responsive">
              <table className="table table-vcenter table-mobile-md card-table">
                <thead>
                  <tr>
                    <th>Product Name</th>
                    <th>Brand</th>
                    <th>Tags</th>
                    <th>Variants</th>
                    {isManager && <th className="w-1"></th>}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={5} className="text-center py-4 text-muted">Loading...</td></tr>
                  ) : products.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-4 text-muted">No products found.</td></tr>
                  ) : (
                    products.map(product => (
                      <tr key={product.id}>
                        <td data-label="Name">
                          <div className="font-weight-medium">{product.name}</div>
                          <div className="text-muted small">{product.description || 'No description'}</div>
                        </td>
                        <td data-label="Brand" className="text-muted">{product.brand || '-'}</td>
                        <td data-label="Tags">
                          {product.tags.map(tag => (
                            <span
                              key={tag.id}
                              className="badge me-1"
                              style={{ backgroundColor: tag.colour, opacity: 0.8 }}
                            >
                              {tag.name}
                            </span>
                          ))}
                        </td>
                        <td data-label="Variants" className="text-muted">{product.variant_count}</td>
                        {isManager && (
                          <td>
                            <div className="btn-list flex-nowrap">
                              <button className="btn btn-ghost-primary btn-sm">Edit</button>
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
      </div>
    </>
  );
}

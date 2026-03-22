import { useEffect, useState } from 'react';
import { Plus, RefreshCcw, Search } from 'lucide-react';
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
  const [tags, setTags] = useState<{ id: string; name: string; colour: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get<Product[]>('/products', search ? { search } : undefined);
      setProducts(data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  const fetchTags = async () => {
    try {
      const data = await apiClient.get<{ id: string; name: string; colour: string }[]>('/tags');
      setTags(data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch tags');
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchTags();
  }, []);

  const openModal = (product: Product | null = null) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedProduct(null);
  };

  const handleSave = async (productData: any) => {
    try {
      if (selectedProduct) {
        await apiClient.put(`/products/${selectedProduct.id}`, productData);
        toast.success('Product updated successfully');
      } else {
        await apiClient.post('/products', productData);
        toast.success('Product created successfully');
      }
      fetchProducts();
      closeModal();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save product');
    }
  };

  const handleDelete = async (productId: string) => {
    if (window.confirm('Are you sure you want to delete this product? This will also delete all its variants.')) {
      try {
        await apiClient.delete(`/products/${productId}`);
        toast.success('Product deleted successfully');
        fetchProducts();
      } catch (err: any) {
        toast.error(err.message || 'Failed to delete product');
      }
    }
  };

  const isManager = user?.role === 'manager' || user?.is_platform_admin;

  return (
    <div className="mock-page">
      <div className="mock-page__grid">
        <div className="mock-page__main">
          <section className="mock-surface">
            <div className="mock-surface__header">
              <div>
                <h2>Catalog Search</h2>
                <p>Search by product or brand, then move directly into variant editing or print prep.</p>
              </div>
              <div className="mock-toolbar">
                <button type="button" onClick={fetchProducts} className="mock-toolbar-button">
                  <RefreshCcw size={15} />
                  Refresh
                </button>
                {isManager ? (
                  <button type="button" className="mock-action-solid" onClick={() => openModal()}>
                    <Plus size={14} />
                    Add Product
                  </button>
                ) : null}
              </div>
            </div>
            <div className="mock-surface--padded">
              <label className="mock-searchbar">
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Search by product name or brand"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') fetchProducts();
                  }}
                />
              </label>
            </div>
          </section>

          <section className="mock-feed-card">
            <div className="mock-feed-card__header">
              <div>
                <h2>Products and Variants</h2>
                <p>Keep the catalog dense and readable without dropping back to the old oversized admin layout.</p>
              </div>
              <div className="mock-auto-pill">
                <span className="mock-auto-pill__dot" />
                {products.length} in view
              </div>
            </div>

            {loading ? (
              <div className="mock-empty-state">
                <strong>Loading catalog</strong>
                <p>Fetching products for the current organization.</p>
              </div>
            ) : products.length === 0 ? (
              <div className="mock-empty-state">
                <strong>No products matched this view</strong>
                <p>Try a broader search term or create the first product for this organization.</p>
              </div>
            ) : (
              <div className="mock-table-wrap">
                <table className="mock-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Brand</th>
                      <th>Tags</th>
                      <th>Variants</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => (
                      <tr key={product.id}>
                        <td>
                          <strong>{product.name}</strong>
                          <p>{product.description || 'No description written yet.'}</p>
                        </td>
                        <td>
                          <strong>{product.brand || 'Unassigned brand'}</strong>
                          <p>Catalog grouping</p>
                        </td>
                        <td>
                          <div className="mock-list-row__chips">
                            {product.tags.length > 0 ? (
                              product.tags.map((tag) => (
                                <span key={tag.id} className="mock-chip" style={{ background: `${tag.colour}22`, color: tag.colour }}>
                                  {tag.name}
                                </span>
                              ))
                            ) : (
                              <span className="mock-chip">No tags</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <strong>{product.variant_count}</strong>
                          <p>Printable variants</p>
                        </td>
                        <td>
                          <div className="mock-list-row__actions">
                              <button type="button" className="mock-toolbar-button" onClick={() => openModal(product)}>Edit</button>
                              <button type="button" className="mock-toolbar-button mock-toolbar-button--danger" onClick={() => handleDelete(product.id)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <aside className="mock-page__rail">
          <section className="mock-rail-card">
            <div className="mock-rail-card__header">
              <strong>Catalog Summary</strong>
            </div>
            <div className="mock-stat-grid">
              <div className="mock-stat-tile">
                <strong>{products.length}</strong>
                <span>Products in view</span>
              </div>
              <div className="mock-stat-tile">
                <strong>{products.reduce((sum, product) => sum + product.variant_count, 0)}</strong>
                <span>Total variants</span>
              </div>
            </div>
          </section>

          <section className="mock-rail-card">
            <div className="mock-rail-card__header">
              <strong>Next Workflow</strong>
            </div>
            <div className="mock-meta-list">
              <div>
                <strong>Barcode scanning</strong>
                <span>Fast product capture can land here without changing the shell.</span>
              </div>
              <div>
                <strong>Variant editing</strong>
                <span>Keep SKU mapping, tags, and pricing in one calmer surface.</span>
              </div>
            </div>
          </section>
        </aside>
      </div>

      {isModalOpen && (
        <ProductForm
          product={selectedProduct}
          availableTags={tags}
          onSave={handleSave}
          onClose={closeModal}
        />
      )}
    </div>
  );
}

// ─── Sub-component for the Product Form ───────────────────────────────────────

interface ProductFormProps {
  product: Product | null;
  availableTags: { id: string; name: string; colour: string }[];
  onSave: (productData: any) => void;
  onClose: () => void;
}

function ProductForm({ product, availableTags, onSave, onClose }: ProductFormProps) {
  const [formData, setFormData] = useState({
    name: product?.name || '',
    brand: product?.brand || '',
    description: product?.description || '',
    tag_ids: product?.tags.map(t => t.id) || [],
  });

  const handleTagChange = (tagId: string) => {
    setFormData(prev => {
      const newTagIds = prev.tag_ids.includes(tagId)
        ? prev.tag_ids.filter(id => id !== tagId)
        : [...prev.tag_ids, tagId];
      return { ...prev, tag_ids: newTagIds };
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="mock-modal-overlay">
      <div className="mock-modal" style={{ maxWidth: '600px' }}>
        <div className="mock-modal__header">
          <h2>{product ? 'Edit Product' : 'Create Product'}</h2>
          <p>Define the core product details and assign tags.</p>
        </div>
        <form onSubmit={handleSubmit} className="mock-modal__body">
          <div className="mock-form-group">
            <label htmlFor="name">Product Name</label>
            <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} required />
          </div>
          <div className="mock-form-group">
            <label htmlFor="brand">Brand</label>
            <input type="text" id="brand" name="brand" value={formData.brand} onChange={handleChange} />
          </div>
          <div className="mock-form-group">
            <label htmlFor="description">Description</label>
            <textarea id="description" name="description" value={formData.description} onChange={handleChange} rows={3}></textarea>
          </div>

          <div className="mock-form-group">
            <label>Tags</label>
            <div className="mock-checkbox-grid">
              {availableTags.map(tag => (
                <div key={tag.id} className="mock-checkbox-item">
                  <input
                    type="checkbox"
                    id={`tag-${tag.id}`}
                    name="tag_ids"
                    value={tag.id}
                    checked={formData.tag_ids.includes(tag.id)}
                    onChange={() => handleTagChange(tag.id)}
                  />
                  <label htmlFor={`tag-${tag.id}`} style={{ background: `${tag.colour}22`, color: tag.colour, borderColor: tag.colour }}>{tag.name}</label>
                </div>
              ))}
            </div>
          </div>

          <div className="mock-modal__footer">
            <button type="button" className="mock-toolbar-button" onClick={onClose}>Cancel</button>
            <button type="submit" className="mock-action-solid">Save Product</button>
          </div>
        </form>
      </div>
    </div>
  );
}

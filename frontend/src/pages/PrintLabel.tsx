import { useState, useEffect } from 'react';
import { Printer, Search, Package, Check } from 'lucide-react';
import { apiClient } from '../api/client';
import toast from 'react-hot-toast';

interface Product {
  id: string;
  name: string;
  brand: string | null;
  variants: Variant[];
}

interface Variant {
  id: string;
  sku: string;
  barcode: string | null;
}

export default function PrintLabel() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [labelType, setLabelType] = useState<number>(1);
  const [quantity, setQuantity] = useState<number>(1);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    apiClient.get<Product[]>('/products')
      .then(setProducts)
      .finally(() => setLoading(false));
  }, []);

  const handlePrint = async () => {
    if (!selectedVariantId) {
      toast.error('Please select a variant');
      return;
    }

    setPrinting(true);
    try {
      const result = await apiClient.post<{ blob: Blob, jobId: string }>('/print/render', {
        variant_id: selectedVariantId,
        label_type: labelType,
        quantity: quantity,
      });

      // Auto-confirm for this UI flow
      await apiClient.post(`/print/${result.jobId}/confirm`);

      toast.success('Label sent to print queue');
    } catch (err: any) {
      toast.error(err.message || 'Print failed');
    } finally {
      setPrinting(false);
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.brand?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="page-header d-print-none text-white">
        <div className="container-xl">
          <div className="row g-2 align-items-center">
            <div className="col">
              <h2 className="page-title">Print Label</h2>
              <div className="text-muted mt-1">Create a new on-demand print job</div>
            </div>
          </div>
        </div>
      </div>
      <div className="page-body">
        <div className="container-xl">
          <div className="row row-cards">
            <div className="col-md-7">
              <div className="card shadow-sm border-0">
                <div className="card-header border-0 bg-transparent">
                  <h3 className="card-title">1. Select Product</h3>
                </div>
                <div className="card-body border-bottom py-3">
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
                    />
                  </div>
                </div>
                <div className="list-group list-group-flush overflow-auto" style={{ maxHeight: '400px' }}>
                  {loading ? (
                    <div className="p-4 text-center">Loading...</div>
                  ) : filteredProducts.map(product => (
                    <button
                      key={product.id}
                      className={`list-group-item list-group-item-action text-start ${selectedProduct?.id === product.id ? 'active bg-blue-50' : ''}`}
                      onClick={() => {
                        setSelectedProduct(product);
                        setSelectedVariantId(product.variants[0]?.id || '');
                      }}
                    >
                      <div className="row align-items-center">
                        <div className="col-auto">
                           <Package size={20} className="text-muted" />
                        </div>
                        <div className="col text-truncate">
                          <div className="text-reset d-block font-weight-medium">{product.name}</div>
                          <div className="text-muted small mt-n1">{product.brand || 'No brand'}</div>
                        </div>
                        {selectedProduct?.id === product.id && (
                          <div className="col-auto text-primary">
                            <Check size={20} />
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="col-md-5">
              <div className="card shadow-sm border-0">
                <div className="card-header border-0 bg-transparent">
                  <h3 className="card-title">2. Label Options</h3>
                </div>
                <div className="card-body">
                  <div className="mb-3">
                    <label className="form-label">Variant</label>
                    <div className="form-selectgroup form-selectgroup-boxes d-flex flex-column">
                      {selectedProduct ? selectedProduct.variants.map(v => (
                        <label className="form-selectgroup-item flex-fill" key={v.id}>
                          <input
                            type="radio"
                            name="variant"
                            value={v.id}
                            className="form-selectgroup-input"
                            checked={selectedVariantId === v.id}
                            onChange={() => setSelectedVariantId(v.id)}
                          />
                          <div className="form-selectgroup-label d-flex align-items-center p-3">
                            <div className="me-3">
                              <span className="form-selectgroup-check"></span>
                            </div>
                            <div>
                                <div className="font-weight-medium">{v.sku}</div>
                                <div className="text-muted small">{v.barcode || 'No barcode'}</div>
                            </div>
                          </div>
                        </label>
                      )) : (
                        <div className="text-muted small italic">Select a product first</div>
                      )}
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Label Type</label>
                    <select className="form-select" value={labelType} onChange={(e) => setLabelType(Number(e.target.value))}>
                      <option value={1}>Shelf Label (Standard)</option>
                      <option value={2}>Info Label (Text only)</option>
                      <option value={3}>Product Info (Detailed)</option>
                      <option value={4}>Title Label (Large)</option>
                    </select>
                  </div>

                  <div className="mb-4">
                    <label className="form-label">Quantity</label>
                    <input
                      type="number"
                      className="form-control"
                      min={1}
                      max={100}
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                    />
                  </div>

                  <button
                    className="btn btn-primary w-100 py-2"
                    disabled={!selectedVariantId || printing}
                    onClick={handlePrint}
                  >
                    <Printer size={18} className="me-2" />
                    {printing ? 'Processing...' : 'Print Label Now'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

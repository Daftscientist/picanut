import { useState, useEffect } from 'react';
import { Printer, Search, Package, Check, ChevronRight, Settings2, Info } from 'lucide-react';
import { apiClient } from '../api/client';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';

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
      <div className="page-header d-print-none mb-4">
        <div className="row g-2 align-items-center">
          <div className="col">
            <div className="page-pretitle text-uppercase fw-bold text-muted small tracking-wider mb-1">Operations</div>
            <h2 className="page-title h1 fw-black tracking-tight mb-0">Print Label</h2>
          </div>
        </div>
      </div>

      <div className="page-body">
        <div className="row row-cards g-4">
          {/* Step 1: Product Selection */}
          <div className="col-lg-7">
            <div className="card border-0 shadow-sm rounded-3 h-100 overflow-hidden">
              <div className="card-header border-bottom bg-transparent py-3 d-flex align-items-center gap-2">
                <div className="bg-primary bg-opacity-10 p-2 rounded text-primary">
                   <Package size={18} />
                </div>
                <h3 className="card-title fw-bold mb-0">1. Select Product</h3>
              </div>
              <div className="card-body bg-light bg-opacity-50 py-3">
                <div className="input-icon shadow-sm rounded-3">
                  <span className="input-icon-addon">
                    <Search size={18} className="text-muted" />
                  </span>
                  <input
                    type="text"
                    className="form-control form-control-lg border-0 bg-white"
                    placeholder="Search products by name or brand..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="list-group list-group-flush overflow-auto custom-scrollbar" style={{ maxHeight: '500px' }}>
                {loading ? (
                  <div className="p-5 text-center">
                     <div className="spinner-border text-primary mb-3" role="status"></div>
                     <div className="text-muted small fw-medium">Loading products...</div>
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="p-5 text-center text-muted">
                    <Info size={32} className="opacity-20 mb-2" />
                    <div>No products found matching your search.</div>
                  </div>
                ) : filteredProducts.map(product => (
                  <button
                    key={product.id}
                    className={clsx(
                        "list-group-item list-group-item-action border-0 px-4 py-3 transition-all",
                        selectedProduct?.id === product.id ? "bg-primary bg-opacity-10 active" : "hover-bg-light"
                    )}
                    onClick={() => {
                      setSelectedProduct(product);
                      setSelectedVariantId(product.variants[0]?.id || '');
                    }}
                  >
                    <div className="row align-items-center">
                      <div className="col-auto">
                         <div className={clsx(
                             "avatar avatar-md rounded shadow-sm fw-bold",
                             selectedProduct?.id === product.id ? "bg-primary text-white" : "bg-white text-muted border"
                         )}>
                            {product.name[0].toUpperCase()}
                         </div>
                      </div>
                      <div className="col text-truncate">
                        <div className={clsx(
                            "h4 mb-0 fw-bold",
                            selectedProduct?.id === product.id ? "text-primary" : "text-dark"
                        )}>{product.name}</div>
                        <div className="text-muted small">{product.brand || 'No brand specified'}</div>
                      </div>
                      <div className="col-auto">
                        {selectedProduct?.id === product.id ? (
                          <div className="bg-primary rounded-circle p-1 text-white d-flex shadow-sm">
                            <Check size={16} />
                          </div>
                        ) : (
                          <ChevronRight size={18} className="text-muted opacity-50" />
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Step 2: Print Options */}
          <div className="col-lg-5">
            <div className="card border-0 shadow-sm rounded-3 h-100 overflow-hidden">
              <div className="card-header border-bottom bg-transparent py-3 d-flex align-items-center gap-2">
                 <div className="bg-primary bg-opacity-10 p-2 rounded text-primary">
                    <Settings2 size={18} />
                 </div>
                 <h3 className="card-title fw-bold mb-0">2. Configure Print</h3>
              </div>
              <div className="card-body p-4 p-md-5">
                {!selectedProduct ? (
                  <div className="empty p-0 h-100 d-flex flex-column align-items-center justify-content-center text-center py-8">
                    <div className="empty-img mb-3 opacity-20">
                      <Printer size={64} />
                    </div>
                    <p className="empty-title text-muted fw-bold">No product selected</p>
                    <p className="empty-subtitle text-muted small">Select a product from the list on the left to configure label options.</p>
                  </div>
                ) : (
                  <>
                    <div className="mb-4">
                      <label className="form-label fw-bold text-muted small text-uppercase ls-wider mb-2">Variant / SKU</label>
                      <div className="form-selectgroup form-selectgroup-boxes d-flex flex-column gap-2">
                        {selectedProduct.variants.map(v => (
                          <label className="form-selectgroup-item flex-fill m-0" key={v.id}>
                            <input
                              type="radio"
                              name="variant"
                              value={v.id}
                              className="form-selectgroup-input"
                              checked={selectedVariantId === v.id}
                              onChange={() => setSelectedVariantId(v.id)}
                            />
                            <div className="form-selectgroup-label d-flex align-items-center p-3 rounded-3 border-2 transition-all">
                              <div className="me-3">
                                <span className="form-selectgroup-check"></span>
                              </div>
                              <div className="text-start">
                                  <div className="fw-bold text-dark">{v.sku}</div>
                                  <div className="text-muted small tracking-tight">{v.barcode || 'Manual Entry Only'}</div>
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="form-label fw-bold text-muted small text-uppercase ls-wider mb-2">Label Template</label>
                      <select className="form-select form-select-lg border-2" value={labelType} onChange={(e) => setLabelType(Number(e.target.value))}>
                        <option value={1}>Shelf Edge (Standard)</option>
                        <option value={2}>Product Information (Detailed)</option>
                        <option value={3}>Warehouse Barcode (Small)</option>
                        <option value={4}>Shipping Title (Large)</option>
                      </select>
                    </div>

                    <div className="mb-5">
                      <label className="form-label fw-bold text-muted small text-uppercase ls-wider mb-2">Quantity</label>
                      <div className="input-group input-group-lg shadow-sm rounded-3 overflow-hidden border-2">
                         <button className="btn btn-white border-0 px-3" onClick={() => setQuantity(Math.max(1, quantity - 1))}>-</button>
                         <input
                           type="number"
                           className="form-control text-center border-0 fw-bold"
                           min={1}
                           max={100}
                           value={quantity}
                           onChange={(e) => setQuantity(Number(e.target.value))}
                         />
                         <button className="btn btn-white border-0 px-3" onClick={() => setQuantity(Math.min(100, quantity + 1))}>+</button>
                      </div>
                      <div className="form-hint mt-2 text-muted small">Max 100 labels per job.</div>
                    </div>

                    <button
                      className="btn btn-primary btn-lg w-100 py-3 rounded-pill shadow-lg fw-bold transform hover-scale-105 transition-all d-flex align-items-center justify-content-center gap-3"
                      disabled={!selectedVariantId || printing}
                      onClick={handlePrint}
                    >
                      {printing ? (
                        <>
                          <div className="spinner-border spinner-border-sm" role="status"></div>
                          Rendering...
                        </>
                      ) : (
                        <>
                          <Printer size={20} />
                          Print {quantity} Label{quantity > 1 ? 's' : ''}
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .fw-black { font-weight: 900; }
        .ls-wider { letter-spacing: 0.05em; }
        .tracking-tight { letter-spacing: -0.015em; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }
        .hover-bg-light:hover { background-color: rgba(0,0,0,0.02) !important; }
        .form-selectgroup-label { background-color: white; }
        .form-selectgroup-input:checked + .form-selectgroup-label {
            background-color: rgba(32, 107, 196, 0.05);
            border-color: #206bc4 !important;
        }
        .hover-scale-105:hover { transform: scale(1.02); }
        .transition-all { transition: all 0.2s ease; }
      `}</style>
    </>
  );
}

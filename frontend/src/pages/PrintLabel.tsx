import { useEffect, useMemo, useState } from 'react';
import { Printer, Search } from 'lucide-react';
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
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [labelType, setLabelType] = useState(1);
  const [quantity, setQuantity] = useState(1);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    apiClient
      .get<Product[]>('/products')
      .then(setProducts)
      .finally(() => setLoading(false));
  }, []);

  const filteredProducts = useMemo(
    () =>
      products.filter(
        (product) =>
          product.name.toLowerCase().includes(search.toLowerCase()) ||
          product.brand?.toLowerCase().includes(search.toLowerCase()),
      ),
    [products, search],
  );

  const handlePrint = async () => {
    if (!selectedVariantId) {
      toast.error('Please select a variant');
      return;
    }

    setPrinting(true);
    try {
      // Step 1: Render the label to get raster bytes
      const renderResult = await apiClient.post<{ blob: Blob; jobId: string }>('/print/render', {
        variant_id: selectedVariantId,
        label_type: labelType,
        quantity,
      });

      if (!renderResult.jobId) {
        throw new Error('Render job ID not received.');
      }

      // Step 2: Dispatch the raster bytes to the print agent
      // The apiClient is set up to handle Blob as body and will add X-Job-Id header
      await apiClient.post('/print/dispatch', renderResult.blob, { 'X-Job-Id': renderResult.jobId });
      
      // Step 3: Confirm the print job
      await apiClient.post(`/print/${renderResult.jobId}/confirm`);
      
      toast.success('Label sent to print queue');
    } catch (err: any) {
      toast.error(err.message || 'Print failed');
    } finally {
      setPrinting(false);
    }
  };

  return (
    <div className="mock-page">
      <div className="mock-page__grid">
        <div className="mock-page__main">
          <section className="mock-surface">
            <div className="mock-surface__header">
              <div>
                <h2>Prepare and Print Labels</h2>
                <p>Choose a product, pick the right variant, and send labels into the queue with enough context to avoid mistakes.</p>
              </div>
              <button type="button" className="mock-action-solid" onClick={handlePrint} disabled={!selectedVariantId || printing}>
                <Printer size={14} />
                {printing ? 'Printing…' : `Print ${quantity} Label${quantity === 1 ? '' : 's'}`}
              </button>
            </div>
          </section>

          <section className="mock-surface">
            <div className="mock-surface__header">
              <div>
                <h2>Catalog Search</h2>
                <p>Find a product and move directly into variant-level print setup.</p>
              </div>
            </div>
            <div className="mock-surface--padded">
              <label className="mock-searchbar">
                <Search size={16} />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products" />
              </label>

              <div className="mock-list" style={{ marginTop: '1rem', maxHeight: 420, overflow: 'auto' }}>
                {loading ? (
                  <div className="mock-empty-state">
                    <strong>Loading products</strong>
                    <p>Fetching the product catalog for print selection.</p>
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="mock-empty-state">
                    <strong>Nothing matched</strong>
                    <p>Try another search term or broaden the catalog query.</p>
                  </div>
                ) : (
                  filteredProducts.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      className="mock-list-row"
                      onClick={() => {
                        setSelectedProduct(product);
                        setSelectedVariantId(product.variants[0]?.id || '');
                      }}
                      style={{
                        border: selectedProduct?.id === product.id ? '1px solid rgba(0, 53, 31, 0.18)' : undefined,
                        textAlign: 'left',
                        background: selectedProduct?.id === product.id ? '#f2f7f4' : undefined,
                      }}
                    >
                      <div className="mock-list-row__main">
                        <strong>{product.name}</strong>
                        <span>{product.brand || 'Unassigned brand'} · {product.variants.length} variants</span>
                      </div>
                      <span className={selectedProduct?.id === product.id ? 'mock-status mock-status--success' : 'mock-status mock-status--neutral'}>
                        {selectedProduct?.id === product.id ? 'Selected' : 'Open'}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </section>
        </div>

        <aside className="mock-page__rail">
          <section className="mock-rail-card">
            <div className="mock-rail-card__header">
              <strong>{selectedProduct ? selectedProduct.name : 'Choose a Product'}</strong>
            </div>
            {!selectedProduct ? (
              <div className="mock-meta-list">
                <div>
                  <strong>No product selected</strong>
                  <span>Use the left panel to choose a product before configuring the print job.</span>
                </div>
              </div>
            ) : (
              <div className="mock-meta-list">
                <label className="canopy-field">
                  <span>Variant</span>
                  <select value={selectedVariantId} onChange={(event) => setSelectedVariantId(event.target.value)}>
                    {selectedProduct.variants.map((variant) => (
                      <option key={variant.id} value={variant.id}>
                        {variant.sku} {variant.barcode ? `· ${variant.barcode}` : ''}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="canopy-field">
                  <span>Template</span>
                  <select value={labelType} onChange={(event) => setLabelType(Number(event.target.value))}>
                    <option value={1}>Shelf Edge</option>
                    <option value={2}>Product Information</option>
                    <option value={3}>Warehouse Barcode</option>
                    <option value={4}>Shipping Title</option>
                  </select>
                </label>
                <label className="canopy-field">
                  <span>Quantity</span>
                  <input
                    className="canopy-input--plain"
                    type="number"
                    min={1}
                    max={100}
                    value={quantity}
                    onChange={(event) => setQuantity(Number(event.target.value))}
                  />
                </label>
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

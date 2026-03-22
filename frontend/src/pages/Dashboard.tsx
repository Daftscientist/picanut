import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import toast from 'react-hot-toast'; // Import toast for messages
import { Printer } from 'lucide-react'; // Import Printer icon

interface BillingStatus {
  usage: {
    quota: { used: number; limit: number };
  };
}

interface OrderItem {
  name?: string;
  sku?: string;
  quantity?: number;
}

interface OrderJob {
  id: string;
  quantity: number;
  status: string;
  sku?: string | null;
  product_name?: string | null;
}

interface PendingOrder {
  id: string;
  order_number: string;
  customer_name: string;
  status: string; // The backend should return the actual status
  imported_at: string;
  platform?: string; // e.g., 'WooCommerce', 'Shopify'
  unmatched: OrderItem[];
  items: OrderItem[];
  jobs: OrderJob[];
}

// Helper functions (copied from Orders.tsx)
function formatPlatform(order: PendingOrder) {
  return order.platform || 'WooCommerce'; // Default to WooCommerce if not specified
}

function formatImportedAt(value: string) {
  const date = new Date(value);
  return {
    date: date.toLocaleDateString(),
    time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
}

function summarizeItems(items: OrderItem[]) {
  if (items.length === 0) return 'No line items available';
  return items
    .map((item) => `${item.quantity || 1}x ${item.name || item.sku || 'Unmapped item'}`)
    .join(', ');
}


export default function Dashboard() {
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [orders, setOrders] = useState<PendingOrder[]>([]); // Use PendingOrder interface
  const [printingOrderId, setPrintingOrderId] = useState<string | null>(null); // For print loading state

  const fetchDashboardData = async () => {
    // Fetch billing status and pending orders in parallel
    const [billingData, orderData] = await Promise.all([
      apiClient.get<BillingStatus>('/billing/status').catch(() => null),
      apiClient.get<PendingOrder[]>('/print/orders/pending').catch(() => []), // Fetch real orders
    ]);
    setBilling(billingData);
    setOrders(orderData || []); // Ensure orders is an array
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const quotaUsed = billing?.usage.quota.used ?? 0;
  const quotaLimit = billing?.usage.quota.limit ?? 0;
  const quotaPercent = quotaLimit > 0 ? Math.min(100, Math.round((quotaUsed / quotaLimit) * 100)) : 85;

  const handlePrintAll = async (order: PendingOrder) => {
    setPrintingOrderId(order.id);
    try {
      // Step 1: Call the backend endpoint to get raster bytes for all jobs in the order
      // We expect the backend to return X-Job-Ids in headers for multiple jobs
      const result = await apiClient.post<{ blob: Blob; jobId: string }>(`/print/orders/${order.id}/print-all`);
      
      const jobIds = (result.jobId || '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);

      if (jobIds.length === 0) {
        throw new Error('No printable jobs were returned for this order');
      }

      // Step 2: Dispatch the combined raster bytes to the print agent
      await apiClient.post('/api/print/dispatch', result.blob, { 'X-Job-Ids': result.jobId });
      
      // Step 3: Confirm all print jobs associated with the order
      // The backend /print/orders/{order_id}/print-all already marks jobs as printed
      // so this loop is not necessary if backend handles it
      // if not, then: await Promise.all(jobIds.map((jobId) => apiClient.post(`/print/${jobId}/confirm`)));

      toast.success(`Printed ${order.order_number}`);
      await fetchDashboardData(); // Refresh orders after printing
    } catch (err: any) {
      toast.error(err.message || 'Failed to print order');
    } finally {
      setPrintingOrderId(null);
    }
  };

  return (
    <div className="mock-dashboard">
      <div className="mock-dashboard__grid">
        <div className="mock-dashboard__main">
          <section className="mock-section">
            <h2 className="mock-section__title">Quick Action Hub</h2>
            <div className="mock-quick-grid">
              <button type="button" className="mock-quick-card">
                <div className="mock-quick-card__icon">
                  <span className="material-symbols-outlined">document_scanner</span>
                </div>
                <div className="mock-quick-card__copy">
                  <p>Scan New Product</p>
                  <span>Update local inventory</span>
                </div>
              </button>

              <button type="button" className="mock-quick-card">
                <div className="mock-quick-card__split">
                  <div className="mock-quick-card__icon">
                    <span className="material-symbols-outlined">print</span>
                  </div>
                  <span className="mock-percent-badge">{quotaPercent}%</span>
                </div>
                <div className="mock-quick-card__copy mock-quick-card__copy--wide">
                  <p>Print Quota</p>
                  <div className="mock-progress">
                    <div className="mock-progress__bar" style={{ width: `${quotaPercent}%` }} />
                  </div>
                </div>
              </button>

              <button type="button" className="mock-quick-card">
                <div className="mock-quick-card__icon">
                  <span className="material-symbols-outlined">account_tree</span>
                </div>
                <div className="mock-quick-card__copy">
                  <p>Manage Variants</p>
                  <span>Configure SKU mapping</span>
                </div>
              </button>
            </div>
          </section>

          <section className="mock-feed-card">
            <div className="mock-feed-card__header">
              <div>
                <h2>Order Fulfillment Feed</h2>
                <p>Real-time sync with Shopify &amp; WooCommerce</p>
              </div>
              <div className="mock-auto-pill">
                <span className="mock-auto-pill__dot" />
                Auto-print Enabled
              </div>
            </div>

            <div className="mock-table-wrap">
              <table className="mock-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Platform</th>
                    <th>Items</th>
                    <th>Status</th>
                    <th className="mock-table__align-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 3).map((order) => { // Use real orders, limit to 3
                    const importedAt = formatImportedAt(order.imported_at);
                    const requiresAttention = order.unmatched.length > 0 || order.jobs.length === 0;
                    const actionDisabled = requiresAttention || printingOrderId === order.id;

                    return (
                      <tr key={order.id}>
                        <td>
                          <strong>#{order.order_number}</strong>
                          <p>{formatPlatform(order)} · {importedAt.date} {importedAt.time}</p>
                        </td>
                        <td>
                          <div className="mock-platform">
                            <span className={`material-symbols-outlined ${order.platform === 'WooCommerce' ? 'mock-platform__icon mock-platform__icon--woo' : 'mock-platform__icon mock-platform__icon--shopify'}`}>
                              {order.platform === 'WooCommerce' ? 'storefront' : 'shopping_bag'}
                            </span>
                            {order.platform || 'Unknown'}
                          </div>
                        </td>
                        <td className="mock-table__items">{summarizeItems(order.items)}</td>
                        <td>
                          <span
                            className={
                              requiresAttention
                                ? 'mock-status mock-status--pending'
                                : order.status === 'printed'
                                  ? 'mock-status mock-status--success'
                                  : 'mock-status mock-status--neutral'
                            }
                          >
                            {requiresAttention ? 'Attention' : order.status === 'printed' ? 'Printed' : 'Pending'}
                          </span>
                        </td>
                        <td className="mock-table__align-right">
                            <button type="button" className={requiresAttention ? 'mock-action-link' : 'mock-action-solid'} onClick={() => handlePrintAll(order)} disabled={actionDisabled}>
                              <Printer size={14} />
                              {printingOrderId === order.id ? 'Printing…' : requiresAttention ? 'Resolve Items' : 'Print Labels'}
                            </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside className="mock-dashboard__rail">
          <div className="mock-ai-card">
            <div className="mock-ai-card__content">
              <div className="mock-ai-card__title">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
                <h3>AI Intelligence</h3>
              </div>

              <div className="mock-ai-block">
                <p className="mock-ai-block__label">Predictive Stock</p>
                <div className="mock-ai-panel">
                  <div className="mock-ai-panel__row">
                    <p>Standard Shelf Labels</p>
                    <span className="mock-critical-badge">Critical</span>
                  </div>
                  <span className="mock-ai-panel__text">System predicts stockout in <strong>3 days</strong> based on current velocity.</span>
                  <button type="button" className="mock-ai-panel__button">Reorder Now</button>
                </div>
              </div>

              <div className="mock-ai-block">
                <p className="mock-ai-block__label">Fulfillment Forecast</p>
                <div className="mock-ai-panel">
                  <p className="mock-ai-forecast__title">Predicted Spike: This Friday</p>
                  <div className="mock-ai-bars">
                    {chartBars.map((height, index) => (
                      <div key={index} className={index === 4 ? 'mock-ai-bars__bar mock-ai-bars__bar--peak' : 'mock-ai-bars__bar'} style={{ height: `${height}%` }} />
                    ))}
                  </div>
                  <div className="mock-ai-bars__labels">
                    <span>MON</span>
                    <span>WED</span>
                    <span className="mock-ai-bars__labels-peak">FRI</span>
                    <span>SUN</span>
                  </div>
                </div>
              </div>

              <div className="mock-ai-mapping">
                <span className="material-symbols-outlined">sync_alt</span>
                <div>
                  <p>AI Auto-Mapping</p>
                  <span>3 products auto-mapped from Shopify successfully.</span>
                </div>
              </div>
            </div>
          </div>

          <section className="mock-integrations">
            <h4>Integrations Status</h4>
            <div className="mock-integrations__list">
              <div className="mock-integrations__item">
                <div className="mock-integrations__name">
                  <span className="mock-signal mock-signal--green" />
                  <span>Shopify Store</span>
                </div>
                <strong>Active</strong>
              </div>
              <div className="mock-integrations__item">
                <div className="mock-integrations__name">
                  <span className="mock-signal mock-signal--green" />
                  <span>WooCommerce API</span>
                </div>
                <strong>Active</strong>
              </div>
              <div className="mock-integrations__item">
                <div className="mock-integrations__name">
                  <span className="mock-signal mock-signal--amber" />
                  <span>Label Printer (F1)</span>
                </div>
                <strong className="mock-integrations__warning">Warning</strong>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

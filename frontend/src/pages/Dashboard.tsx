import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';

interface BillingStatus {
  usage: {
    quota: { used: number; limit: number };
  };
}

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  status: string;
  items: Array<{ name?: string }>;
}

const MOCK_FEED: Order[] = [
  {
    id: 'mock-1',
    order_number: 'CP-9821',
    customer_name: 'Shopify',
    status: 'auto-printed',
    items: [{ name: '4x Standard Shelf Labels' }, { name: '1x Pro Dispenser' }],
  },
  {
    id: 'mock-2',
    order_number: 'CP-9820',
    customer_name: 'WooCommerce',
    status: 'pending',
    items: [{ name: '12x Thermal Paper Rolls (80mm)' }],
  },
  {
    id: 'mock-3',
    order_number: 'CP-9819',
    customer_name: 'Shopify',
    status: 'fulfilled',
    items: [{ name: '2x Eco-Friendly Packaging Tape' }],
  },
];

export default function Dashboard() {
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    Promise.all([
      apiClient.get<BillingStatus>('/billing/status').catch(() => null),
      apiClient.get<Order[]>('/print/orders/pending').catch(() => []),
    ]).then(([billingData, orderData]) => {
      setBilling(billingData);
      setOrders(orderData);
    });
  }, []);

  const quotaUsed = billing?.usage.quota.used ?? 0;
  const quotaLimit = billing?.usage.quota.limit ?? 0;
  const quotaPercent = quotaLimit > 0 ? Math.min(100, Math.round((quotaUsed / quotaLimit) * 100)) : 85;
  const feed = (orders.length > 0 ? orders : MOCK_FEED).slice(0, 3);
  const chartBars = [30, 50, 40, 60, 90, 35, 25];

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
                  {feed.map((order, index) => {
                    const platform = index === 1 ? 'WooCommerce' : 'Shopify';
                    const time = index === 0 ? '2 mins ago' : index === 1 ? '15 mins ago' : '1 hour ago';
                    const items = order.items.map((item) => item.name).filter(Boolean).join(', ');
                    return (
                      <tr key={order.id}>
                        <td>
                          <strong>#{order.order_number}</strong>
                          <p>{time}</p>
                        </td>
                        <td>
                          <div className="mock-platform">
                            <span className={`material-symbols-outlined ${platform === 'WooCommerce' ? 'mock-platform__icon mock-platform__icon--woo' : 'mock-platform__icon mock-platform__icon--shopify'}`}>
                              {platform === 'WooCommerce' ? 'storefront' : 'shopping_bag'}
                            </span>
                            {platform}
                          </div>
                        </td>
                        <td className="mock-table__items">{items}</td>
                        <td>
                          <span
                            className={
                              index === 0
                                ? 'mock-status mock-status--success'
                                : index === 1
                                  ? 'mock-status mock-status--pending'
                                  : 'mock-status mock-status--neutral'
                            }
                          >
                            {index === 0 ? 'Auto-printed' : index === 1 ? 'Pending' : 'Fulfilled'}
                          </span>
                        </td>
                        <td className="mock-table__align-right">
                          {index === 0 ? <button type="button" className="mock-action-link">Print Label</button> : null}
                          {index === 1 ? <button type="button" className="mock-action-solid">Print Label</button> : null}
                          {index === 2 ? <button type="button" className="mock-action-muted">Reprint</button> : null}
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

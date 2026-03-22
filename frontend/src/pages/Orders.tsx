import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Printer, RefreshCcw, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiClient } from '../api/client';

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
  status: string;
  imported_at: string;
  platform?: string;
  unmatched: OrderItem[];
  items: OrderItem[];
  jobs: OrderJob[];
}

function formatPlatform(order: PendingOrder) {
  return order.platform || 'WooCommerce';
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

export default function Orders() {
  const [orders, setOrders] = useState<PendingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'ready' | 'attention'>('all');
  const [printingOrderId, setPrintingOrderId] = useState<string | null>(null);

  const fetchOrders = async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'refresh') {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const data = await apiClient.get<PendingOrder[]>('/print/orders/pending');
      setOrders(data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load incoming orders');
    } finally {
      if (mode === 'refresh') {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesQuery =
        query.length === 0 ||
        order.order_number.toLowerCase().includes(query) ||
        order.customer_name.toLowerCase().includes(query) ||
        order.items.some((item) => (item.name || '').toLowerCase().includes(query) || (item.sku || '').toLowerCase().includes(query));

      if (!matchesQuery) return false;
      if (filter === 'ready') return order.unmatched.length === 0 && order.jobs.length > 0;
      if (filter === 'attention') return order.unmatched.length > 0 || order.jobs.length === 0;
      return true;
    });
  }, [filter, orders, search]);

  const stats = useMemo(() => {
    const ready = orders.filter((order) => order.unmatched.length === 0 && order.jobs.length > 0).length;
    const attention = orders.filter((order) => order.unmatched.length > 0 || order.jobs.length === 0).length;
    const labelCount = orders.reduce((sum, order) => sum + order.jobs.reduce((jobSum, job) => jobSum + (job.quantity || 0), 0), 0);
    return {
      total: orders.length,
      ready,
      attention,
      labelCount,
    };
  }, [orders]);

  const handlePrintAll = async (order: PendingOrder) => {
    setPrintingOrderId(order.id);
    try {
      const result = await apiClient.post<{ blob: Blob; jobId: string }>(`/print/orders/${order.id}/print-all`);
      const jobIds = (result.jobId || '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);

      if (jobIds.length === 0) {
        throw new Error('No printable jobs were returned for this order');
      }

      await Promise.all(jobIds.map((jobId) => apiClient.post(`/print/${jobId}/confirm`)));

      toast.success(`Printed ${order.order_number}`);
      await fetchOrders('refresh');
    } catch (err: any) {
      toast.error(err.message || 'Failed to print order');
    } finally {
      setPrintingOrderId(null);
    }
  };

  return (
    <div className="mock-page">
      <div className="mock-page__grid">
        <div className="mock-page__main">
          <section className="mock-surface">
            <div className="mock-surface__header">
              <div>
                <h2>Incoming Orders</h2>
                <p>Review synced orders, catch unmapped items, and print the matched labels without leaving the queue.</p>
              </div>
              <div className="mock-toolbar">
                <label className="mock-searchbar mock-searchbar--compact">
                  <Search size={15} />
                  <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search order, customer, SKU" />
                </label>
                <button type="button" className={filter === 'all' ? 'mock-toolbar-button mock-toolbar-button--active' : 'mock-toolbar-button'} onClick={() => setFilter('all')}>
                  All Orders
                </button>
                <button type="button" className={filter === 'ready' ? 'mock-toolbar-button mock-toolbar-button--active' : 'mock-toolbar-button'} onClick={() => setFilter('ready')}>
                  Ready to Print
                </button>
                <button type="button" className={filter === 'attention' ? 'mock-toolbar-button mock-toolbar-button--active' : 'mock-toolbar-button'} onClick={() => setFilter('attention')}>
                  Needs Attention
                </button>
                <button type="button" className="mock-toolbar-button" onClick={() => fetchOrders('refresh')} disabled={refreshing}>
                  <RefreshCcw size={15} />
                  {refreshing ? 'Refreshing…' : 'Refresh'}
                </button>
              </div>
            </div>

            {loading ? (
              <div className="mock-empty-state">
                <strong>Loading incoming orders</strong>
                <p>Pulling the latest pending orders from the integration queue.</p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="mock-empty-state">
                <strong>No orders match this view</strong>
                <p>Try a different search or filter, or wait for the next order import.</p>
              </div>
            ) : (
              <div className="mock-table-wrap">
                <table className="mock-table">
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Customer</th>
                      <th>Items</th>
                      <th>Status</th>
                      <th className="mock-table__align-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order) => {
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
                            <strong>{order.customer_name || 'Customer unavailable'}</strong>
                            <p>{order.items.length} item{order.items.length === 1 ? '' : 's'}</p>
                          </td>
                          <td className="mock-table__items">
                            <div className="mock-order-items">
                              <span>{summarizeItems(order.items)}</span>
                              {order.unmatched.length > 0 ? (
                                <div className="mock-order-note">
                                  <AlertTriangle size={14} />
                                  {order.unmatched.length} unmatched SKU{order.unmatched.length === 1 ? '' : 's'}
                                </div>
                              ) : null}
                            </div>
                          </td>
                          <td>
                            <span className={requiresAttention ? 'mock-status mock-status--pending' : 'mock-status mock-status--success'}>
                              {requiresAttention ? 'Attention' : 'Ready'}
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
            )}
          </section>
        </div>

        <aside className="mock-page__rail">
          <section className="mock-rail-card">
            <div className="mock-rail-card__header">
              <strong>Queue Snapshot</strong>
            </div>
            <div className="mock-stat-grid">
              <div className="mock-stat-tile">
                <strong>{stats.total}</strong>
                <span>Pending orders</span>
              </div>
              <div className="mock-stat-tile">
                <strong>{stats.labelCount}</strong>
                <span>Labels queued</span>
              </div>
              <div className="mock-stat-tile">
                <strong>{stats.ready}</strong>
                <span>Ready to print</span>
              </div>
              <div className="mock-stat-tile">
                <strong>{stats.attention}</strong>
                <span>Need attention</span>
              </div>
            </div>
          </section>

          <section className="mock-rail-card">
            <div className="mock-rail-card__header">
              <strong>Current Filters</strong>
            </div>
            <div className="mock-meta-list">
              <div>
                <strong>{filter === 'all' ? 'All incoming orders' : filter === 'ready' ? 'Ready to print only' : 'Attention required only'}</strong>
                <span>Use the filter buttons to focus on clean orders or mapping issues.</span>
              </div>
              <div>
                <strong>Matched jobs come from order imports</strong>
                <span>Any order with unmapped SKUs stays in the queue until the catalog and SKU mapping are fixed.</span>
              </div>
            </div>
          </section>

          <section className="mock-rail-card">
            <div className="mock-rail-card__header">
              <strong>Orders Requiring Attention</strong>
            </div>
            <div className="mock-meta-list">
              {orders.filter((order) => order.unmatched.length > 0 || order.jobs.length === 0).slice(0, 3).map((order) => (
                <div key={order.id}>
                  <strong>#{order.order_number}</strong>
                  <span>{order.unmatched.length > 0 ? `${order.unmatched.length} unmatched item${order.unmatched.length === 1 ? '' : 's'}` : 'No printable jobs generated yet'}</span>
                </div>
              ))}
              {orders.every((order) => order.unmatched.length === 0 && order.jobs.length > 0) ? (
                <div>
                  <strong>No blockers in the queue</strong>
                  <span>All current pending orders have printable jobs attached.</span>
                </div>
              ) : null}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

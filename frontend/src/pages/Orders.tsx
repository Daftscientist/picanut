import { useState, useEffect } from 'react';
import { Printer, AlertCircle, RefreshCcw } from 'lucide-react';
import { apiClient } from '../api/client';
import toast from 'react-hot-toast';

interface OrderItem {
  id: string;
  sku: string;
  name: string;
  quantity: number;
}

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  status: string;
  unmatched: string[];
  items: OrderItem[];
}

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [printingId, setPrintingId] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      const data = await apiClient.get<Order[]>('/print/orders/pending');
      setOrders(data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handlePrintAll = async (orderId: string) => {
    setPrintingId(orderId);
    try {
      const data = await apiClient.post<{ blob: Blob, jobId: string }>(`/print/orders/${orderId}/print-all`);
      // For now we just notify, real world would dispatch to agent or download
      toast.success('Batch sent to printer');
      console.log('Printed jobs:', data.jobId);
    } catch (err: any) {
      toast.error(err.message || 'Print failed');
    } finally {
      setPrintingId(null);
    }
  };

  return (
    <>
      <div className="page-header d-print-none text-white">
        <div className="container-xl">
          <div className="row g-2 align-items-center">
            <div className="col">
              <h2 className="page-title">Pending Orders</h2>
              <div className="text-muted mt-1">WooCommerce orders requiring labels</div>
            </div>
            <div className="col-auto ms-auto d-print-none">
              <button onClick={fetchOrders} className="btn btn-ghost-light">
                <RefreshCcw size={18} className="me-2" />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="page-body">
        <div className="container-xl">
          <div className="row row-cards">
            {loading ? (
              <div className="col-12 text-center py-5">Loading orders...</div>
            ) : orders.length === 0 ? (
              <div className="col-12">
                <div className="card shadow-sm border-0 text-center py-5 text-muted">No pending orders.</div>
              </div>
            ) : (
              orders.map(order => (
                <div className="col-12" key={order.id}>
                  <div className="card shadow-sm border-0">
                    <div className="card-header border-0 bg-transparent">
                      <h3 className="card-title">Order #{order.order_number} — {order.customer_name}</h3>
                      <div className="card-actions">
                        <button
                          onClick={() => handlePrintAll(order.id)}
                          className="btn btn-primary btn-sm"
                          disabled={printingId === order.id}
                        >
                          <Printer size={14} className="me-2" />
                          {printingId === order.id ? 'Printing...' : 'Print All'}
                        </button>
                      </div>
                    </div>
                    <div className="card-body py-2">
                      <div className="list-group list-group-flush list-group-hoverable">
                        {order.items.map((item, idx) => (
                          <div className="list-group-item" key={idx}>
                            <div className="row align-items-center">
                              <div className="col-auto">
                                <span className="avatar avatar-sm">{item.quantity}x</span>
                              </div>
                              <div className="col text-truncate">
                                <span className="text-reset d-block font-weight-medium">{item.name}</span>
                                <div className="d-block text-muted text-truncate mt-n1 small">SKU: {item.sku}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {order.unmatched.length > 0 && (
                        <div className="alert alert-warning mb-0 mt-3 d-flex gap-2">
                          <AlertCircle size={20} className="flex-shrink-0" />
                          <div>
                            Unmatched SKUs: {order.unmatched.join(', ')}. No labels generated for these items.
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}

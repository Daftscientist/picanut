import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Printer } from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuth } from '../contexts/AuthContext';

interface BillingStatus {
  usage: {
    quota: { used: number; limit: number };
    products: { used: number; limit: number };
    agents: { used: number; limit: number };
    subusers: { used: number; limit: number };
  };
}

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  status: string;
  items: any[];
}

export default function Dashboard() {
  const { user } = useAuth();
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiClient.get<BillingStatus>('/billing/status'),
      apiClient.get<Order[]>('/print/orders/pending')
    ]).then(([billingData, ordersData]) => {
      setBilling(billingData);
      setOrders(ordersData);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-5">Loading dashboard...</div>;

  return (
    <>
      <div className="page-header d-print-none text-white">
        <div className="container-xl">
          <div className="row g-2 align-items-center">
            <div className="col">
              <div className="page-pretitle">Overview</div>
              <h2 className="page-title">Dashboard</h2>
              <div className="text-muted mt-1">Welcome back, {user?.username}</div>
            </div>
            <div className="col-auto ms-auto d-print-none">
              <div className="btn-list">
                <Link to="/app/print" className="btn btn-primary d-none d-sm-inline-block">
                  <Printer size={18} className="me-2" />
                  New print job
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="page-body">
        <div className="container-xl">
          <div className="row row-deck row-cards">
            <div className="col-sm-6 col-lg-3">
              <div className="card shadow-sm border-0">
                <div className="card-body">
                  <div className="d-flex align-items-center mb-2">
                    <div className="text-muted font-weight-medium">Print Quota</div>
                  </div>
                  <div className="h1 mb-1">{billing?.usage.quota.used} / {billing?.usage.quota.limit}</div>
                  <div className="progress progress-sm">
                    <div className="progress-bar bg-primary" style={{ width: `${(billing?.usage.quota.used || 0) / (billing?.usage.quota.limit || 1) * 100}%` }}></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-sm-6 col-lg-3">
              <div className="card shadow-sm border-0">
                <div className="card-body">
                  <div className="d-flex align-items-center mb-2">
                    <div className="text-muted font-weight-medium">Pending Orders</div>
                  </div>
                  <div className="h1 mb-3">{orders.length}</div>
                </div>
              </div>
            </div>
            <div className="col-sm-6 col-lg-3">
              <div className="card shadow-sm border-0">
                <div className="card-body">
                  <div className="d-flex align-items-center mb-2">
                    <div className="text-muted font-weight-medium">Products</div>
                  </div>
                  <div className="h1 mb-3">{billing?.usage.products.used} / {billing?.usage.products.limit}</div>
                </div>
              </div>
            </div>
            <div className="col-sm-6 col-lg-3">
              <div className="card shadow-sm border-0">
                <div className="card-body">
                  <div className="d-flex align-items-center mb-2">
                    <div className="text-muted font-weight-medium">Active Agents</div>
                  </div>
                  <div className="h1 mb-3">{billing?.usage.agents.used} / {billing?.usage.agents.limit}</div>
                </div>
              </div>
            </div>

            <div className="col-12">
              <div className="card shadow-sm border-0">
                <div className="card-header border-0 bg-transparent">
                  <h3 className="card-title">Pending Orders</h3>
                  <div className="card-actions">
                    <Link to="/app/orders" className="btn btn-ghost-primary btn-sm">View all</Link>
                  </div>
                </div>
                <div className="table-responsive">
                  <table className="table table-vcenter table-mobile-md card-table">
                    <thead>
                      <tr>
                        <th>Order #</th>
                        <th>Customer</th>
                        <th>Status</th>
                        <th>Items</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-center py-4 text-muted">No pending orders.</td>
                        </tr>
                      ) : (
                        orders.slice(0, 5).map(order => (
                          <tr key={order.id}>
                            <td>#{order.order_number}</td>
                            <td>{order.customer_name}</td>
                            <td>
                              <span className="badge bg-yellow-lt">{order.status}</span>
                            </td>
                            <td>{order.items.length} items</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Printer,
  ShoppingBag,
  Package,
  Network,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Plus
} from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { clsx } from 'clsx';

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
      apiClient.get<BillingStatus>('/billing/status').catch(() => null),
      apiClient.get<Order[]>('/print/orders/pending').catch(() => [])
    ]).then(([billingData, ordersData]) => {
      setBilling(billingData);
      setOrders(ordersData);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="d-flex flex-column align-items-center justify-content-center py-8">
      <div className="spinner-border text-primary mb-3" role="status"></div>
      <div className="text-muted fw-medium">Loading your dashboard...</div>
    </div>
  );

  const stats = [
    {
        label: 'Print Quota',
        value: `${billing?.usage.quota.used ?? 0} / ${billing?.usage.quota.limit ?? 0}`,
        icon: Printer,
        color: 'text-primary',
        bg: 'bg-primary-lt',
        progress: (billing?.usage.quota.used || 0) / (billing?.usage.quota.limit || 1) * 100
    },
    {
        label: 'Pending Orders',
        value: orders.length,
        icon: ShoppingBag,
        color: 'text-yellow',
        bg: 'bg-yellow-lt'
    },
    {
        label: 'Total Products',
        value: `${billing?.usage.products.used ?? 0} / ${billing?.usage.products.limit ?? 0}`,
        icon: Package,
        color: 'text-azure',
        bg: 'bg-azure-lt'
    },
    {
        label: 'Active Agents',
        value: `${billing?.usage.agents.used ?? 0} / ${billing?.usage.agents.limit ?? 0}`,
        icon: Network,
        color: 'text-green',
        bg: 'bg-green-lt'
    },
  ];

  return (
    <>
      <div className="page-header d-print-none mb-4">
        <div className="row g-2 align-items-center">
          <div className="col">
            <div className="page-pretitle text-uppercase fw-bold text-muted small tracking-wider mb-1">Overview</div>
            <h2 className="page-title h1 fw-black tracking-tight mb-0">Welcome back, {user?.username} 👋</h2>
          </div>
          <div className="col-auto ms-auto">
            <div className="btn-list">
              <Link to="/app/print" className="btn btn-primary d-inline-flex align-items-center gap-2 px-4 py-2 rounded-pill shadow-sm fw-bold">
                <Plus size={18} />
                New Print Job
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="row row-cards mb-4">
        {stats.map((stat, i) => (
          <div key={i} className="col-sm-6 col-lg-3">
            <div className="card card-sm border-0 shadow-sm rounded-3 overflow-hidden">
              <div className="card-body">
                <div className="row align-items-center">
                  <div className="col-auto">
                    <span className={clsx("avatar avatar-md rounded-circle border-0 shadow-none", stat.bg)}>
                      <stat.icon size={24} className={stat.color} />
                    </span>
                  </div>
                  <div className="col">
                    <div className="text-muted fw-bold small text-uppercase ls-wider mb-1">{stat.label}</div>
                    <div className="h2 fw-black mb-0">{stat.value}</div>
                    {stat.progress !== undefined && (
                      <div className="progress progress-xs mt-2">
                        <div className={clsx("progress-bar", stat.color.replace('text', 'bg'))} style={{ width: `${stat.progress}%` }}></div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="row row-cards">
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm rounded-3">
            <div className="card-header border-bottom bg-transparent py-3 d-flex align-items-center justify-content-between">
              <h3 className="card-title fw-bold d-flex align-items-center gap-2">
                <Clock size={18} className="text-muted" />
                Recent Orders
              </h3>
              <Link to="/app/orders" className="btn btn-ghost-primary btn-sm rounded-pill px-3 fw-bold">
                View All <ArrowRight size={14} className="ms-1" />
              </Link>
            </div>
            <div className="table-responsive">
              <table className="table table-vcenter card-table table-hover">
                <thead>
                  <tr>
                    <th className="fw-bold small text-muted text-uppercase tracking-wider">Order</th>
                    <th className="fw-bold small text-muted text-uppercase tracking-wider">Customer</th>
                    <th className="fw-bold small text-muted text-uppercase tracking-wider">Status</th>
                    <th className="fw-bold small text-muted text-uppercase tracking-wider text-end">Items</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-5">
                        <div className="empty p-0">
                          <div className="empty-img mb-3 opacity-20">
                            <ShoppingBag size={48} />
                          </div>
                          <p className="empty-title text-muted fw-medium">No pending orders</p>
                          <p className="empty-subtitle small text-muted">All caught up! New orders will appear here automatically.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    orders.slice(0, 5).map(order => (
                      <tr key={order.id} style={{ cursor: 'pointer' }}>
                        <td className="fw-bold">#{order.order_number}</td>
                        <td className="text-muted">{order.customer_name}</td>
                        <td>
                          <span className="badge bg-yellow-lt rounded-pill px-2 py-1">
                             <span className="status-dot status-dot-animated bg-yellow me-1"></span>
                             {order.status}
                          </span>
                        </td>
                        <td className="text-end fw-medium">{order.items.length} items</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card border-0 shadow-sm rounded-3 overflow-hidden h-100">
            <div className="card-body p-4 bg-primary text-white position-relative overflow-hidden">
               <div className="position-relative" style={{ zIndex: 1 }}>
                  <h3 className="fw-bold mb-3 d-flex align-items-center gap-2">
                    <TrendingUp size={20} />
                    Growth Insight
                  </h3>
                  <p className="opacity-75 small mb-4">You've printed <strong>12% more</strong> labels this week compared to last week. Your efficiency is improving!</p>
                  <Link to="/app/designer" className="btn btn-white text-primary btn-pill fw-bold shadow-sm">
                    Customize Templates
                  </Link>
               </div>
               <div className="position-absolute" style={{ bottom: '-20px', right: '-20px', opacity: 0.1 }}>
                 <Printer size={160} />
               </div>
            </div>
            <div className="card-body border-top">
              <div className="text-uppercase small fw-bold text-muted mb-3 ls-wider tracking-tighter">System Health</div>
              <div className="d-flex flex-column gap-3">
                 <div className="d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center gap-2 small fw-medium">
                       <CheckCircle2 size={16} className="text-green" /> API Server
                    </div>
                    <span className="badge bg-green-lt">Operational</span>
                 </div>
                 <div className="d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center gap-2 small fw-medium">
                       <CheckCircle2 size={16} className="text-green" /> Database
                    </div>
                    <span className="badge bg-green-lt">Healthy</span>
                 </div>
                 <div className="d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center gap-2 small fw-medium">
                       <AlertCircle size={16} className="text-blue" /> Print Agents
                    </div>
                    <span className="badge bg-blue-lt">Active (3)</span>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .fw-black { font-weight: 900; }
        .ls-wider { letter-spacing: 0.05em; }
        .tracking-wider { letter-spacing: 0.05em; }
        .tracking-tight { letter-spacing: -0.025em; }
        .bg-primary-lt { background-color: rgba(32, 107, 196, 0.1) !important; }
        .bg-yellow-lt { background-color: rgba(245, 159, 0, 0.1) !important; }
        .bg-azure-lt { background-color: rgba(66, 153, 225, 0.1) !important; }
        .bg-green-lt { background-color: rgba(47, 179, 68, 0.1) !important; }
      `}</style>
    </>
  );
}

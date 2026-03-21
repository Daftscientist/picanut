import { useState, useEffect } from 'react';
import { Plus, RefreshCcw, CheckCircle2 } from 'lucide-react';
import { apiClient } from '../api/client';
import toast from 'react-hot-toast';

interface Plan {
  id: string;
  name: string;
  price_pence: number;
  trial_days: number;
  subuser_limit: number;
  agent_limit: number;
  product_limit: number;
  print_quota: number;
}

export default function AdminPlans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPlans = async () => {
    try {
      const data = await apiClient.get<Plan[]>('/admin/plans');
      setPlans(data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch plans');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  return (
    <>
      <div className="page-header d-print-none text-white">
        <div className="container-xl">
          <div className="row g-2 align-items-center">
            <div className="col">
              <h2 className="page-title">Platform Plans</h2>
              <div className="text-muted mt-1">Configure subscription tiers and limits</div>
            </div>
            <div className="col-auto ms-auto d-print-none">
              <div className="btn-list">
                <button onClick={fetchPlans} className="btn btn-ghost-light">
                  <RefreshCcw size={18} className="me-2" />
                  Refresh
                </button>
                <button className="btn btn-primary d-none d-sm-inline-block">
                  <Plus size={18} className="me-2" />
                  Create plan
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="page-body">
        <div className="container-xl">
          <div className="card shadow-sm border-0">
            <div className="table-responsive">
              <table className="table table-vcenter table-mobile-md card-table">
                <thead>
                  <tr>
                    <th>Plan Name</th>
                    <th>Price</th>
                    <th>Limits (Print / Prod / User)</th>
                    <th>Trial</th>
                    <th className="w-1"></th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={5} className="text-center py-4">Loading...</td></tr>
                  ) : plans.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-4 text-muted">No plans found.</td></tr>
                  ) : (
                    plans.map(plan => (
                      <tr key={plan.id}>
                        <td data-label="Name">
                          <div className="font-weight-medium">{plan.name}</div>
                          <div className="text-muted small">ID: {plan.id.slice(0, 8)}</div>
                        </td>
                        <td data-label="Price">
                          £{(plan.price_pence / 100).toFixed(2)} / mo
                        </td>
                        <td data-label="Limits">
                          <div className="d-flex gap-2">
                            <span className="badge bg-blue-lt">{plan.print_quota} labels</span>
                            <span className="badge bg-indigo-lt">{plan.product_limit} prods</span>
                            <span className="badge bg-purple-lt">{plan.subuser_limit} users</span>
                          </div>
                        </td>
                        <td data-label="Trial">
                          {plan.trial_days > 0 ? (
                            <span className="text-success d-flex align-items-center gap-1">
                              <CheckCircle2 size={12} /> {plan.trial_days} days
                            </span>
                          ) : 'No trial'}
                        </td>
                        <td>
                          <div className="btn-list flex-nowrap">
                            <button className="btn btn-ghost-primary btn-sm">Edit</button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

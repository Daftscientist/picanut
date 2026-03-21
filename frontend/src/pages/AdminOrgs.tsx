import { useState, useEffect } from 'react';
import { Building2, RefreshCcw, User } from 'lucide-react';
import { apiClient } from '../api/client';
import toast from 'react-hot-toast';

interface Org {
  id: string;
  name: string;
  slug: string;
  plan_name: string | null;
  subscription_status: string;
  user_count: number;
  agent_count: number;
  created_at: string;
}

export default function AdminOrgs() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrgs = async () => {
    try {
      const data = await apiClient.get<Org[]>('/admin/organizations');
      setOrgs(data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch organizations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrgs();
  }, []);

  return (
    <>
      <div className="page-header d-print-none text-white">
        <div className="container-xl">
          <div className="row g-2 align-items-center">
            <div className="col">
              <h2 className="page-title">Platform Organizations</h2>
              <div className="text-muted mt-1">Manage all companies and accounts</div>
            </div>
            <div className="col-auto ms-auto d-print-none">
              <div className="btn-list">
                <button onClick={fetchOrgs} className="btn btn-ghost-light">
                  <RefreshCcw size={18} className="me-2" />
                  Refresh
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
                    <th>Organization</th>
                    <th>Plan</th>
                    <th>Status</th>
                    <th>Usage (Users / Agents)</th>
                    <th className="w-1"></th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={5} className="text-center py-4">Loading...</td></tr>
                  ) : orgs.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-4 text-muted">No organizations found.</td></tr>
                  ) : (
                    orgs.map(org => (
                      <tr key={org.id}>
                        <td data-label="Organization">
                          <div className="d-flex py-1 align-items-center">
                            <span className="avatar avatar-sm me-2 bg-blue-lt">
                              <Building2 size={14} />
                            </span>
                            <div className="flex-fill">
                              <div className="font-weight-medium">{org.name}</div>
                              <div className="text-muted small">ID: {org.id.slice(0, 8)}</div>
                            </div>
                          </div>
                        </td>
                        <td data-label="Plan">
                          {org.plan_name || <span className="text-muted italic">No plan</span>}
                        </td>
                        <td data-label="Status">
                          <span className={`badge ${org.subscription_status === 'active' ? 'bg-success-lt' : 'bg-warning-lt'}`}>
                            {org.subscription_status}
                          </span>
                        </td>
                        <td data-label="Usage">
                          <div className="d-flex gap-2">
                            <span className="text-muted d-flex align-items-center gap-1">
                              <User size={12} /> {org.user_count}
                            </span>
                            <span className="text-muted d-flex align-items-center gap-1">
                              / {org.agent_count} Agents
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="btn-list flex-nowrap">
                            <button className="btn btn-ghost-primary btn-sm">Manage</button>
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

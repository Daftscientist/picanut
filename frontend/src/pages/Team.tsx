import { useState, useEffect } from 'react';
import { UserPlus, Shield, User as UserIcon, LogOut, RefreshCcw } from 'lucide-react';
import { apiClient } from '../api/client';
import toast from 'react-hot-toast';

interface TeamMember {
  id: string;
  username: string;
  role: 'manager' | 'subuser';
  is_admin: boolean;
  last_seen_at: string | null;
}

export default function Team() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMembers = async () => {
    try {
      const data = await apiClient.get<TeamMember[]>('/settings/users');
      setMembers(data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch team members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleRevokeSessions = async () => {
    try {
      await apiClient.post('/settings/revoke-sessions');
      toast.success('All other sessions revoked');
    } catch (err: any) {
      toast.error(err.message || 'Action failed');
    }
  };

  return (
    <>
      <div className="page-header d-print-none text-white">
        <div className="container-xl">
          <div className="row g-2 align-items-center">
            <div className="col">
              <h2 className="page-title">Team Management</h2>
              <div className="text-muted mt-1">Manage user accounts and organization security</div>
            </div>
            <div className="col-auto ms-auto d-print-none">
              <div className="btn-list">
                <button onClick={fetchMembers} className="btn btn-ghost-light">
                  <RefreshCcw size={18} className="me-2" />
                  Refresh
                </button>
                <button className="btn btn-primary d-none d-sm-inline-block">
                  <UserPlus size={18} className="me-2" />
                  Invite user
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="page-body">
        <div className="container-xl">
          <div className="row row-cards">
            <div className="col-md-8">
              <div className="card shadow-sm border-0">
                <div className="table-responsive">
                  <table className="table table-vcenter table-mobile-md card-table">
                    <thead>
                      <tr>
                        <th>Username</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th className="w-1"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr><td colSpan={4} className="text-center py-4">Loading...</td></tr>
                      ) : members.length === 0 ? (
                        <tr><td colSpan={4} className="text-center py-4 text-muted">No members found.</td></tr>
                      ) : (
                        members.map(member => (
                          <tr key={member.id}>
                            <td data-label="Username">
                              <div className="d-flex py-1 align-items-center">
                                <span className="avatar me-2 avatar-sm bg-blue-lt">
                                  <UserIcon size={14} />
                                </span>
                                <div className="flex-fill">
                                  <div className="font-weight-medium">{member.username}</div>
                                  <div className="text-muted small">ID: {member.id.slice(0, 8)}</div>
                                </div>
                              </div>
                            </td>
                            <td data-label="Role">
                              {member.role === 'manager' ? (
                                <span className="badge bg-blue-lt d-flex align-items-center gap-1 w-fit">
                                  <Shield size={12} /> Manager
                                </span>
                              ) : (
                                <span className="badge bg-green-lt">Staff</span>
                              )}
                            </td>
                            <td data-label="Status">
                              <span className="badge bg-success">Active</span>
                            </td>
                            <td>
                              <div className="btn-list flex-nowrap">
                                <button className="btn btn-ghost-danger btn-sm">Revoke</button>
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

            <div className="col-md-4">
              <div className="card shadow-sm border-0 bg-transparent">
                <div className="card-body bg-white rounded shadow-sm mb-3">
                  <h3 className="card-title">Security Actions</h3>
                  <div className="mb-3 text-muted small">
                    Force a logout for all active sessions on this account (excluding the current one).
                  </div>
                  <button onClick={handleRevokeSessions} className="btn btn-outline-danger w-100">
                    <LogOut size={16} className="me-2" />
                    Revoke other sessions
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

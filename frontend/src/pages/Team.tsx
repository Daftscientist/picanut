import { useEffect, useState } from 'react';
import { LogOut, RefreshCcw, UserPlus } from 'lucide-react';
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
    <div className="mock-page">
      <div className="mock-page__grid">
        <div className="mock-page__main">
          <section className="mock-feed-card">
            <div className="mock-feed-card__header">
              <div>
                <h2>People and Permissions</h2>
                <p>Manage the team and keep session hygiene under control without leaving the standard app layout.</p>
              </div>
              <div className="mock-toolbar">
                <button type="button" onClick={fetchMembers} className="mock-toolbar-button">
                  <RefreshCcw size={15} />
                  Refresh
                </button>
                <button type="button" className="mock-action-solid">
                  <UserPlus size={14} />
                  Invite User
                </button>
              </div>
            </div>

            {loading ? (
              <div className="mock-empty-state">
                <strong>Loading organization members</strong>
                <p>Fetching the current role matrix and session state.</p>
              </div>
            ) : members.length === 0 ? (
              <div className="mock-empty-state">
                <strong>No team members yet</strong>
                <p>Invite users to create a shared operational workspace for this organization.</p>
              </div>
            ) : (
              <div className="mock-table-wrap">
                <table className="mock-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Role</th>
                      <th>Session</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((member) => (
                      <tr key={member.id}>
                        <td>
                          <strong>{member.username}</strong>
                          <p>ID {member.id.slice(0, 8)}</p>
                        </td>
                        <td>
                          <span className={member.role === 'manager' ? 'mock-status mock-status--success' : 'mock-status mock-status--neutral'}>
                            {member.role === 'manager' ? 'Manager' : 'Sub-user'}
                          </span>
                        </td>
                        <td>
                          <strong>{member.last_seen_at ? new Date(member.last_seen_at).toLocaleDateString() : 'No recent activity'}</strong>
                          <p>{member.last_seen_at ? new Date(member.last_seen_at).toLocaleTimeString() : 'Awaiting first session'}</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <aside className="mock-page__rail">
          <section className="mock-rail-card">
            <div className="mock-rail-card__header">
              <strong>Session Controls</strong>
            </div>
            <div className="mock-meta-list">
              <div>
                <strong>Global session reset</strong>
                <span>Signs out every session except the one you are using now.</span>
              </div>
            </div>
            <div style={{ marginTop: '1rem' }}>
              <button type="button" onClick={handleRevokeSessions} className="mock-toolbar-button">
                <LogOut size={15} />
                Revoke Other Sessions
              </button>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

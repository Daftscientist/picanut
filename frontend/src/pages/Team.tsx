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
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

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

  const handleInviteUser = async (userData: any) => {
    try {
      await apiClient.post('/settings/users', userData);
      toast.success('User created successfully');
      fetchMembers();
      setIsInviteModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create user');
    }
  };

  const handleUpdateUser = async (userId: string, newRole: string) => {
    try {
      await apiClient.put(`/settings/users/${userId}`, { role: newRole });
      toast.success('User role updated');
      fetchMembers();
      setIsEditModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update user');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await apiClient.delete(`/settings/users/${userId}`);
      toast.success('User deleted successfully');
      fetchMembers();
      setIsEditModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete user');
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
                <button type="button" className="mock-action-solid" onClick={() => setIsInviteModalOpen(true)}>
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
                      <tr key={member.id} className="mock-table-row--clickable" onClick={() => {
                        setSelectedMember(member);
                        setIsEditModalOpen(true);
                      }}>
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

      {isInviteModalOpen && (
        <InviteUserForm
          onInvite={handleInviteUser}
          onClose={() => setIsInviteModalOpen(false)}
        />
      )}

      {isEditModalOpen && selectedMember && (
        <ManageUserForm
          member={selectedMember}
          onUpdate={handleUpdateUser}
          onDelete={handleDeleteUser}
          onClose={() => setIsEditModalOpen(false)}
        />
      )}
    </div>
  );
}

// ─── Sub-component for the Invite User Form ───────────────────────────────────

interface InviteUserFormProps {
  onInvite: (userData: any) => void;
  onClose: () => void;
}

function InviteUserForm({ onInvite, onClose }: InviteUserFormProps) {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'subuser',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onInvite(formData);
  };

  return (
    <div className="mock-modal-overlay">
      <div className="mock-modal">
        <form onSubmit={handleSubmit}>
          <div className="mock-modal__header">
            <h2>Invite New User</h2>
            <p>Create a new user and assign them a role. They can change their password after first login.</p>
          </div>
          <div className="mock-modal__body">
            <div className="mock-form-group">
              <label htmlFor="username">Username</label>
              <input type="text" id="username" name="username" value={formData.username} onChange={handleChange} required />
            </div>
            <div className="mock-form-group">
              <label htmlFor="password">Temporary Password</label>
              <input type="password" id="password" name="password" value={formData.password} onChange={handleChange} required minLength={6} />
            </div>
            <div className="mock-form-group">
              <label htmlFor="role">Role</label>
              <select id="role" name="role" value={formData.role} onChange={handleChange}>
                <option value="subuser">Sub-user</option>
                <option value="manager">Manager</option>
              </select>
            </div>
          </div>
          <div className="mock-modal__footer">
            <button type="button" className="mock-toolbar-button" onClick={onClose}>Cancel</button>
            <button type="submit" className="mock-action-solid">Create User</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Sub-component for the Manage User Form ───────────────────────────────────

interface ManageUserFormProps {
  member: TeamMember;
  onUpdate: (userId: string, newRole: string) => void;
  onDelete: (userId: string) => void;
  onClose: () => void;
}

function ManageUserForm({ member, onUpdate, onDelete, onClose }: ManageUserFormProps) {
  const [role, setRole] = useState(member.role);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(member.id, role);
  };

  return (
    <div className="mock-modal-overlay">
      <div className="mock-modal">
        <form onSubmit={handleSubmit}>
          <div className="mock-modal__header">
            <h2>Manage: {member.username}</h2>
            <p>Update the user's role or remove them from the organization.</p>
          </div>
          <div className="mock-modal__body">
            <div className="mock-form-group">
              <label htmlFor="role">Role</label>
              <select id="role" name="role" value={role} onChange={(e) => setRole(e.target.value as 'manager' | 'subuser')}>
                <option value="subuser">Sub-user</option>
                <option value="manager">Manager</option>
              </select>
            </div>
          </div>
          <div className="mock-modal__footer mock-modal__footer--split">
            <div>
              <button type="button" className="mock-toolbar-button mock-toolbar-button--danger" onClick={() => onDelete(member.id)}>Delete User</button>
            </div>
            <div>
              <button type="button" className="mock-toolbar-button" onClick={onClose}>Cancel</button>
              <button type="submit" className="mock-action-solid">Save Changes</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

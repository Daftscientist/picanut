import { useEffect, useState } from 'react';
import { RefreshCcw } from 'lucide-react';
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Org | null>(null);

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

  const openModal = (org: Org | null = null) => {
    setSelectedOrg(org);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedOrg(null);
  };

  const handleSave = async (orgData: Partial<Org>) => {
    try {
      if (selectedOrg) {
        await apiClient.put(`/admin/organizations/${selectedOrg.id}`, orgData);
        toast.success('Organization updated successfully');
      } else {
        await apiClient.post('/admin/organizations', orgData);
        toast.success('Organization created successfully');
      }
      fetchOrgs();
      closeModal();
    } catch (err: any)      toast.error(err.message || 'Failed to save organization');
    }
  };

  const handleDelete = async (orgId: string) => {
    // Stop propagation to prevent the row's onClick from firing.
    // e.stopPropagation(); 
    if (window.confirm('Are you sure you want to delete this organization? This will detach all users and delete associated data.')) {
      try {
        await apiClient.delete(`/admin/organizations/${orgId}`);
        toast.success('Organization deleted successfully');
        fetchOrgs();
      } catch (err: any) {
        toast.error(err.message || 'Failed to delete organization');
      }
    }
  };

  return (
    <div className="mock-page">
      <div className="mock-page__main">
        <section className="mock-feed-card">
          <div className="mock-feed-card__header">
            <div>
              <h2>Organization Overview</h2>
              <p>Audit tenant health, plan alignment, and seat-to-agent density across the full platform.</p>
            </div>
            <div className="mock-toolbar">
              <button type="button" onClick={fetchOrgs} className="mock-toolbar-button">
                <RefreshCcw size={15} />
                Refresh
              </button>
              <button type="button" className="mock-action-solid" onClick={() => openModal()}>
                Create Organization
              </button>
            </div>
          </div>
          {loading ? (
            <div className="mock-empty-state">
              <strong>Loading organizations</strong>
              <p>Fetching tenant plan and usage context.</p>
            </div>
          ) : orgs.length === 0 ? (
            <div className="mock-empty-state">
              <strong>No organizations found</strong>
              <p>When companies are created, they will surface here with plan and usage context.</p>
            </div>
          ) : (
            <div className="mock-table-wrap">
              <table className="mock-table">
                <thead>
                  <tr>
                    <th>Organization</th>
                    <th>Plan</th>
                    <th>Status</th>
                    <th>Usage</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orgs.map((org) => (
                    <tr key={org.id} className="mock-table-row--clickable" onClick={() => openModal(org)}>
                      <td>
                        <strong>{org.name}</strong>
                        <p>{org.slug}</p>
                      </td>
                      <td>
                        <strong>{org.plan_name || 'No plan assigned'}</strong>
                        <p>Created {new Date(org.created_at).toLocaleDateString()}</p>
                      </td>
                      <td>
                        <span className={org.subscription_status === 'active' ? 'mock-status mock-status--success' : 'mock-status mock-status--pending'}>
                          {org.subscription_status}
                        </span>
                      </td>
                      <td>
                        <div className="mock-list-row__chips">
                          <span className="mock-chip">{org.user_count} users</span>
                          <span className="mock-chip">{org.agent_count} agents</span>
                        </div>
                      </td>
                      <td>
                        <div className="mock-list-row__actions">
                            <button type="button" className="mock-toolbar-button" onClick={(e) => { e.stopPropagation(); openModal(org); }}>Edit</button>
                            <button type="button" className="mock-toolbar-button mock-toolbar-button--danger" onClick={(e) => { e.stopPropagation(); handleDelete(org.id); }}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        {isModalOpen && (
          <OrgForm
            org={selectedOrg}
            onSave={handleSave}
            onClose={closeModal}
          />
        )}
      </div>
    </div>
  );
}

// ─── Sub-component for the Org Form ────────────────────────────────────────────

interface OrgFormProps {
  org: Org | null;
  onSave: (orgData: Partial<Org>) => void;
  onClose: () => void;
}

function OrgForm({ org, onSave, onClose }: OrgFormProps) {
  const [formData, setFormData] = useState({
    name: org?.name || '',
    slug: org?.slug || '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="mock-modal-overlay">
      <div className="mock-modal">
        <div className="mock-modal__header">
          <h2>{org ? 'Edit Organization' : 'Create Organization'}</h2>
          <p>Create a new tenant, specifying its name and unique URL slug.</p>
        </div>
        <form onSubmit={handleSubmit} className="mock-modal__body">
          <div className="mock-form-group">
            <label htmlFor="name">Organization Name</label>
            <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} required />
          </div>
          <div className="mock-form-group">
            <label htmlFor="slug">Slug</label>
            <input type="text" id="slug" name="slug" value={formData.slug} onChange={handleChange} required />
          </div>
          <div className="mock-modal__footer">
            <button type="button" className="mock-toolbar-button" onClick={onClose}>Cancel</button>
            <button type="submit" className="mock-action-solid">Save Organization</button>
          </div>
        </form>
      </div>
    </div>
  );
}

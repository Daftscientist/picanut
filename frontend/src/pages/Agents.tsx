import { useEffect, useState } from 'react';
import { Plus, RefreshCcw } from 'lucide-react';
import { apiClient } from '../api/client';
import toast from 'react-hot-toast';

interface Agent {
  id: string;
  name: string;
  selected_printer: string | null;
  paper_size: string | null;
  is_default: boolean;
  connected: boolean;
  last_seen_at: string | null;
  token: string;
}

export default function Agents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
  const [newToken, setNewToken] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  const fetchAgents = async () => {
    try {
      const data = await apiClient.get<{ agents: Agent[] }>('/agents'); // Use the more detailed endpoint
      setAgents(data.agents);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch agents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const openEditModal = (agent: Agent) => {
    setSelectedAgent(agent);
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedAgent(null);
  };

  const handleAddAgent = async () => {
    try {
      const newAgent = await apiClient.post<Agent>('/agents', { name: 'New Agent' });
      setNewToken(newAgent.token);
      setIsTokenModalOpen(true);
      fetchAgents();
      toast.success('New agent created');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create agent');
    }
  };

  const handleSaveAgent = async (agentId: string, agentData: Partial<Agent>) => {
    try {
      await apiClient.put(`/agents/${agentId}`, agentData);
      toast.success('Agent updated successfully');
      fetchAgents();
      closeEditModal();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save agent');
    }
  };

  const handleDelete = async (agentId: string) => {
    // This is called from the modal, so we close the modal first
    closeEditModal();
    // Allow state to update before showing window.confirm
    setTimeout(() => {
      if (window.confirm('Are you sure you want to delete this agent?')) {
        apiClient.delete(`/agents/${agentId}`)
          .then(() => {
            toast.success('Agent deleted successfully');
            fetchAgents();
          })
          .catch((err: any) => {
            toast.error(err.message || 'Failed to delete agent');
          });
      }
    }, 100);
  };
  
  const handleRegenerateToken = async (agentId: string) => {
    try {
      const { token } = await apiClient.post<{ token: string }>(`/agents/${agentId}/regenerate-token`);
      setNewToken(token);
      setIsTokenModalOpen(true); // Re-use the token modal
      closeEditModal(); // Close the edit modal
      toast.success('Token regenerated. Use the new token for your agent script.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to regenerate token');
    }
  };

  const handleSetDefault = async (agentId: string) => {
    try {
      await apiClient.post(`/agents/${agentId}/set-default`);
      toast.success('Agent set as default');
      fetchAgents();
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
                <h2>Connected Print Agents</h2>
                <p>Keep printer bridges, defaults, and device visibility in the same compact system as the rest of the app.</p>
              </div>
              <div className="mock-toolbar">
                <button type="button" onClick={fetchAgents} className="mock-toolbar-button">
                  <RefreshCcw size={15} />
                  Refresh
                </button>
                <button type="button" className="mock-action-solid" onClick={handleAddAgent}>
                  <Plus size={14} />
                  Add Agent
                </button>
              </div>
            </div>

            <div className="mock-surface--padded">
              {loading ? (
                <div className="mock-empty-state">
                  <strong>Loading print agents</strong>
                  <p>Fetching local bridges and printer state.</p>
                </div>
              ) : agents.length === 0 ? (
                <div className="mock-empty-state">
                  <strong>No agents configured</strong>
                  <p>Add a local print agent to bridge the browser workspace with physical thermal printers.</p>
                </div>
              ) : (
                <div className="mock-list">
                  {agents.map((agent) => (
                    <div key={agent.id} className="mock-list-row mock-list-row--clickable" onClick={() => openEditModal(agent)}>
                      <div className="mock-list-row__main">
                        <strong>{agent.name}</strong>
                        <span>{agent.selected_printer || 'No printer selected yet'}</span>
                        <div className="mock-list-row__chips">
                          <span className={agent.connected ? 'mock-status mock-status--success' : 'mock-status mock-status--neutral'}>
                            {agent.connected ? 'Online' : 'Offline'}
                          </span>
                          <span className="mock-chip">{agent.paper_size || 'No paper size'}</span>
                          {agent.is_default ? <span className="mock-chip">Default route</span> : null}
                        </div>
                      </div>
                      <div className="mock-list-row__actions">
                        <button type="button" className="mock-toolbar-button" onClick={(e) => { e.stopPropagation(); openEditModal(agent); }}>Edit</button>
                        {!agent.is_default ? (
                          <button type="button" className="mock-toolbar-button" onClick={(e) => { e.stopPropagation(); handleSetDefault(agent.id); }}>
                            Set Default
                          </button>
                        ) : null}
                        <button type="button" className="mock-toolbar-button mock-toolbar-button--danger" onClick={(e) => { e.stopPropagation(); handleDelete(agent.id); }}>Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>

        <aside className="mock-page__rail">
          <section className="mock-rail-card">
            <div className="mock-rail-card__header">
              <strong>Device Snapshot</strong>
            </div>
            <div className="mock-stat-grid">
              <div className="mock-stat-tile">
                <strong>{agents.length}</strong>
                <span>Configured agents</span>
              </div>
              <div className="mock-stat-tile">
                <strong>{agents.filter((agent) => agent.connected).length}</strong>
                <span>Online now</span>
              </div>
            </div>
          </section>
        </aside>
      </div>
      {isTokenModalOpen && (
        <NewAgentTokenModal token={newToken} onClose={() => setIsTokenModalOpen(false)} />
      )}
      {isEditModalOpen && selectedAgent && (
        <AgentForm
          agent={selectedAgent}
          onSave={handleSaveAgent}
          onClose={closeEditModal}
          onDelete={handleDelete}
          onRegenerateToken={handleRegenerateToken}
        />
      )}
    </div>
  );
}

// ─── Sub-component for the New Agent Token Modal ──────────────────────────────

interface NewAgentTokenModalProps {
  token: string;
  onClose: () => void;
}

function NewAgentTokenModal({ token, onClose }: NewAgentTokenModalProps) {
  const copyToClipboard = () => {
    navigator.clipboard.writeText(token);
    toast.success('Token copied to clipboard');
  };

  return (
    <div className="mock-modal-overlay">
      <div className="mock-modal">
        <div className="mock-modal__header">
          <h2>New Agent Created</h2>
          <p>Use this token to configure your local print agent script. This token will only be shown once.</p>
        </div>
        <div className="mock-modal__body">
          <div className="mock-code-block">
            {token}
          </div>
        </div>
        <div className="mock-modal__footer">
          <button type="button" className="mock-toolbar-button" onClick={onClose}>Close</button>
          <button type="button" className="mock-action-solid" onClick={copyToClipboard}>Copy Token</button>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-component for the Agent Edit Form ────────────────────────────────────

interface AgentFormProps {
  agent: Agent;
  onSave: (agentId: string, agentData: Partial<Agent>) => void;
  onClose: () => void;
  onDelete: (agentId: string) => void;
  onRegenerateToken: (agentId: string) => void;
}

function AgentForm({ agent, onSave, onClose, onDelete, onRegenerateToken }: AgentFormProps) {
  const [formData, setFormData] = useState({
    name: agent.name || '',
    selected_printer: agent.selected_printer || '',
    paper_size: agent.paper_size || '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(agent.id, formData);
  };

  return (
    <div className="mock-modal-overlay">
      <div className="mock-modal">
        <form onSubmit={handleSubmit}>
          <div className="mock-modal__header">
            <h2>Edit Agent: {agent.name}</h2>
            <p>Update agent details, regenerate its token, or remove it from the system.</p>
          </div>
          <div className="mock-modal__body">
            <div className="mock-form-group">
              <label htmlFor="name">Agent Name</label>
              <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} required />
            </div>
            <div className="mock-form-group">
              <label htmlFor="selected_printer">Selected Printer</label>
              <input type="text" id="selected_printer" name="selected_printer" value={formData.selected_printer} onChange={handleChange} placeholder="e.g., Brother QL-820NWB" />
            </div>
            <div className="mock-form-group">
              <label htmlFor="paper_size">Paper Size</label>
              <input type="text" id="paper_size" name="paper_size" value={formData.paper_size} onChange={handleChange} placeholder="e.g., 62mm" />
            </div>
            <div className="mock-form-group">
                <label>Agent Token</label>
                <div className="mock-code-block mock-code-block--small">{agent.token}</div>
            </div>
          </div>
          <div className="mock-modal__footer mock-modal__footer--split">
            <div>
                <button type="button" className="mock-toolbar-button mock-toolbar-button--danger" onClick={() => onDelete(agent.id)}>Delete Agent</button>
                <button type="button" className="mock-toolbar-button" onClick={() => onRegenerateToken(agent.id)}>Regenerate Token</button>
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

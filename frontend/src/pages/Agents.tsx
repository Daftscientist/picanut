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

  const fetchAgents = async () => {
    try {
      const data = await apiClient.get<{ agents: Agent[] }>('/agent/status');
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
                <button type="button" className="mock-action-solid">
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
                    <div key={agent.id} className="mock-list-row">
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
                      {!agent.is_default ? (
                        <button type="button" className="mock-toolbar-button" onClick={() => handleSetDefault(agent.id)}>
                          Set Default
                        </button>
                      ) : null}
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
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Network, Plus, RefreshCcw, Power, PowerOff, ShieldCheck, Printer } from 'lucide-react';
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
    <>
      <div className="page-header d-print-none text-white">
        <div className="container-xl">
          <div className="row g-2 align-items-center">
            <div className="col">
              <h2 className="page-title">Print Agents</h2>
              <div className="text-muted mt-1">Manage network gateways for thermal printers</div>
            </div>
            <div className="col-auto ms-auto d-print-none">
              <div className="btn-list">
                <button onClick={fetchAgents} className="btn btn-ghost-light">
                  <RefreshCcw size={18} className="me-2" />
                  Refresh
                </button>
                <button className="btn btn-primary d-none d-sm-inline-block">
                  <Plus size={18} className="me-2" />
                  Add agent
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="page-body">
        <div className="container-xl">
          <div className="row row-cards">
            {loading ? (
              <div className="col-12 text-center py-5">Loading agents...</div>
            ) : agents.length === 0 ? (
              <div className="col-12">
                <div className="card shadow-sm border-0 text-center py-5 text-muted">No agents configured.</div>
              </div>
            ) : (
              agents.map(agent => (
                <div className="col-md-6 col-lg-4" key={agent.id}>
                  <div className="card shadow-sm border-0">
                    <div className="card-status-top bg-blue"></div>
                    <div className="card-body">
                      <div className="d-flex align-items-center mb-3">
                        <div className="avatar avatar-sm bg-blue-lt me-2">
                          <Network size={18} />
                        </div>
                        <div>
                          <div className="font-weight-medium">{agent.name}</div>
                          <div className="text-muted small">ID: {agent.id.slice(0, 8)}</div>
                        </div>
                        <div className="ms-auto">
                          {agent.connected ? (
                            <span className="badge bg-success-lt d-flex align-items-center gap-1">
                              <Power size={12} /> Online
                            </span>
                          ) : (
                            <span className="badge bg-danger-lt d-flex align-items-center gap-1">
                              <PowerOff size={12} /> Offline
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mb-3">
                        <div className="text-muted small mb-1">Assigned Printer</div>
                        <div className="d-flex align-items-center gap-2">
                          <Printer size={16} className="text-muted" />
                          <span>{agent.selected_printer || 'No printer selected'}</span>
                        </div>
                      </div>

                      <div className="mb-3">
                        <div className="text-muted small mb-1">Last Seen</div>
                        <div>{agent.last_seen_at ? new Date(agent.last_seen_at).toLocaleString() : 'Never'}</div>
                      </div>

                      <div className="d-flex align-items-center mt-4">
                        <div className="btn-list">
                          <button className="btn btn-ghost-primary btn-sm">Edit</button>
                          {!agent.is_default && (
                            <button
                              onClick={() => handleSetDefault(agent.id)}
                              className="btn btn-ghost-secondary btn-sm"
                            >
                              Set default
                            </button>
                          )}
                        </div>
                        {agent.is_default && (
                          <div className="ms-auto text-success" title="Default Agent">
                            <ShieldCheck size={20} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}

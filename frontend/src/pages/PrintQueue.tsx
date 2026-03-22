import { useEffect, useState } from 'react';
import { RefreshCcw } from 'lucide-react';
import { apiClient } from '../api/client';
import toast from 'react-hot-toast';

interface Job {
  id: string;
  product_name: string;
  sku: string;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
}

export default function PrintQueue() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchJobs = async () => {
    try {
      const data = await apiClient.get<Job[]>('/print/jobs', { limit: '50' });
      setJobs(data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch jobs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  return (
    <div className="mock-page">
      <div className="mock-page__grid">
        <div className="mock-page__main">
          <section className="mock-feed-card">
            <div className="mock-feed-card__header">
              <div>
                <h2>Recent Label Activity</h2>
                <p>Track queued, completed, and failed jobs in the same dense layout used across the rest of the app.</p>
              </div>
              <button type="button" onClick={fetchJobs} className="mock-toolbar-button">
                <RefreshCcw size={15} />
                Refresh Queue
              </button>
            </div>

            {loading ? (
              <div className="mock-empty-state">
                <strong>Loading queue activity</strong>
                <p>Fetching the most recent print jobs.</p>
              </div>
            ) : jobs.length === 0 ? (
              <div className="mock-empty-state">
                <strong>Queue is clear</strong>
                <p>New print jobs will land here as soon as labels are rendered or dispatched.</p>
              </div>
            ) : (
              <div className="mock-table-wrap">
                <table className="mock-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Status</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map((job) => (
                      <tr key={job.id}>
                        <td>
                          <strong>{job.product_name}</strong>
                          <p>{job.sku}</p>
                        </td>
                        <td>
                          <span className={job.status === 'completed' ? 'mock-status mock-status--success' : job.status === 'pending' ? 'mock-status mock-status--pending' : 'mock-status mock-status--neutral'}>
                            {job.status}
                          </span>
                        </td>
                        <td>
                          <strong>{new Date(job.created_at).toLocaleDateString()}</strong>
                          <p>{new Date(job.created_at).toLocaleTimeString()}</p>
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
              <strong>Queue Snapshot</strong>
            </div>
            <div className="mock-stat-grid">
              <div className="mock-stat-tile">
                <strong>{jobs.filter((job) => job.status === 'pending').length}</strong>
                <span>Pending</span>
              </div>
              <div className="mock-stat-tile">
                <strong>{jobs.filter((job) => job.status === 'completed').length}</strong>
                <span>Completed</span>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

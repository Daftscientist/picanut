import { useState, useEffect } from 'react';
import { RefreshCcw, CheckCircle2, Clock } from 'lucide-react';
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
    <>
      <div className="page-header d-print-none text-white">
        <div className="container-xl">
          <div className="row g-2 align-items-center">
            <div className="col">
              <h2 className="page-title">Print Queue</h2>
              <div className="text-muted mt-1">Monitor recent print activity</div>
            </div>
            <div className="col-auto ms-auto d-print-none">
              <button onClick={fetchJobs} className="btn btn-ghost-light">
                <RefreshCcw size={18} className="me-2" />
                Refresh
              </button>
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
                    <th>Product / SKU</th>
                    <th>Status</th>
                    <th>Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={3} className="text-center py-4">Loading...</td></tr>
                  ) : jobs.length === 0 ? (
                    <tr><td colSpan={3} className="text-center py-4 text-muted">No print jobs found.</td></tr>
                  ) : (
                    jobs.map(job => (
                      <tr key={job.id}>
                        <td data-label="Product">
                          <div className="d-flex py-1 align-items-center">
                            <div className="flex-fill">
                              <div className="font-weight-medium">{job.product_name}</div>
                              <div className="text-muted small">{job.sku}</div>
                            </div>
                          </div>
                        </td>
                        <td data-label="Status">
                          {job.status === 'completed' ? (
                            <span className="badge bg-success-lt d-flex align-items-center gap-1 w-fit">
                              <CheckCircle2 size={12} /> Completed
                            </span>
                          ) : job.status === 'pending' ? (
                            <span className="badge bg-yellow-lt d-flex align-items-center gap-1 w-fit">
                              <Clock size={12} /> Pending
                            </span>
                          ) : (
                            <span className="badge bg-danger-lt">Failed</span>
                          )}
                        </td>
                        <td data-label="Created At" className="text-muted">
                          {new Date(job.created_at).toLocaleString()}
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

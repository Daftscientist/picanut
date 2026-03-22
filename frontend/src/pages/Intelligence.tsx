import { useEffect, useState } from 'react';
import { BrainCircuit, ScanSearch, TrendingUp, TriangleAlert } from 'lucide-react';
import { apiClient } from '../api/client';
import toast from 'react-hot-toast';

interface IntelligenceStats {
  total_organizations?: number;
  total_users?: number;
  total_agents?: number;
  total_products?: number;
  total_variants?: number;
  total_print_jobs?: number;
  total_labels_printed_monthly?: number;
  organization_users?: number;
  organization_agents?: number;
  organization_products?: number;
  organization_variants?: number;
  organization_print_jobs?: number;
  organization_labels_printed_monthly?: number;
  pending_orders_total?: number;
  pending_orders_attention?: number;
}

export default function Intelligence() {
  const [stats, setStats] = useState<IntelligenceStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const data = await apiClient.get<IntelligenceStats>('/intelligence/stats');
      setStats(data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch intelligence stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="mock-page">
      <div className="mock-page__grid">
        <div className="mock-page__main">
          <section className="mock-feed-card">
            <div className="mock-feed-card__header">
              <div>
                <h2>AI-Assisted Operational Visibility</h2>
                <p>Use the same calm internal layout for predictive signals, SKU mapping, and workflow guidance.</p>
              </div>
              <div className="mock-ai-chip">
                <BrainCircuit size={14} />
                Intelligence Preview
              </div>
            </div>
            {loading ? (
              <div className="mock-empty-state">
                <strong>Loading intelligence data</strong>
                <p>Fetching insights from the platform's operational data.</p>
              </div>
            ) : (
              <div className="mock-surface--padded">
                <div className="mock-list">
                  {stats?.total_organizations !== undefined && (
                    <div className="mock-list-row">
                      <div className="mock-list-row__main">
                        <strong>Total Organizations</strong>
                        <span>{stats.total_organizations} organizations across the platform.</span>
                      </div>
                      <TrendingUp size={18} />
                    </div>
                  )}
                  {stats?.total_users !== undefined && (
                    <div className="mock-list-row">
                      <div className="mock-list-row__main">
                        <strong>Total Users</strong>
                        <span>{stats.total_users} registered users.</span>
                      </div>
                      <TrendingUp size={18} />
                    </div>
                  )}
                  {stats?.total_agents !== undefined && (
                    <div className="mock-list-row">
                      <div className="mock-list-row__main">
                        <strong>Total Agents</strong>
                        <span>{stats.total_agents} print agents connected.</span>
                      </div>
                      <TrendingUp size={18} />
                    </div>
                  )}
                  {stats?.total_products !== undefined && (
                    <div className="mock-list-row">
                      <div className="mock-list-row__main">
                        <strong>Total Products</strong>
                        <span>{stats.total_products} products in all catalogs.</span>
                      </div>
                      <TrendingUp size={18} />
                    </div>
                  )}
                  {stats?.total_print_jobs !== undefined && (
                    <div className="mock-list-row">
                      <div className="mock-list-row__main">
                        <strong>Total Print Jobs</strong>
                        <span>{stats.total_print_jobs} jobs processed.</span>
                      </div>
                      <TrendingUp size={18} />
                    </div>
                  )}
                  {stats?.total_labels_printed_monthly !== undefined && (
                    <div className="mock-list-row">
                      <div className="mock-list-row__main">
                        <strong>Labels Printed This Month</strong>
                        <span>{stats.total_labels_printed_monthly} labels across all organizations.</span>
                      </div>
                      <TrendingUp size={18} />
                    </div>
                  )}

                  {stats?.organization_users !== undefined && (
                    <div className="mock-list-row">
                      <div className="mock-list-row__main">
                        <strong>Your Organization Users</strong>
                        <span>{stats.organization_users} users in your organization.</span>
                      </div>
                      <TrendingUp size={18} />
                    </div>
                  )}
                  {stats?.organization_agents !== undefined && (
                    <div className="mock-list-row">
                      <div className="mock-list-row__main">
                        <strong>Your Organization Agents</strong>
                        <span>{stats.organization_agents} print agents connected in your organization.</span>
                      </div>
                      <TrendingUp size={18} />
                    </div>
                  )}
                  {stats?.organization_products !== undefined && (
                    <div className="mock-list-row">
                      <div className="mock-list-row__main">
                        <strong>Your Organization Products</strong>
                        <span>{stats.organization_products} products in your organization's catalog.</span>
                      </div>
                      <TrendingUp size={18} />
                    </div>
                  )}
                  {stats?.organization_print_jobs !== undefined && (
                    <div className="mock-list-row">
                      <div className="mock-list-row__main">
                        <strong>Your Organization Print Jobs</strong>
                        <span>{stats.organization_print_jobs} jobs processed in your organization.</span>
                      </div>
                      <TrendingUp size={18} />
                    </div>
                  )}
                  {stats?.organization_labels_printed_monthly !== undefined && (
                    <div className="mock-list-row">
                      <div className="mock-list-row__main">
                        <strong>Your Organization Labels This Month</strong>
                        <span>{stats.organization_labels_printed_monthly} labels printed this month in your organization.</span>
                      </div>
                      <TrendingUp size={18} />
                    </div>
                  )}

                  {stats?.pending_orders_total !== undefined && (
                    <div className="mock-list-row">
                      <div className="mock-list-row__main">
                        <strong>Pending Orders Total</strong>
                        <span>{stats.pending_orders_total} orders awaiting fulfillment.</span>
                      </div>
                      <ScanSearch size={18} />
                    </div>
                  )}
                  {stats?.pending_orders_attention !== undefined && (
                    <div className="mock-list-row">
                      <div className="mock-list-row__main">
                        <strong>Orders Needing Attention</strong>
                        <span>{stats.pending_orders_attention} orders require action due to unmatched SKUs or other issues.</span>
                      </div>
                      <TriangleAlert size={18} />
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>

        <aside className="mock-page__rail">
          <section className="mock-rail-card">
            <div className="mock-rail-card__header">
              <strong>Roadmap-Ready Zones</strong>
            </div>
            <div className="mock-meta-list">
              <div>
                <strong>Product auto-mapper API</strong>
                <span>Resolve mismatched SKUs from WooCommerce and Shopify payloads.</span>
              </div>
              <div>
                <strong>Usage forecast engine</strong>
                <span>Predict tape depletion, stock usage, and shift demand.</span>
              </div>
              <div>
                <strong>Anomaly detector</strong>
                <span>Flag irregular order bursts, quantity outliers, or suspicious activity.</span>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

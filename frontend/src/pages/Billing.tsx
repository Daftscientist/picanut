import { useEffect, useState } from 'react';
import { CreditCard, ExternalLink, RefreshCcw } from 'lucide-react';
import { apiClient } from '../api/client';
import toast from 'react-hot-toast';

interface Plan {
  id: string;
  name: string;
  price_pence: number;
  trial_days: number;
  subuser_limit: number;
  agent_limit: number;
  product_limit: number;
  print_quota: number;
}

interface BillingStatus {
  plan_name: string | null;
  subscription_status: string;
  trial_ends_at: string | null;
  current_period_end: string | null;
  usage: {
    quota: { used: number; limit: number };
    products: { used: number; limit: number };
    agents: { used: number; limit: number };
    subusers: { used: number; limit: number };
  };
}

export default function Billing() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutPlanId, setCheckoutPlanId] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [planData, billingData] = await Promise.all([
        apiClient.get<Plan[]>('/billing/plans'),
        apiClient.get<BillingStatus>('/billing/status'),
      ]);
      setPlans(planData);
      setBilling(billingData);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load billing');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const startCheckout = async (planId: string) => {
    setCheckoutPlanId(planId);
    try {
      const data = await apiClient.post<{ url: string }>('/billing/checkout', { plan_id: planId });
      window.location.href = data.url;
    } catch (err: any) {
      toast.error(err.message || 'Unable to start checkout');
    } finally {
      setCheckoutPlanId(null);
    }
  };

  const openPortal = async () => {
    setPortalLoading(true);
    try {
      const data = await apiClient.post<{ url: string }>('/billing/portal');
      window.location.href = data.url;
    } catch (err: any) {
      toast.error(err.message || 'Billing portal unavailable');
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <div className="mock-page">
      <div className="mock-page__grid">
        <div className="mock-page__main">
          <section className="mock-surface">
            <div className="mock-surface__header">
              <div>
                <h2>Usage, Plans, and Payment Routing</h2>
                <p>Monitor plan limits, compare tiers, and jump into Stripe-managed checkout or portal flows.</p>
              </div>
              <div className="mock-toolbar">
                <button type="button" onClick={fetchData} className="mock-toolbar-button">
                  <RefreshCcw size={15} />
                  Refresh
                </button>
                <button type="button" onClick={openPortal} className="mock-action-solid" disabled={portalLoading}>
                  <ExternalLink size={14} />
                  {portalLoading ? 'Opening…' : 'Open Portal'}
                </button>
              </div>
            </div>
            <div className="mock-surface--padded">
              <div className="mock-stat-grid">
                <div className="mock-stat-tile">
                  <strong>{billing?.plan_name || 'No plan'}</strong>
                  <span>{billing?.subscription_status || 'Unknown status'}</span>
                </div>
                <div className="mock-stat-tile">
                  <strong>{`${billing?.usage.quota.used ?? 0} / ${billing?.usage.quota.limit ?? 0}`}</strong>
                  <span>Monthly label allowance</span>
                </div>
                <div className="mock-stat-tile">
                  <strong>{`${billing?.usage.products.used ?? 0} / ${billing?.usage.products.limit ?? 0}`}</strong>
                  <span>Catalog capacity</span>
                </div>
                <div className="mock-stat-tile">
                  <strong>{`${billing?.usage.subusers.used ?? 0} / ${billing?.usage.subusers.limit ?? 0}`}</strong>
                  <span>Seats in use</span>
                </div>
              </div>
            </div>
          </section>

          <section className="mock-feed-card">
            <div className="mock-feed-card__header">
              <div>
                <h2>Available Plans</h2>
                <p>Upgrade when throughput or team size needs more headroom.</p>
              </div>
            </div>
            {loading ? (
              <div className="mock-empty-state">
                <strong>Loading billing plans</strong>
                <p>Fetching the public plan catalog and current organization status.</p>
              </div>
            ) : plans.length === 0 ? (
              <div className="mock-empty-state">
                <strong>No public plans</strong>
                <p>The platform has no public subscription tiers configured right now.</p>
              </div>
            ) : (
              <div className="mock-surface--padded">
                <div className="mock-list">
                  {plans.map((plan) => {
                    const current = plan.name === billing?.plan_name;
                    return (
                      <div key={plan.id} className="mock-list-row">
                        <div className="mock-list-row__main">
                          <strong>{plan.name}</strong>
                          <span>GBP {(plan.price_pence / 100).toFixed(2)} / month · {plan.trial_days} day trial</span>
                          <div className="mock-list-row__chips">
                            <span className="mock-chip">{plan.print_quota} labels</span>
                            <span className="mock-chip">{plan.product_limit} products</span>
                            <span className="mock-chip">{plan.subuser_limit} users</span>
                            <span className="mock-chip">{plan.agent_limit} agents</span>
                            {current ? <span className="mock-status mock-status--success">Current Plan</span> : null}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="mock-toolbar-button"
                          disabled={current || checkoutPlanId === plan.id}
                          onClick={() => startCheckout(plan.id)}
                        >
                          <CreditCard size={15} />
                          {checkoutPlanId === plan.id ? 'Opening…' : current ? 'Active' : 'Choose Plan'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        </div>

        <aside className="mock-page__rail">
          <section className="mock-rail-card">
            <div className="mock-rail-card__header">
              <strong>Subscription Status</strong>
            </div>
            <div className="mock-meta-list">
              <div>
                <strong>State</strong>
                <span>{billing?.subscription_status || 'Unavailable'}</span>
              </div>
              <div>
                <strong>Trial ends</strong>
                <span>{billing?.trial_ends_at ? new Date(billing.trial_ends_at).toLocaleString() : 'No active trial'}</span>
              </div>
              <div>
                <strong>Current period end</strong>
                <span>{billing?.current_period_end ? new Date(billing.current_period_end).toLocaleString() : 'Not available'}</span>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

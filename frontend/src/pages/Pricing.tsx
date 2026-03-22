import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Printer } from 'lucide-react';
import { apiClient } from '../api/client';

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

export default function Pricing() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get<Plan[]>('/billing/plans')
      .then(setPlans)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="marketing-shell marketing-shell--pricing">
      <div className="marketing-atmosphere" />

      <header className="marketing-nav canopy-glass">
        <Link to="/" className="brand-mark">
          <span className="brand-mark__icon">
            <Printer size={18} />
          </span>
          <span>
            <strong>Canopy</strong>
            <small>pricing</small>
          </span>
        </Link>

        <nav className="marketing-nav__links">
          <Link to="/">Home</Link>
          <Link to="/login">Login</Link>
          <Link to="/signup" className="canopy-button canopy-button--primary">
            Start free trial
          </Link>
        </nav>
      </header>

      <main className="marketing-main">
        <section className="marketing-section marketing-section--tight">
          <div className="marketing-section__header">
            <p className="canopy-label">Pricing</p>
            <h1>Choose a canopy sized to your operation.</h1>
            <p>
              Plans are designed around throughput, catalog scale, and team structure. Start lean, then expand the
              workspace as your fulfillment rhythm grows.
            </p>
          </div>

          {loading ? (
            <div className="canopy-panel pricing-loading">Loading plans...</div>
          ) : (
            <div className="pricing-grid">
              {plans.map((plan, index) => {
                const featured = index === 1 || plan.name.toLowerCase().includes('starter');

                return (
                  <article
                    key={plan.id}
                    className={featured ? 'pricing-card pricing-card--featured canopy-panel' : 'pricing-card canopy-panel canopy-panel--soft'}
                  >
                    <div className="pricing-card__header">
                      <div>
                        <p className="canopy-label">{plan.name}</p>
                        <h2>{plan.name}</h2>
                      </div>
                      {featured && <span className="canopy-chip canopy-chip--quiet">recommended</span>}
                    </div>

                    <div className="pricing-card__price">
                      <strong>GBP {(plan.price_pence / 100).toFixed(2)}</strong>
                      <span>per month</span>
                    </div>

                    <div className="pricing-card__features">
                      {[
                        `${plan.print_quota} labels / month`,
                        `${plan.product_limit} products`,
                        `${plan.subuser_limit} sub-users`,
                        `${plan.agent_limit} print agents`,
                        plan.trial_days > 0 ? `${plan.trial_days} day free trial` : 'No trial period',
                      ].map((feature) => (
                        <div key={feature} className="pricing-card__feature">
                          <Check size={16} />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>

                    <Link
                      to="/signup"
                      className={
                        featured
                          ? 'canopy-button canopy-button--light canopy-button--large pricing-card__action'
                          : 'canopy-button canopy-button--secondary canopy-button--large pricing-card__action'
                      }
                    >
                      Get started
                    </Link>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

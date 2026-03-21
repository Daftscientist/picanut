import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
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
    apiClient.get<Plan[]>('/billing/plans')
      .then(setPlans)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page">
      <div className="page-wrapper">
        <div className="page-header d-print-none">
          <div className="container-xl">
            <div className="row g-2 align-items-center">
              <div className="col">
                <h2 className="page-title">Pricing Plans</h2>
              </div>
            </div>
          </div>
        </div>
        <div className="page-body">
          <div className="container-xl">
            {loading ? (
              <div className="text-center py-5">Loading plans...</div>
            ) : (
              <div className="row row-cards justify-content-center">
                {plans.map((plan) => (
                  <div className="col-sm-6 col-lg-4" key={plan.id}>
                    <div className="card card-md shadow-sm border-0">
                      <div className="card-body text-center">
                        <div className="text-uppercase text-muted font-weight-medium">{plan.name}</div>
                        <div className="display-5 fw-bold my-3">£{(plan.price_pence / 100).toFixed(2)}</div>
                        <div className="text-muted mb-3">per month</div>
                        <ul className="list-unstyled lh-lg text-start mb-4">
                          <li className="d-flex align-items-center gap-2">
                            <Check className="text-success" size={20} />
                            <strong>{plan.print_quota}</strong> Labels / month
                          </li>
                          <li className="d-flex align-items-center gap-2">
                            <Check className="text-success" size={20} />
                            <strong>{plan.product_limit}</strong> Products
                          </li>
                          <li className="d-flex align-items-center gap-2">
                            <Check className="text-success" size={20} />
                            <strong>{plan.subuser_limit}</strong> Sub-users
                          </li>
                          <li className="d-flex align-items-center gap-2">
                            <Check className="text-success" size={20} />
                            <strong>{plan.agent_limit}</strong> Print Agents
                          </li>
                          {plan.trial_days > 0 && (
                            <li className="d-flex align-items-center gap-2">
                              <Check className="text-success" size={20} />
                              <strong>{plan.trial_days} day</strong> Free Trial
                            </li>
                          )}
                        </ul>
                        <div className="text-center mt-4">
                          <Link to="/signup" className="btn btn-primary w-100">
                            Get started
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

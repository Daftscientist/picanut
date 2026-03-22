import { useEffect, useState } from 'react';
import { Plus, RefreshCcw } from 'lucide-react';
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

export default function AdminPlans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  const fetchPlans = async () => {
    try {
      const data = await apiClient.get<Plan[]>('/admin/plans');
      setPlans(data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch plans');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const openModal = (plan: Plan | null = null) => {
    setSelectedPlan(plan);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedPlan(null);
  };

  const handleSave = async (planData: Partial<Plan>) => {
    try {
      if (selectedPlan) {
        // Update existing plan
        await apiClient.put(`/admin/plans/${selectedPlan.id}`, planData);
        toast.success('Plan updated successfully');
      } else {
        // Create new plan
        await apiClient.post('/admin/plans', planData);
        toast.success('Plan created successfully');
      }
      fetchPlans();
      closeModal();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save plan');
    }
  };

  const handleDelete = async (planId: string) => {
    if (window.confirm('Are you sure you want to delete this plan? This action cannot be undone.')) {
      try {
        await apiClient.delete(`/admin/plans/${planId}`);
        toast.success('Plan deleted successfully');
        fetchPlans();
      } catch (err: any) {
        toast.error(err.message || 'Failed to delete plan');
      }
    }
  };

  return (
    <div className="mock-page">
      <div className="mock-page__main">
        <section className="mock-feed-card">
          <div className="mock-feed-card__header">
            <div>
              <h2>Plan and Billing Architecture</h2>
              <p>Define productized tiers, usage ceilings, and trial windows from the platform control view.</p>
            </div>
            <div className="mock-toolbar">
              <button type="button" onClick={fetchPlans} className="mock-toolbar-button">
                <RefreshCcw size={15} />
                Refresh
              </button>
              <button type="button" className="mock-action-solid" onClick={() => openModal()}>
                <Plus size={14} />
                Create Plan
              </button>
            </div>
          </div>
          {loading ? (
            <div className="mock-empty-state">
              <strong>Loading plan configuration</strong>
              <p>Fetching the platform billing tiers.</p>
            </div>
          ) : plans.length === 0 ? (
            <div className="mock-empty-state">
              <strong>No plans configured</strong>
              <p>Create the first plan to establish pricing and usage rules for the platform.</p>
            </div>
          ) : (
            <div className="mock-table-wrap">
              <table className="mock-table">
                <thead>
                  <tr>
                    <th>Plan</th>
                    <th>Price</th>
                    <th>Limits</th>
                    <th>Trial</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map((plan) => (
                    <tr key={plan.id} className="mock-table-row--clickable" onClick={() => openModal(plan)}>
                      <td>
                        <strong>{plan.name}</strong>
                        <p>ID {plan.id.slice(0, 8)}</p>
                      </td>
                      <td>
                        <strong>GBP {(plan.price_pence / 100).toFixed(2)}</strong>
                        <p>Monthly recurring price</p>
                      </td>
                      <td>
                        <div className="mock-list-row__chips">
                          <span className="mock-chip">{plan.print_quota} labels</span>
                          <span className="mock-chip">{plan.product_limit} products</span>
                          <span className="mock-chip">{plan.subuser_limit} users</span>
                          <span className="mock-chip">{plan.agent_limit} agents</span>
                        </div>
                      </td>
                      <td>
                        <strong>{plan.trial_days > 0 ? `${plan.trial_days} days` : 'No trial'}</strong>
                        <p>Acquisition runway</p>
                      </td>
                      <td>
                        <div className="mock-list-row__actions">
                            <button type="button" className="mock-toolbar-button" onClick={() => openModal(plan)}>Edit</button>
                            <button type="button" className="mock-toolbar-button mock-toolbar-button--danger" onClick={() => handleDelete(plan.id)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
      {isModalOpen && (
        <PlanForm
          plan={selectedPlan}
          onSave={handleSave}
          onClose={closeModal}
        />
      )}
    </div>
  );
}

// ─── Sub-component for the Plan Form ───────────────────────────────────────────

interface PlanFormProps {
  plan: Plan | null;
  onSave: (planData: Partial<Plan>) => void;
  onClose: () => void;
}

function PlanForm({ plan, onSave, onClose }: PlanFormProps) {
  const [formData, setFormData] = useState({
    name: plan?.name || '',
    price_pence: plan?.price_pence || 0,
    trial_days: plan?.trial_days || 0,
    subuser_limit: plan?.subuser_limit || 0,
    agent_limit: plan?.agent_limit || 0,
    product_limit: plan?.product_limit || 0,
    print_quota: plan?.print_quota || 0,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value, 10) : value,
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
          <h2>{plan ? 'Edit Plan' : 'Create Plan'}</h2>
          <p>Define the new billing tier, usage limits, and trial period.</p>
        </div>
        <form onSubmit={handleSubmit} className="mock-modal__body">
          <div className="mock-form-group">
            <label htmlFor="name">Plan Name</label>
            <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} required />
          </div>
          <div className="mock-form-group">
            <label htmlFor="price_pence">Price (in pence)</label>
            <input type="number" id="price_pence" name="price_pence" value={formData.price_pence} onChange={handleChange} required />
          </div>
          <div className="mock-form-group">
            <label htmlFor="trial_days">Trial Days</label>
            <input type="number" id="trial_days" name="trial_days" value={formData.trial_days} onChange={handleChange} required />
          </div>
          <div className="mock-form-group-grid">
            <div className="mock-form-group">
              <label htmlFor="subuser_limit">User Limit</label>
              <input type="number" id="subuser_limit" name="subuser_limit" value={formData.subuser_limit} onChange={handleChange} required />
            </div>
            <div className="mock-form-group">
              <label htmlFor="agent_limit">Agent Limit</label>
              <input type="number" id="agent_limit" name="agent_limit" value={formData.agent_limit} onChange={handleChange} required />
            </div>
            <div className="mock-form-group">
              <label htmlFor="product_limit">Product Limit</label>
              <input type="number" id="product_limit" name="product_limit" value={formData.product_limit} onChange={handleChange} required />
            </div>
            <div className="mock-form-group">
              <label htmlFor="print_quota">Print Quota</label>
              <input type="number" id="print_quota" name="print_quota" value={formData.print_quota} onChange={handleChange} required />
            </div>
          </div>
          <div className="mock-modal__footer">
            <button type="button" className="mock-toolbar-button" onClick={onClose}>Cancel</button>
            <button type="submit" className="mock-action-solid">Save Plan</button>
          </div>
        </form>
      </div>
    </div>
  );
}

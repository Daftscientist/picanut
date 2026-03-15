import React, { useState, useEffect, useCallback } from "react";
import { api } from "../api.js";
import { useToast } from "../components/Toast.jsx";

export default function Admin() {
  const toast = useToast();
  const [tab, setTab] = useState("plans");
  const [plans, setPlans] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [editPlan, setEditPlan] = useState(null);
  const [planForm, setPlanForm] = useState({ name: "", price_pence: 0, trial_days: 30, subuser_limit: 5, agent_limit: 2, product_limit: 100, print_quota: 1000, stripe_price_id: "", is_public: true });
  const [saving, setSaving] = useState(false);

  const loadPlans = useCallback(async () => {
    try { setPlans(await api.adminListPlans()); } catch {}
  }, []);

  const loadOrgs = useCallback(async () => {
    try { setOrgs(await api.adminListOrgs()); } catch {}
  }, []);

  useEffect(() => {
    Promise.all([loadPlans(), loadOrgs()]).finally(() => setLoading(false));
  }, []);

  function openCreate() {
    setEditPlan(null);
    setPlanForm({ name: "", price_pence: 0, trial_days: 30, subuser_limit: 5, agent_limit: 2, product_limit: 100, print_quota: 1000, stripe_price_id: "", is_public: true });
    setShowPlanForm(true);
  }

  function openEdit(plan) {
    setEditPlan(plan);
    setPlanForm({ ...plan });
    setShowPlanForm(true);
  }

  async function handleSavePlan(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const data = {
        ...planForm,
        price_pence: parseInt(planForm.price_pence) || 0,
        trial_days: parseInt(planForm.trial_days) || 0,
        subuser_limit: parseInt(planForm.subuser_limit) || 0,
        agent_limit: parseInt(planForm.agent_limit) || 0,
        product_limit: parseInt(planForm.product_limit) || 0,
        print_quota: parseInt(planForm.print_quota) || 0,
      };
      if (editPlan) {
        await api.adminUpdatePlan(editPlan.id, data);
        toast.success("Plan updated");
      } else {
        await api.adminCreatePlan(data);
        toast.success("Plan created");
      }
      setShowPlanForm(false);
      loadPlans();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeletePlan(plan) {
    if (!confirm(`Delete plan "${plan.name}"? Any orgs on this plan will lose their plan link.`)) return;
    try {
      await api.adminDeletePlan(plan.id);
      toast.success("Plan deleted");
      loadPlans();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleUpdateOrgStatus(org, status) {
    try {
      await api.adminUpdateOrg(org.id, { subscription_status: status });
      toast.success("Updated");
      loadOrgs();
    } catch (err) {
      toast.error(err.message);
    }
  }

  if (loading) {
    return (
      <div className="page" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
        <span className="spinner dark" style={{ width: 28, height: 28 }} />
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Platform Admin</h1>
          <p className="text-secondary text-sm mt-1">Manage plans and organisations</p>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab${tab === "plans" ? " active" : ""}`} onClick={() => setTab("plans")}>
          Plans ({plans.length})
        </button>
        <button className={`tab${tab === "orgs" ? " active" : ""}`} onClick={() => setTab("orgs")}>
          Organisations ({orgs.length})
        </button>
      </div>

      {tab === "plans" && (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
            <button className="btn bp" onClick={openCreate}>+ New Plan</button>
          </div>

          {showPlanForm && (
            <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowPlanForm(false)}>
              <div className="modal" style={{ maxWidth: 600 }}>
                <div className="modal-header">
                  <h2>{editPlan ? "Edit Plan" : "New Plan"}</h2>
                  <button className="btn bg btn-icon" onClick={() => setShowPlanForm(false)}>✕</button>
                </div>
                <form onSubmit={handleSavePlan}>
                  <div className="grid-2">
                    <div className="fg">
                      <label className="fl">Name</label>
                      <input className="fi" value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} placeholder="Starter" required />
                    </div>
                    <div className="fg">
                      <label className="fl">Price (pence)</label>
                      <input className="fi" type="number" value={planForm.price_pence} onChange={(e) => setPlanForm({ ...planForm, price_pence: e.target.value })} placeholder="2900" />
                    </div>
                    <div className="fg">
                      <label className="fl">Trial days</label>
                      <input className="fi" type="number" value={planForm.trial_days} onChange={(e) => setPlanForm({ ...planForm, trial_days: e.target.value })} />
                    </div>
                    <div className="fg">
                      <label className="fl">Sub-user limit</label>
                      <input className="fi" type="number" value={planForm.subuser_limit} onChange={(e) => setPlanForm({ ...planForm, subuser_limit: e.target.value })} />
                    </div>
                    <div className="fg">
                      <label className="fl">Agent limit</label>
                      <input className="fi" type="number" value={planForm.agent_limit} onChange={(e) => setPlanForm({ ...planForm, agent_limit: e.target.value })} />
                    </div>
                    <div className="fg">
                      <label className="fl">Product limit</label>
                      <input className="fi" type="number" value={planForm.product_limit} onChange={(e) => setPlanForm({ ...planForm, product_limit: e.target.value })} />
                    </div>
                    <div className="fg">
                      <label className="fl">Print quota (per month)</label>
                      <input className="fi" type="number" value={planForm.print_quota} onChange={(e) => setPlanForm({ ...planForm, print_quota: e.target.value })} />
                    </div>
                    <div className="fg">
                      <label className="fl">Stripe Price ID</label>
                      <input className="fi" value={planForm.stripe_price_id || ""} onChange={(e) => setPlanForm({ ...planForm, stripe_price_id: e.target.value })} placeholder="price_…" />
                    </div>
                  </div>
                  <div className="fg">
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                      <input type="checkbox" checked={planForm.is_public} onChange={(e) => setPlanForm({ ...planForm, is_public: e.target.checked })} />
                      <span className="fl" style={{ margin: 0 }}>Visible on public plans page</span>
                    </label>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn bg" onClick={() => setShowPlanForm(false)}>Cancel</button>
                    <button type="submit" className="btn bp" disabled={saving}>{saving ? <span className="spinner" /> : "Save Plan"}</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Price</th>
                  <th>Users</th>
                  <th>Agents</th>
                  <th>Products</th>
                  <th>Quota</th>
                  <th>Stripe</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {plans.map((plan) => (
                  <tr key={plan.id}>
                    <td style={{ fontWeight: 600 }}>{plan.name}</td>
                    <td>£{(plan.price_pence / 100).toFixed(2)}/mo</td>
                    <td>{plan.subuser_limit}</td>
                    <td>{plan.agent_limit}</td>
                    <td>{plan.product_limit}</td>
                    <td>{plan.print_quota.toLocaleString()}</td>
                    <td className="text-muted" style={{ fontSize: 11, fontFamily: "var(--mono)" }}>
                      {plan.stripe_price_id ? plan.stripe_price_id.slice(0, 16) + "…" : "—"}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="btn bg btn-sm" onClick={() => openEdit(plan)}>Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDeletePlan(plan)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "orgs" && (
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>Organisation</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Users</th>
                <th>Agents</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orgs.map((org) => (
                <tr key={org.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{org.name}</div>
                    <div className="text-muted text-xs">{org.slug}</div>
                  </td>
                  <td>{org.plan_name || "—"}</td>
                  <td>
                    <span className={`b ${
                      org.subscription_status === "active" ? "ba" :
                      org.subscription_status === "trialing" ? "bb" :
                      "br"
                    }`}>
                      {org.subscription_status}
                    </span>
                  </td>
                  <td>{org.user_count}</td>
                  <td>{org.agent_count}</td>
                  <td className="text-muted text-sm">{new Date(org.created_at).toLocaleDateString()}</td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      {org.subscription_status !== "active" && (
                        <button className="btn bg btn-sm" onClick={() => handleUpdateOrgStatus(org, "active")}>Activate</button>
                      )}
                      {org.subscription_status === "active" && (
                        <button className="btn btn-danger btn-sm" onClick={() => handleUpdateOrgStatus(org, "cancelled")}>Suspend</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

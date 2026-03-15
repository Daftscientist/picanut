import React, { useState, useEffect } from "react";
import { api } from "../api.js";
import { useToast } from "../components/Toast.jsx";

function UsageBar({ label, used, limit, color }) {
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const barColor = pct >= 100 ? "var(--danger)" : pct >= 80 ? "var(--warn)" : color || "var(--accent)";
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 13 }}>{label}</span>
        <span style={{ fontSize: 12, color: "var(--text2)" }}>{used.toLocaleString()} / {limit.toLocaleString()}</span>
      </div>
      <div className="prog">
        <div className="pf2" style={{ width: `${pct}%`, background: barColor }} />
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    active: ["ba", "Active"],
    trialing: ["bb", "Trial"],
    past_due: ["br", "Past Due"],
    cancelled: ["br", "Cancelled"],
    canceled: ["br", "Cancelled"],
  };
  const [cls, label] = map[status] || ["bx", status];
  return <span className={`b ${cls}`}>{label}</span>;
}

export default function Billing() {
  const toast = useToast();
  const [status, setStatus] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(null);

  useEffect(() => {
    Promise.all([api.billingStatus(), api.listPlans()])
      .then(([s, p]) => { setStatus(s); setPlans(p); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handlePortal() {
    setPortalLoading(true);
    try {
      const res = await api.openPortal();
      window.location.href = res.url;
    } catch (err) {
      toast.error(err.message);
      setPortalLoading(false);
    }
  }

  async function handleCheckout(planId) {
    setCheckoutLoading(planId);
    try {
      const res = await api.createCheckout(planId);
      window.location.href = res.url;
    } catch (err) {
      toast.error(err.message);
      setCheckoutLoading(null);
    }
  }

  // Check URL for success/cancel
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success")) toast.success("Subscription activated! Welcome aboard.");
    if (params.get("cancelled")) toast.info("Checkout cancelled.");
    window.history.replaceState({}, "", "/billing");
  }, []);

  if (loading) {
    return (
      <div className="page" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
        <span className="spinner dark" style={{ width: 28, height: 28 }} />
      </div>
    );
  }

  const trialEnd = status?.trial_ends_at ? new Date(status.trial_ends_at) : null;
  const daysLeft = trialEnd ? Math.max(0, Math.ceil((trialEnd - new Date()) / (1000 * 60 * 60 * 24))) : null;
  const usage = status?.usage || {};

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Billing</h1>
          <p className="text-secondary text-sm mt-1">Manage your subscription and usage</p>
        </div>
      </div>

      {/* Current plan */}
      <div className="card section" style={{ marginBottom: 20 }}>
        <div className="ch">
          <div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Current Plan</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 18, fontWeight: 700 }}>{status?.plan_name || "No plan"}</span>
              {status?.subscription_status && <StatusBadge status={status.subscription_status} />}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            {status?.price_pence > 0 && (
              <div style={{ fontSize: 20, fontWeight: 700 }}>
                £{(status.price_pence / 100).toFixed(2)}<span style={{ fontSize: 13, fontWeight: 400, color: "var(--text2)" }}>/mo</span>
              </div>
            )}
            {status?.stripe_customer_id && (
              <button className="btn bg btn-sm" style={{ marginTop: 8 }} onClick={handlePortal} disabled={portalLoading}>
                {portalLoading ? <span className="spinner dark" style={{ width: 12, height: 12 }} /> : "Manage billing"}
              </button>
            )}
          </div>
        </div>

        {trialEnd && status?.subscription_status === "trialing" && (
          <div className="ct">
            <div className="ib" style={{ background: daysLeft <= 5 ? "var(--warn-bg)" : "var(--accent-bg)", color: daysLeft <= 5 ? "var(--warn)" : "var(--accent-fg)", borderColor: "transparent" }}>
              {daysLeft > 0
                ? `Trial ends in ${daysLeft} day${daysLeft !== 1 ? "s" : ""} (${trialEnd.toLocaleDateString()}). Add a payment method to continue.`
                : "Trial has ended. Please add a payment method to continue."}
            </div>
          </div>
        )}
      </div>

      {/* Usage */}
      {usage && Object.keys(usage).length > 0 && (
        <div className="card section" style={{ marginBottom: 20 }}>
          <div className="ch"><h2>Usage This Month</h2></div>
          <div className="ct">
            <UsageBar label="Print labels" used={usage.quota?.used || 0} limit={usage.quota?.limit || 0} />
            <UsageBar label="Products" used={usage.products?.used || 0} limit={usage.products?.limit || 0} />
            <UsageBar label="Agents" used={usage.agents?.used || 0} limit={usage.agents?.limit || 0} />
            <UsageBar label="Sub-users" used={usage.subusers?.used || 0} limit={usage.subusers?.limit || 0} />
          </div>
        </div>
      )}

      {/* Upgrade */}
      {plans.length > 0 && (
        <div className="card section">
          <div className="ch"><h2>Available Plans</h2></div>
          <div className="ct">
            <div className="grid-3">
              {plans.map((plan) => {
                const isCurrentPlan = status?.plan_name === plan.name;
                return (
                  <div key={plan.id} className="card" style={{ border: isCurrentPlan ? "2px solid var(--accent)" : undefined, position: "relative" }}>
                    {isCurrentPlan && (
                      <div style={{ position: "absolute", top: -1, right: 12, background: "var(--accent)", color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: "0 0 6px 6px" }}>
                        Current
                      </div>
                    )}
                    <div style={{ padding: "16px" }}>
                      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{plan.name}</div>
                      <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>
                        {plan.price_pence > 0 ? `£${(plan.price_pence / 100).toFixed(2)}` : "Free"}
                        {plan.price_pence > 0 && <span style={{ fontSize: 12, fontWeight: 400, color: "var(--text2)" }}>/mo</span>}
                      </div>
                      <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 5, marginBottom: 16, fontSize: 12, color: "var(--text2)" }}>
                        <li>✓ {plan.subuser_limit} sub-users</li>
                        <li>✓ {plan.agent_limit} print agents</li>
                        <li>✓ {plan.product_limit.toLocaleString()} products</li>
                        <li>✓ {plan.print_quota.toLocaleString()} labels/month</li>
                        <li>✓ {plan.trial_days}-day free trial</li>
                      </ul>
                      {!isCurrentPlan && plan.stripe_price_id && (
                        <button
                          className="btn bp w-full btn-sm"
                          onClick={() => handleCheckout(plan.id)}
                          disabled={checkoutLoading === plan.id}
                        >
                          {checkoutLoading === plan.id ? <span className="spinner" /> : "Upgrade"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

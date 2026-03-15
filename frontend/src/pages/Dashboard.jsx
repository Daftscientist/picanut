import React, { useState, useEffect, useCallback, useRef } from "react";
import { api } from "../api.js";
import { useToast } from "../components/Toast.jsx";
import { printBytes } from "../printer.js";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function Dashboard() {
  const toast = useToast();
  const username = localStorage.getItem("lf_username") || "there";
  const [orders, setOrders] = useState([]);
  const [recentJobs, setRecentJobs] = useState([]);
  const [agents, setAgents] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [printingOrder, setPrintingOrder] = useState(null);
  const intervalRef = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      const [ordersData, jobsData, agentData] = await Promise.all([
        api.getPendingOrders(),
        api.getPrintJobs({ limit: 5 }),
        api.agentStatus(),
      ]);
      setOrders(ordersData);
      setRecentJobs(jobsData);
      setAgents(agentData.agents || []);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 30000);
    return () => clearInterval(intervalRef.current);
  }, [fetchData]);

  const connectedAgents = agents.filter((a) => a.connected);
  const todayJobs = recentJobs.filter((j) => {
    const d = new Date(j.created_at);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  });

  async function handlePrintAll(order) {
    setPrintingOrder(order.id);
    toast.info("Printing…");
    try {
      const res = await api.printAllForOrder(order.id);
      if (!res.ok) throw new Error("Render failed");
      const jobIds = res.headers.get("X-Job-Ids") || "";
      const bytes = await res.arrayBuffer();
      await printBytes(new Uint8Array(bytes));
      for (const jobId of jobIds.split(",").filter(Boolean)) {
        await api.confirmPrint(jobId);
      }
      toast.success("Done — all labels printed");
      fetchData();
    } catch (err) {
      toast.error(`Print failed: ${err.message}`);
    } finally {
      setPrintingOrder(null);
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
          <h1 style={{ fontFamily: "var(--serif)", fontSize: "1.75rem", fontWeight: 400, marginBottom: 4 }}>
            {greeting()}, {username}
          </h1>
          <p className="text-secondary text-sm">
            {orders.length > 0
              ? `${orders.length} order${orders.length !== 1 ? "s" : ""} pending`
              : "All caught up on orders"}
          </p>
        </div>
        <button className="btn bg btn-sm" onClick={fetchData}>Refresh</button>
      </div>

      {/* Stat cards */}
      <div className="sr" style={{ marginBottom: 24 }}>
        <div className="stat sa">
          <div className="sv">{todayJobs.length}</div>
          <div className="sn">Labels today</div>
        </div>
        <div className="stat so">
          <div className="sv">{orders.length}</div>
          <div className="sn">Pending orders</div>
        </div>
        <div className="stat sw">
          <div className="sv">{connectedAgents.length}</div>
          <div className="sn">Active agents</div>
        </div>
        <div className="stat">
          <div className="sv">{recentJobs.length}</div>
          <div className="sn">Recent jobs</div>
        </div>
      </div>

      {/* Agent status cards */}
      {agents.length > 0 && (
        <div className="section">
          <h2 className="section-title">Print Agents</h2>
          <div className="grid-3" style={{ marginBottom: 0 }}>
            {agents.map((agent) => (
              <div className="card" key={agent.id} style={{ padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span className={`dot ${agent.connected ? "dg" : "dr"}`} />
                  <span style={{ fontWeight: 600, fontSize: 13, flex: 1 }}>{agent.name}</span>
                  {agent.is_default && <span className="b bg2" style={{ fontSize: 10 }}>Default</span>}
                </div>
                <div className="text-xs text-muted">{agent.selected_printer || "No printer set"}</div>
                <div className="text-xs" style={{ color: agent.connected ? "var(--ok)" : "var(--danger)", marginTop: 2 }}>
                  {agent.connected ? "Connected" : "Offline"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Orders */}
      <div className="section">
        <h2 className="section-title">Pending Orders</h2>
        {orders.length === 0 ? (
          <div className="card">
            <div className="empty-state" style={{ padding: "40px 20px" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🎉</div>
              <h3>All caught up!</h3>
              <p>No WooCommerce orders waiting to be printed.</p>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onPrintAll={() => handlePrintAll(order)}
                printing={printingOrder === order.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="section">
        <h2 className="section-title">Recent Activity</h2>
        {recentJobs.length === 0 ? (
          <div className="card">
            <p className="text-muted" style={{ textAlign: "center", padding: "20px 0" }}>
              No print jobs yet.
            </p>
          </div>
        ) : (
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Type</th>
                  <th>Qty</th>
                  <th>Status</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {recentJobs.map((job) => (
                  <tr key={job.id}>
                    <td style={{ fontWeight: 600 }}>{job.product_name || "—"}</td>
                    <td className="text-secondary">{job.sku || "—"}</td>
                    <td className="text-secondary">Type {job.label_type}</td>
                    <td>{job.quantity}</td>
                    <td>
                      <span className={`b ${job.status === "printed" ? "ba" : "bg2"}`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="text-muted" style={{ fontSize: "0.8125rem" }}>
                      {new Date(job.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function OrderCard({ order, onPrintAll, printing }) {
  const pendingJobs = order.jobs.filter((j) => j.status === "queued");
  return (
    <div className="card">
      <div className="ch">
        <div>
          <div style={{ fontWeight: 600, marginBottom: 2 }}>Order #{order.order_number}</div>
          <div className="text-secondary text-sm">
            {order.customer_name || "Unknown customer"} · {new Date(order.imported_at).toLocaleDateString()}
          </div>
        </div>
        <button
          className="btn bp btn-sm"
          onClick={onPrintAll}
          disabled={printing || pendingJobs.length === 0}
        >
          {printing ? (
            <><span className="spinner" style={{ width: 12, height: 12, borderColor: "rgba(255,255,255,0.3)", borderTopColor: "white" }} /> Printing…</>
          ) : `Print All (${pendingJobs.length})`}
        </button>
      </div>
      <div className="ct" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {order.jobs.map((job) => (
          <div key={job.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className={`dot ${job.status === "printed" ? "dg" : "da"}`} />
            <span style={{ fontWeight: 600, flex: 1 }}>{job.product_name || job.sku || "Unknown"}</span>
            <span className="text-secondary text-sm">{job.sku}</span>
            <span style={{ background: "var(--surface3)", borderRadius: 4, padding: "1px 8px", fontSize: 12, fontWeight: 600 }}>×{job.quantity}</span>
          </div>
        ))}
        {order.unmatched && order.unmatched.length > 0 && (
          <div className="ib" style={{ background: "var(--warn-bg)", color: "var(--warn)", borderColor: "rgba(122,72,0,0.2)", marginTop: 4 }}>
            <strong>Unmatched SKUs:</strong> {order.unmatched.map((u) => u.sku || u.name).join(", ")}
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect, useCallback, useRef } from "react";
import { api } from "../api.js";
import { useToast } from "../components/Toast.jsx";
import { printBytes } from "../printer.js";

export default function Dashboard() {
  const toast = useToast();
  const [orders, setOrders] = useState([]);
  const [recentJobs, setRecentJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [printingOrder, setPrintingOrder] = useState(null);
  const intervalRef = useRef(null);
  const printerConnected = true; // Let print attempt reveal connection state

  const fetchData = useCallback(async () => {
    try {
      const [ordersData, jobsData] = await Promise.all([
        api.getPendingOrders(),
        api.getPrintJobs({ limit: 10, status: "printed" }),
      ]);
      setOrders(ordersData);
      setRecentJobs(jobsData);
    } catch (err) {
      // Silently fail on polling errors
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 30000);
    return () => clearInterval(intervalRef.current);
  }, [fetchData]);

  async function handlePrintAll(order) {
    setPrintingOrder(order.id);
    toast.info("Printing…");
    try {
      const res = await api.printAllForOrder(order.id);
      if (!res.ok) {
        throw new Error("Render failed");
      }
      const jobIds = res.headers.get("X-Job-Ids") || "";
      const bytes = await res.arrayBuffer();
      await printBytes(new Uint8Array(bytes));
      // Confirm all jobs
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
      <div className="page">
        <div style={{ textAlign: "center", padding: 80 }}>
          <span className="spinner" style={{ width: 32, height: 32 }} />
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="text-secondary text-sm mt-1">
            {orders.length > 0
              ? `${orders.length} order${orders.length !== 1 ? "s" : ""} pending`
              : "No pending orders"}
          </p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={fetchData}>
          Refresh
        </button>
      </div>

      {/* Pending Orders */}
      <div className="section">
        <h2 className="section-title">Pending Orders</h2>
        {orders.length === 0 ? (
          <div className="card">
            <div className="empty-state" style={{ padding: "40px 20px" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
              <h3>All caught up!</h3>
              <p>No WooCommerce orders waiting to be printed.</p>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Label</th>
                  <th>Qty</th>
                  <th>Printed</th>
                </tr>
              </thead>
              <tbody>
                {recentJobs.map((job) => (
                  <tr key={job.id}>
                    <td style={{ fontWeight: 600 }}>{job.product_name || "—"}</td>
                    <td className="text-secondary">{job.sku || "—"}</td>
                    <td className="text-secondary">Type {job.label_type}</td>
                    <td>{job.quantity}</td>
                    <td className="text-muted" style={{ fontSize: "0.875rem" }}>
                      {job.printed_at
                        ? new Date(job.printed_at).toLocaleString()
                        : "—"}
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
      <div className="card-header">
        <div>
          <h3 style={{ marginBottom: 4 }}>Order #{order.order_number}</h3>
          <p className="text-secondary" style={{ fontSize: "0.875rem" }}>
            {order.customer_name || "Unknown customer"} &middot;{" "}
            {new Date(order.imported_at).toLocaleDateString()}
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={onPrintAll}
          disabled={printing || pendingJobs.length === 0}
        >
          {printing ? (
            <>
              <span className="spinner" style={{ borderColor: "rgba(255,255,255,0.3)", borderTopColor: "white" }} />
              Printing…
            </>
          ) : (
            `Print All (${pendingJobs.length})`
          )}
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {order.jobs.map((job) => (
          <div key={job.id} style={jobRowStyle}>
            <span
              className="status-dot"
              style={{
                background: job.status === "printed" ? "var(--success)" : "var(--accent)",
              }}
            />
            <span style={{ fontWeight: 600, flex: 1 }}>
              {job.product_name || job.sku || "Unknown"}
            </span>
            <span className="text-secondary" style={{ fontSize: "0.875rem" }}>
              {job.sku}
            </span>
            <span
              style={{
                background: "var(--bg-tertiary)",
                borderRadius: 4,
                padding: "2px 8px",
                fontSize: "0.875rem",
                fontWeight: 600,
                minWidth: 28,
                textAlign: "center",
              }}
            >
              ×{job.quantity}
            </span>
          </div>
        ))}

        {order.unmatched && order.unmatched.length > 0 && (
          <div
            style={{
              background: "var(--warning-bg)",
              border: "1px solid #ffe0b2",
              borderRadius: "var(--radius-sm)",
              padding: "10px 14px",
              fontSize: "0.875rem",
              color: "var(--warning)",
            }}
          >
            <strong>Unmatched SKUs:</strong>{" "}
            {order.unmatched.map((u) => u.sku || u.name).join(", ")}
          </div>
        )}
      </div>
    </div>
  );
}

const jobRowStyle = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "8px 0",
  borderBottom: "1px solid var(--border)",
};

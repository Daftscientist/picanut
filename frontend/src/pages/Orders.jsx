import React, { useState, useEffect, useCallback } from "react";
import { api } from "../api.js";
import { useToast } from "../components/Toast.jsx";
import { printBytes } from "../printer.js";

export default function Orders() {
  const toast = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [printingOrder, setPrintingOrder] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await api.getPendingOrders();
      setOrders(data);
    } catch {
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  async function handlePrintAll(order) {
    setPrintingOrder(order.id);
    toast.info("Printing all labels…");
    try {
      const res = await api.printAllForOrder(order.id);
      if (!res.ok) throw new Error("Render failed");
      const jobIds = res.headers.get("X-Job-Ids") || "";
      const bytes = new Uint8Array(await res.arrayBuffer());
      await printBytes(bytes);
      for (const jobId of jobIds.split(",").filter(Boolean)) {
        await api.confirmPrint(jobId);
      }
      toast.success("All labels printed!");
      load();
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
          <h1>Orders</h1>
          <p className="text-secondary text-sm mt-1">
            {orders.length > 0
              ? `${orders.length} pending order${orders.length !== 1 ? "s" : ""}`
              : "All caught up"}
          </p>
        </div>
        <button className="btn bg btn-sm" onClick={load}>Refresh</button>
      </div>

      {orders.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
          <h3>All caught up!</h3>
          <p>No WooCommerce orders pending. Configure the webhook in Settings to receive orders automatically.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {orders.map((order) => {
            const pendingJobs = order.jobs.filter((j) => j.status === "queued");
            const isPrinting = printingOrder === order.id;
            return (
              <div className="card" key={order.id}>
                <div className="ch">
                  <div>
                    <div style={{ fontWeight: 700, marginBottom: 3 }}>Order #{order.order_number}</div>
                    <div className="text-secondary text-sm">
                      {order.customer_name || "Unknown customer"}
                      {" · "}
                      {new Date(order.imported_at).toLocaleString()}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span className={`b ${pendingJobs.length > 0 ? "bb" : "ba"}`}>
                      {pendingJobs.length > 0 ? `${pendingJobs.length} pending` : "Complete"}
                    </span>
                    <button
                      className="btn bp btn-sm"
                      onClick={() => handlePrintAll(order)}
                      disabled={isPrinting || pendingJobs.length === 0}
                    >
                      {isPrinting ? (
                        <><span className="spinner" style={{ width: 12, height: 12, borderColor: "rgba(255,255,255,0.3)", borderTopColor: "white" }} /> Printing…</>
                      ) : `Print All (${pendingJobs.length})`}
                    </button>
                  </div>
                </div>
                <div className="ct" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {order.jobs.map((job) => (
                    <div key={job.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span className={`dot ${job.status === "printed" ? "dg" : "da"}`} />
                      <span style={{ fontWeight: 600, flex: 1 }}>{job.product_name || "Unknown"}</span>
                      <span className="text-secondary text-sm" style={{ fontFamily: "var(--mono)" }}>{job.sku}</span>
                      <span style={{ background: "var(--surface3)", borderRadius: 4, padding: "1px 8px", fontSize: 12, fontWeight: 600 }}>×{job.quantity}</span>
                      <span className={`b ${job.status === "printed" ? "ba" : "bg2"}`} style={{ fontSize: 10 }}>{job.status}</span>
                    </div>
                  ))}
                  {order.unmatched && order.unmatched.length > 0 && (
                    <div className="ib" style={{ background: "var(--warn-bg)", color: "var(--warn)", borderColor: "rgba(122,72,0,0.2)", marginTop: 4 }}>
                      <strong>Unmatched SKUs:</strong>{" "}
                      {order.unmatched.map((u) => u.sku || u.name).join(", ")}
                      {" — "}
                      <a href="/products" style={{ color: "var(--warn)", fontWeight: 600 }}>Add these products</a> to match them automatically.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

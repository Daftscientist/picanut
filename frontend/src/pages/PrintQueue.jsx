import React, { useState, useEffect, useCallback } from "react";
import { api } from "../api.js";
import { useToast } from "../components/Toast.jsx";
import { printBytes } from "../printer.js";

export default function PrintQueue() {
  const toast = useToast();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState({});
  const [statusFilter, setStatusFilter] = useState("queued");

  const load = useCallback(async () => {
    try {
      const data = await api.getPrintJobs({ limit: 50, status: statusFilter });
      setJobs(data);
    } catch {
      toast.error("Failed to load print queue");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  async function handlePrint(job) {
    setPrinting((p) => ({ ...p, [job.id]: true }));
    toast.info("Rendering label…");
    try {
      const res = await api.renderLabel({
        variant_id: job.variant_id,
        label_type: job.label_type,
        quantity: job.quantity,
      });
      if (!res.ok) throw new Error("Render failed");
      const bytes = new Uint8Array(await res.arrayBuffer());
      await printBytes(bytes);
      await api.confirmPrint(job.id);
      toast.success("Printed!");
      load();
    } catch (err) {
      toast.error(`Print failed: ${err.message}`);
    } finally {
      setPrinting((p) => ({ ...p, [job.id]: false }));
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
          <h1>Print Queue</h1>
          <p className="text-secondary text-sm mt-1">{jobs.length} job{jobs.length !== 1 ? "s" : ""}</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <select className="sel" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setLoading(true); }}>
            <option value="queued">Queued</option>
            <option value="printed">Printed</option>
            <option value="">All</option>
          </select>
          <button className="btn bg btn-sm" onClick={load}>Refresh</button>
        </div>
      </div>

      {jobs.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: 40, marginBottom: 12 }}>🖨️</div>
          <h3>{statusFilter === "queued" ? "Queue is empty" : "No jobs found"}</h3>
          <p>
            {statusFilter === "queued"
              ? "No labels waiting to be printed. Go to Products to create a print job."
              : "No print jobs match this filter."}
          </p>
        </div>
      ) : (
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Label Type</th>
                <th>Qty</th>
                <th>Status</th>
                <th>Type</th>
                <th>Time</th>
                {statusFilter !== "printed" && <th></th>}
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id}>
                  <td style={{ fontWeight: 600 }}>{job.product_name || "—"}</td>
                  <td className="text-secondary" style={{ fontFamily: "var(--mono)", fontSize: 12 }}>{job.sku || "—"}</td>
                  <td className="text-secondary">Type {job.label_type}</td>
                  <td style={{ fontWeight: 600 }}>{job.quantity}</td>
                  <td>
                    <span className={`b ${job.status === "printed" ? "ba" : "bg2"}`}>{job.status}</span>
                  </td>
                  <td className="text-muted">{job.type}</td>
                  <td className="text-muted" style={{ fontSize: 12 }}>{new Date(job.created_at).toLocaleString()}</td>
                  {statusFilter !== "printed" && (
                    <td>
                      {job.status === "queued" && (
                        <button
                          className="btn bp btn-sm"
                          onClick={() => handlePrint(job)}
                          disabled={printing[job.id]}
                        >
                          {printing[job.id] ? <span className="spinner" style={{ width: 12, height: 12, borderColor: "rgba(255,255,255,0.3)", borderTopColor: "white" }} /> : "Print"}
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

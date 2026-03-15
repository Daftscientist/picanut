import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api.js";
import { useToast } from "../components/Toast.jsx";
import {
  printBytes,
  getPrinterMode,
  getPrinterIp,
  usbGetOrRequestDevice,
  useUsbConnected,
} from "../printer.js";

// Re-export for legacy imports (Dashboard)
export { usbGetOrRequestDevice as getOrRequestDevice, printBytes as sendBytesToPrinter };
export { useUsbConnected as useDeviceConnected };

const LABEL_TYPES = [
  { value: 1, label: "Shelf Label",   desc: "Name · weight · price · barcode" },
  { value: 2, label: "Info Label",    desc: "Brand · title · body text" },
  { value: 3, label: "Product Info",  desc: "Full info with nutrition table" },
  { value: 4, label: "Title Label",   desc: "Large centred name · price · barcode" },
];

export default function PrintPreview() {
  const [searchParams] = useSearchParams();
  const toast = useToast();

  const mode = getPrinterMode();
  const usbConnected = useUsbConnected();
  const printerReady = mode === "network" ? !!getPrinterIp() : usbConnected;

  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [labelType, setLabelType] = useState(1);
  const [quantity, setQuantity] = useState(1);
  const [infoTitle, setInfoTitle] = useState("");
  const [infoBody, setInfoBody] = useState("");
  const [infoBrand, setInfoBrand] = useState("");
  const [search, setSearch] = useState("");
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    loadProducts();
    const variantId = searchParams.get("variant_id");
    if (variantId) preloadVariant(variantId);
  }, []);

  async function loadProducts() {
    try { setProducts(await api.getProducts()); } catch {}
  }

  async function preloadVariant(variantId) {
    try {
      const all = await api.getProducts();
      for (const p of all) {
        const prod = await api.getProduct(p.id);
        const v = prod.variants.find((v) => v.id === variantId);
        if (v) { setSelectedProduct(prod); setSelectedVariant(v); return; }
      }
    } catch {}
  }

  async function handleConnect() {
    try {
      await usbGetOrRequestDevice();
      toast.success("Printer connected via USB");
    } catch (err) {
      if (err.name === "NotFoundError") return;
      toast.error(err.message, err.name === "ClaimError" ? 8000 : 4000);
    }
  }

  async function handlePrint() {
    if (!selectedVariant && labelType !== 2) {
      toast.error("Select a product variant first");
      return;
    }
    if (labelType === 2 && (!infoTitle.trim() || !infoBrand.trim())) {
      toast.error("Brand and title are required for info labels");
      return;
    }

    setPrinting(true);
    toast.info("Printing…");

    try {
      const res = await api.renderLabel({
        variant_id: selectedVariant?.id ?? null,
        label_type: labelType,
        quantity,
        info_title: infoTitle,
        info_body: infoBody,
        info_brand: infoBrand,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Server error ${res.status}`);
      }

      const jobId = res.headers.get("X-Job-Id");
      const bytes = new Uint8Array(await res.arrayBuffer());

      await printBytes(bytes);

      if (jobId) await api.confirmPrint(jobId);
      toast.success(`Done — ${quantity > 1 ? `${quantity} labels` : "label"} printed!`);
    } catch (err) {
      if (err.name === "NotFoundError" || err.message?.includes("No device selected")) {
        toast.error("Printer not connected — use the Connect button above");
      } else if (err.name === "ClaimError") {
        toast.error(err.message, 8000);
      } else {
        toast.error(`Print failed: ${err.message}`, 6000);
      }
    } finally {
      setPrinting(false);
    }
  }

  const filtered = search
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          (p.brand || "").toLowerCase().includes(search.toLowerCase())
      )
    : products;

  const canPrint = selectedVariant || labelType === 2;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Quick Print</h1>
          <p className="text-secondary text-sm mt-1">Pick a product, choose label type, print.</p>
        </div>

        {/* Printer status */}
        {mode === "usb" ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="status-dot" style={{ width: 10, height: 10, background: usbConnected ? "var(--success)" : "var(--text-muted)" }} />
            <span className="text-sm" style={{ color: usbConnected ? "var(--success)" : "var(--text-muted)", fontWeight: 600 }}>
              {usbConnected ? "Printer ready" : "Not connected"}
            </span>
            <button className="btn btn-ghost btn-sm" onClick={handleConnect}>
              {usbConnected ? "Reconnect" : "Connect USB"}
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="status-dot" style={{ width: 10, height: 10, background: getPrinterIp() ? "var(--success)" : "var(--text-muted)" }} />
            <span className="text-sm" style={{ color: getPrinterIp() ? "var(--success)" : "var(--text-muted)", fontWeight: 600 }}>
              {getPrinterIp() ? `Network: ${getPrinterIp()}` : "No printer IP set"}
            </span>
          </div>
        )}
      </div>

      {!navigator.usb && mode === "usb" && (
        <div style={{ background: "var(--warning-bg)", border: "1px solid #f5d5a8", color: "var(--warning)", borderRadius: "var(--radius-sm)", padding: "12px 16px", marginBottom: 20, fontSize: "0.875rem", fontWeight: 500 }}>
          WebUSB requires Chrome or Edge. Or switch to Network mode in Settings.
        </div>
      )}

      <div className="print-layout">
        {/* Main — product selection */}
        <div className="print-main">
          {selectedProduct && selectedVariant && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: "var(--accent-light)", border: "1.5px solid var(--accent)", borderRadius: "var(--radius-sm)", padding: "12px 16px", marginBottom: 16, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 700, color: "var(--accent)", fontSize: "0.9375rem" }}>{selectedProduct.name}</div>
                <div className="text-sm text-secondary mt-1">
                  SKU: {selectedVariant.sku}
                  {selectedVariant.weight_g != null && ` · ${selectedVariant.weight_g}g`}
                  {selectedVariant.price_gbp != null && ` · £${Number(selectedVariant.price_gbp).toFixed(2)}`}
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => { setSelectedProduct(null); setSelectedVariant(null); }}>
                Change
              </button>
            </div>
          )}

          <div className="card">
            <h3 style={{ marginBottom: 14 }}>Select Product</h3>
            <div className="search-bar mb-3">
              <input type="search" placeholder="Search by name or brand…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div style={{ maxHeight: 340, overflowY: "auto" }}>
              {filtered.length === 0 && (
                <p className="text-muted text-sm" style={{ textAlign: "center", padding: "24px 0" }}>No products found</p>
              )}
              {filtered.map((p) => (
                <ProductRow
                  key={p.id}
                  product={p}
                  selectedVariantId={selectedVariant?.id}
                  onSelectVariant={(prod, v) => { setSelectedProduct(prod); setSelectedVariant(v); setSearch(""); }}
                />
              ))}
            </div>
          </div>

          {labelType === 2 && (
            <div className="card" style={{ marginTop: 16 }}>
              <h3 style={{ marginBottom: 14 }}>Info Label Content</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div className="form-group">
                  <label>Brand / Company Name *</label>
                  <input value={infoBrand} onChange={(e) => setInfoBrand(e.target.value)} placeholder="e.g. PicaNut" />
                </div>
                <div className="form-group">
                  <label>Title *</label>
                  <input value={infoTitle} onChange={(e) => setInfoTitle(e.target.value)} placeholder="e.g. Storage Instructions" />
                </div>
                <div className="form-group">
                  <label>Body Text</label>
                  <textarea value={infoBody} onChange={(e) => setInfoBody(e.target.value)} placeholder="Label body text…" style={{ minHeight: 120 }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar — print options */}
        <div className="print-sidebar">
          <div className="card">
            <h3 style={{ marginBottom: 18 }}>Print Options</h3>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", marginBottom: 10 }}>Label Type</label>
              {LABEL_TYPES.map((lt) => (
                <label key={lt.value} className={`label-type-option${labelType === lt.value ? " selected" : ""}`}>
                  <input type="radio" name="label_type" value={lt.value} checked={labelType === lt.value} onChange={() => setLabelType(lt.value)} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.9rem", lineHeight: 1.3 }}>{lt.label}</div>
                    <div className="text-xs text-muted" style={{ marginTop: 3 }}>{lt.desc}</div>
                  </div>
                </label>
              ))}
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", marginBottom: 10 }}>Quantity</label>
              <div className="qty-stepper">
                <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))}>−</button>
                <input type="number" min="1" max="999" value={quantity} onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))} />
                <button type="button" onClick={() => setQuantity((q) => Math.min(999, q + 1))}>+</button>
              </div>
            </div>

            <button className="btn btn-primary btn-lg w-full" onClick={handlePrint} disabled={printing || !canPrint}>
              {printing ? <><span className="spinner" /> Printing…</> : `Print${quantity > 1 ? ` ${quantity}×` : ""} Label`}
            </button>

            {!canPrint && (
              <p className="text-xs text-muted" style={{ textAlign: "center", marginTop: 10 }}>
                {labelType === 2 ? "Fill in brand and title above" : "Select a variant to enable printing"}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductRow({ product, selectedVariantId, onSelectVariant }) {
  const [expanded, setExpanded] = useState(false);
  const [variants, setVariants] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleExpand() {
    if (expanded) { setExpanded(false); return; }
    if (!variants) {
      setLoading(true);
      try { setVariants((await api.getProduct(product.id)).variants); } catch {} finally { setLoading(false); }
    }
    setExpanded(true);
  }

  const isSelected = variants?.some((v) => v.id === selectedVariantId);

  return (
    <div style={{ borderBottom: "1px solid var(--border)" }}>
      <button type="button" onClick={handleExpand} style={{ width: "100%", background: isSelected ? "var(--accent-light)" : "none", border: "none", padding: "11px 4px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontFamily: "var(--font)", textAlign: "left" }}>
        <span style={{ color: "var(--text-muted)", fontSize: 11, minWidth: 10 }}>{loading ? "…" : expanded ? "▼" : "▶"}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, color: "var(--text)", fontSize: "0.9375rem" }}>{product.name}</div>
          {product.brand && <div className="text-xs text-muted" style={{ marginTop: 1 }}>{product.brand}</div>}
        </div>
        <span className="text-xs text-muted" style={{ flexShrink: 0 }}>{product.variant_count} SKU{product.variant_count !== 1 ? "s" : ""}</span>
      </button>

      {expanded && variants && (
        <div style={{ paddingBottom: 8, paddingLeft: 20 }}>
          {variants.length === 0 && <p className="text-xs text-muted" style={{ padding: "6px 0 10px" }}>No variants yet</p>}
          {variants.map((v) => {
            const sel = v.id === selectedVariantId;
            return (
              <button key={v.id} type="button" onClick={() => onSelectVariant(product, v)}
                style={{ width: "100%", background: sel ? "var(--accent-light)" : "var(--bg-secondary)", border: `1.5px solid ${sel ? "var(--accent)" : "transparent"}`, borderRadius: "var(--radius-sm)", padding: "10px 14px", marginBottom: 6, display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontFamily: "var(--font)", textAlign: "left" }}>
                <span style={{ fontWeight: 700, fontSize: "0.875rem", color: sel ? "var(--accent)" : "var(--text)" }}>{v.sku}</span>
                {v.weight_g != null && <span className="text-sm text-secondary">{v.weight_g}g</span>}
                {v.barcode && <span className="text-xs text-muted">{v.barcode}</span>}
                {v.price_gbp != null && <span style={{ marginLeft: "auto", fontSize: "0.9rem", fontWeight: 700, color: sel ? "var(--accent)" : "var(--text)" }}>£{Number(v.price_gbp).toFixed(2)}</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

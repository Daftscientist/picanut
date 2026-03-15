import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api.js";
import { useToast } from "../components/Toast.jsx";
import {
  printBytes,
  getSelectedPrinter,
} from "../printer.js";

// Re-export for legacy imports (Dashboard)
export { printBytes as sendBytesToPrinter };

const LABEL_TYPES = [
  { value: 1, icon: "🏷", label: "Shelf Label",   desc: "Name · weight · price · barcode" },
  { value: 2, icon: "📄", label: "Info Label",    desc: "Brand · title · body text" },
  { value: 3, icon: "📋", label: "Product Info",  desc: "Full info with nutrition table" },
  { value: 4, icon: "🔤", label: "Title Label",   desc: "Large centred name · price · barcode" },
];

export default function PrintPreview() {
  const [searchParams] = useSearchParams();
  const toast = useToast();

  const printerReady = !!getSelectedPrinter();

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
      toast.error(`Print failed: ${err.message}`, 6000);
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

  function handleDeselect() {
    setSelectedProduct(null);
    setSelectedVariant(null);
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 36,
              height: 36,
              background: "var(--accent-bg)",
              borderRadius: "var(--rs)",
              fontSize: 18,
            }}>✏️</span>
            Label Designer
          </h1>
          <p className="text-secondary text-sm mt-2">Choose a product, pick a label type, and print.</p>
        </div>
      </div>

      {/* Agent / printer status banner */}
      <div className={`printer-banner ${printerReady ? "connected" : "disconnected"}`}>
        <span style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: printerReady ? "var(--ok)" : "var(--warn)",
          flexShrink: 0,
          boxShadow: printerReady ? "0 0 0 3px var(--ok-bg)" : "0 0 0 3px var(--warn-bg)",
        }} />
        {printerReady ? (
          <span>
            Printer ready — <strong>{getSelectedPrinter()}</strong>
          </span>
        ) : (
          <span>
            No printer selected — <a href="/settings" style={{ color: "var(--warn)", fontWeight: 700 }}>Set up in Settings →</a>
          </span>
        )}
      </div>

      <div className="print-layout">
        {/* Left — product selection */}
        <div className="print-main">

          {/* Selected variant chip */}
          {selectedProduct && selectedVariant && (
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              background: "var(--accent-bg)",
              border: "1.5px solid var(--accent)",
              borderRadius: "var(--rs)",
              padding: "12px 16px",
              marginBottom: 14,
              flexWrap: "wrap",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{
                  width: 34,
                  height: 34,
                  background: "var(--accent)",
                  borderRadius: "var(--rs)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: 16,
                  flexShrink: 0,
                }}>🏷</span>
                <div>
                  <div style={{ fontWeight: 700, color: "var(--accent-fg)", fontSize: "0.9375rem" }}>
                    {selectedProduct.name}
                  </div>
                  <div className="text-xs mt-1" style={{ color: "var(--accent)" }}>
                    SKU: {selectedVariant.sku}
                    {selectedVariant.weight_g != null && ` · ${selectedVariant.weight_g}g`}
                    {selectedVariant.price_gbp != null && ` · £${Number(selectedVariant.price_gbp).toFixed(2)}`}
                  </div>
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={handleDeselect}>
                ✕ Change
              </button>
            </div>
          )}

          {/* Product picker card */}
          <div className="card">
            <div className="ch">
              <div>
                <div style={{ fontWeight: 600, fontSize: "0.9375rem" }}>Select Product</div>
                <div className="text-xs text-secondary mt-1">{products.length} products</div>
              </div>
            </div>
            <div className="ct" style={{ paddingBottom: 0 }}>
              <div className="srch mb-3">
                <input
                  type="search"
                  className="fi"
                  placeholder="Search by name or brand…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div style={{ maxHeight: 380, overflowY: "auto", paddingBottom: 4 }}>
              {filtered.length === 0 && (
                <div className="empty-state" style={{ padding: "28px 20px" }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>🔍</div>
                  <p className="text-sm text-muted">No products found</p>
                </div>
              )}
              {filtered.map((p) => (
                <ProductRow
                  key={p.id}
                  product={p}
                  selectedVariantId={selectedVariant?.id}
                  onSelectVariant={(prod, v) => {
                    setSelectedProduct(prod);
                    setSelectedVariant(v);
                    setSearch("");
                  }}
                />
              ))}
            </div>
          </div>

          {/* Info label fields */}
          {labelType === 2 && (
            <div className="card" style={{ marginTop: 16 }}>
              <div className="ch">
                <div>
                  <div style={{ fontWeight: 600, fontSize: "0.9375rem" }}>Info Label Content</div>
                  <div className="text-xs text-secondary mt-1">Fill in the text for this custom label</div>
                </div>
              </div>
              <div className="ct">
                <div className="fg">
                  <label className="fl">Brand / Company Name *</label>
                  <input
                    className="fi"
                    value={infoBrand}
                    onChange={(e) => setInfoBrand(e.target.value)}
                    placeholder="e.g. PicaNut"
                  />
                </div>
                <div className="fg">
                  <label className="fl">Title *</label>
                  <input
                    className="fi"
                    value={infoTitle}
                    onChange={(e) => setInfoTitle(e.target.value)}
                    placeholder="e.g. Storage Instructions"
                  />
                </div>
                <div className="fg" style={{ marginBottom: 0 }}>
                  <label className="fl">Body Text</label>
                  <textarea
                    className="fi-ta"
                    value={infoBody}
                    onChange={(e) => setInfoBody(e.target.value)}
                    placeholder="Label body text…"
                    style={{ minHeight: 120 }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right — print options */}
        <div className="print-sidebar">
          <div className="card">
            <div className="ch">
              <div style={{ fontWeight: 600, fontSize: "0.9375rem" }}>Print Options</div>
            </div>
            <div className="ct">

              {/* Label type */}
              <div className="fg" style={{ gap: 6, marginBottom: 20 }}>
                <label className="fl">Label Type</label>
                {LABEL_TYPES.map((lt) => (
                  <div
                    key={lt.value}
                    className={`label-type-option${labelType === lt.value ? " selected" : ""}`}
                    onClick={() => setLabelType(lt.value)}
                  >
                    <span style={{
                      fontSize: 20,
                      lineHeight: 1,
                      flexShrink: 0,
                      marginTop: 1,
                    }}>{lt.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: "0.875rem", lineHeight: 1.3, color: "var(--text)" }}>
                        {lt.label}
                      </div>
                      <div className="text-xs text-muted" style={{ marginTop: 3, lineHeight: 1.4 }}>
                        {lt.desc}
                      </div>
                    </div>
                    <span style={{
                      width: 16,
                      height: 16,
                      borderRadius: "50%",
                      border: `2px solid ${labelType === lt.value ? "var(--accent)" : "var(--border2)"}`,
                      background: labelType === lt.value ? "var(--accent)" : "transparent",
                      flexShrink: 0,
                      marginTop: 2,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.15s",
                    }}>
                      {labelType === lt.value && (
                        <span style={{ color: "#fff", fontSize: 9, fontWeight: 800, lineHeight: 1 }}>✓</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>

              {/* Quantity */}
              <div className="fg" style={{ marginBottom: 22 }}>
                <label className="fl">Quantity</label>
                <div className="qty-stepper">
                  <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))}>−</button>
                  <input
                    type="number"
                    min="1"
                    max="999"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  />
                  <button type="button" onClick={() => setQuantity((q) => Math.min(999, q + 1))}>+</button>
                </div>
              </div>

              {/* Print button */}
              <button
                className="btn btn-primary btn-lg w-full"
                onClick={handlePrint}
                disabled={printing || !canPrint}
              >
                {printing ? (
                  <><span className="spinner" /> Printing…</>
                ) : (
                  <>{quantity > 1 ? `Print ${quantity}× Label` : "Print Label"}</>
                )}
              </button>

              {!canPrint && (
                <p className="text-xs text-muted" style={{ textAlign: "center", marginTop: 10, lineHeight: 1.5 }}>
                  {labelType === 2
                    ? "Fill in brand and title above to print"
                    : "Select a product variant to enable printing"}
                </p>
              )}

              {canPrint && !printerReady && (
                <p className="text-xs" style={{ textAlign: "center", marginTop: 10, color: "var(--warn)", lineHeight: 1.5 }}>
                  Printer not configured — <a href="/settings" style={{ color: "var(--warn)", fontWeight: 700 }}>Settings</a>
                </p>
              )}
            </div>
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
      <button
        type="button"
        onClick={handleExpand}
        style={{
          width: "100%",
          background: isSelected ? "var(--accent-bg)" : "none",
          border: "none",
          padding: "12px 20px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          cursor: "pointer",
          fontFamily: "var(--font)",
          textAlign: "left",
          transition: "background 0.15s",
        }}
      >
        <span style={{
          color: "var(--text3)",
          fontSize: 10,
          minWidth: 12,
          transition: "transform 0.15s",
          transform: expanded ? "rotate(90deg)" : "none",
          display: "inline-block",
        }}>
          {loading ? "…" : "▶"}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, color: isSelected ? "var(--accent-fg)" : "var(--text)", fontSize: "0.875rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {product.name}
          </div>
          {product.brand && (
            <div className="text-xs text-muted" style={{ marginTop: 1 }}>{product.brand}</div>
          )}
        </div>
        <span className="text-xs" style={{ flexShrink: 0, color: "var(--text3)" }}>
          {product.variant_count} SKU{product.variant_count !== 1 ? "s" : ""}
        </span>
      </button>

      {expanded && variants && (
        <div style={{ paddingBottom: 8, paddingLeft: 20, paddingRight: 12 }}>
          {variants.length === 0 && (
            <p className="text-xs text-muted" style={{ padding: "6px 0 10px" }}>No variants yet</p>
          )}
          {variants.map((v) => {
            const sel = v.id === selectedVariantId;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => onSelectVariant(product, v)}
                style={{
                  width: "100%",
                  background: sel ? "var(--accent-bg)" : "var(--surface2)",
                  border: `1.5px solid ${sel ? "var(--accent)" : "var(--border)"}`,
                  borderRadius: "var(--rs)",
                  padding: "9px 13px",
                  marginBottom: 6,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                  fontFamily: "var(--font)",
                  textAlign: "left",
                  transition: "all 0.15s",
                }}
              >
                <span style={{ fontWeight: 700, fontSize: "0.8125rem", color: sel ? "var(--accent)" : "var(--text)", flexShrink: 0 }}>
                  {v.sku}
                </span>
                {v.weight_g != null && (
                  <span className="text-xs text-secondary">{v.weight_g}g</span>
                )}
                {v.barcode && (
                  <span className="text-xs text-muted" style={{ fontFamily: "var(--mono)" }}>{v.barcode}</span>
                )}
                {v.price_gbp != null && (
                  <span style={{ marginLeft: "auto", fontSize: "0.8125rem", fontWeight: 700, color: sel ? "var(--accent)" : "var(--text)", flexShrink: 0 }}>
                    £{Number(v.price_gbp).toFixed(2)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../api.js";
import { useToast } from "../components/Toast.jsx";

const NUTRITION_FIELDS = [
  { key: "energy_kj", label: "Energy (kJ)", unit: "kJ" },
  { key: "energy_kcal", label: "Energy (kcal)", unit: "kcal" },
  { key: "fat", label: "Fat", unit: "g" },
  { key: "saturates", label: "of which saturates", unit: "g" },
  { key: "carbs", label: "Carbohydrates", unit: "g" },
  { key: "sugars", label: "of which sugars", unit: "g" },
  { key: "fibre", label: "Fibre", unit: "g" },
  { key: "protein", label: "Protein", unit: "g" },
  { key: "salt", label: "Salt", unit: "g" },
];

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [product, setProduct] = useState(null);
  const [allTags, setAllTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [showAddVariant, setShowAddVariant] = useState(false);
  const [editingVariant, setEditingVariant] = useState(null);
  const [deletingProduct, setDeletingProduct] = useState(false);

  async function load() {
    try {
      const [prod, tags] = await Promise.all([api.getProduct(id), api.getTags()]);
      setProduct(prod);
      setAllTags(tags);
      setEditForm({
        name: prod.name,
        brand: prod.brand || "",
        description: prod.description || "",
        tag_ids: prod.tags.map((t) => t.id),
      });
    } catch (err) {
      toast.error("Product not found");
      navigate("/products");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  function toggleTag(tagId) {
    setEditForm((f) => ({
      ...f,
      tag_ids: f.tag_ids.includes(tagId)
        ? f.tag_ids.filter((t) => t !== tagId)
        : [...f.tag_ids, tagId],
    }));
  }

  async function handleSaveProduct(e) {
    e.preventDefault();
    if (!editForm.name.trim()) { toast.error("Name required"); return; }
    setSaving(true);
    try {
      await api.updateProduct(id, editForm);
      toast.success("Product saved");
      setEditing(false);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteProduct() {
    if (!confirm(`Delete "${product.name}"? This will also delete all variants.`)) return;
    setDeletingProduct(true);
    try {
      await api.deleteProduct(id);
      toast.success("Product deleted");
      navigate("/products");
    } catch (err) {
      toast.error(err.message);
      setDeletingProduct(false);
    }
  }

  if (loading) {
    return (
      <div className="page" style={{ textAlign: "center", paddingTop: 80 }}>
        <span className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

  return (
    <div className="page">
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, fontSize: "0.875rem" }}>
        <Link to="/products" style={{ color: "var(--text-muted)" }}>Products</Link>
        <span style={{ color: "var(--text-muted)" }}>›</span>
        <span style={{ color: "var(--text-secondary)" }}>{product.name}</span>
      </div>

      {/* Product Header */}
      <div className="card" style={{ marginBottom: 24 }}>
        {editing ? (
          <form onSubmit={handleSaveProduct} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="grid-2">
              <div className="form-group">
                <label>Product Name *</label>
                <input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>Brand</label>
                <input
                  value={editForm.brand}
                  onChange={(e) => setEditForm({ ...editForm, brand: e.target.value })}
                />
              </div>
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                style={{ minHeight: 80 }}
              />
            </div>
            <div className="form-group">
              <label>Tags</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {allTags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    className="btn btn-sm"
                    style={
                      editForm.tag_ids.includes(tag.id)
                        ? { background: tag.colour, color: "white", borderColor: tag.colour }
                        : { background: "var(--bg-tertiary)", border: "1px solid var(--border)" }
                    }
                    onClick={() => toggleTag(tag.id)}
                  >
                    {tag.name}
                  </button>
                ))}
                {allTags.length === 0 && (
                  <span className="text-muted text-sm">No tags yet — create them in Settings</span>
                )}
              </div>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <span className="spinner" /> : "Save Changes"}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setEditing(false)}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div>
            <div className="card-header" style={{ marginBottom: 12 }}>
              <div>
                <h1 style={{ fontSize: "1.5rem", marginBottom: 4 }}>{product.name}</h1>
                {product.brand && (
                  <span style={{ fontWeight: 600, color: "var(--text-secondary)", fontSize: "0.9375rem" }}>
                    {product.brand}
                  </span>
                )}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>
                  Edit
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={handleDeleteProduct}
                  disabled={deletingProduct}
                >
                  Delete
                </button>
              </div>
            </div>
            {product.description && (
              <p style={{ color: "var(--text-secondary)", marginBottom: 12 }}>{product.description}</p>
            )}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {product.tags.map((tag) => (
                <span key={tag.id} className="tag-badge" style={{ background: tag.colour }}>
                  {tag.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Variants */}
      <div className="section">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2>Variants ({product.variants.length})</h2>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAddVariant(true)}>
            + Add Variant
          </button>
        </div>

        {product.variants.length === 0 ? (
          <div className="card">
            <div className="empty-state" style={{ padding: "40px 20px" }}>
              <h3>No variants yet</h3>
              <p style={{ marginBottom: 16 }}>Add a variant with SKU, barcode, weight and price.</p>
              <button className="btn btn-primary btn-sm" onClick={() => setShowAddVariant(true)}>
                Add Variant
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {product.variants.map((variant) => (
              <VariantCard
                key={variant.id}
                variant={variant}
                onEdit={() => setEditingVariant(variant)}
                onDeleted={() => load()}
                productName={product.name}
              />
            ))}
          </div>
        )}
      </div>

      {showAddVariant && (
        <VariantModal
          productId={product.id}
          onClose={() => setShowAddVariant(false)}
          onSaved={() => { setShowAddVariant(false); load(); }}
        />
      )}
      {editingVariant && (
        <VariantModal
          productId={product.id}
          variant={editingVariant}
          onClose={() => setEditingVariant(null)}
          onSaved={() => { setEditingVariant(null); load(); }}
        />
      )}
    </div>
  );
}

function VariantCard({ variant, onEdit, onDeleted, productName }) {
  const toast = useToast();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete variant ${variant.sku}?`)) return;
    setDeleting(true);
    try {
      await api.deleteVariant(variant.id);
      toast.success("Variant deleted");
      onDeleted();
    } catch (err) {
      toast.error(err.message);
      setDeleting(false);
    }
  }

  return (
    <div className="card" style={{ padding: "16px 20px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <code
              style={{
                background: "var(--bg-tertiary)",
                padding: "3px 8px",
                borderRadius: 4,
                fontSize: "0.875rem",
                fontFamily: "monospace",
                fontWeight: 700,
              }}
            >
              {variant.sku}
            </code>
            {!variant.is_active && (
              <span style={{ fontSize: "0.8125rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                Inactive
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap", fontSize: "0.9375rem" }}>
            {variant.barcode && (
              <div>
                <span className="text-muted" style={{ fontSize: "0.8125rem" }}>Barcode</span>
                <div style={{ fontWeight: 600 }}>{variant.barcode}</div>
              </div>
            )}
            {variant.weight_g != null && (
              <div>
                <span className="text-muted" style={{ fontSize: "0.8125rem" }}>Weight</span>
                <div style={{ fontWeight: 600 }}>{variant.weight_g}g</div>
              </div>
            )}
            {variant.price_gbp != null && (
              <div>
                <span className="text-muted" style={{ fontSize: "0.8125rem" }}>Price</span>
                <div style={{ fontWeight: 600, color: "var(--accent)" }}>£{Number(variant.price_gbp).toFixed(2)}</div>
              </div>
            )}
            {variant.nutrition_json && (
              <div>
                <span className="text-muted" style={{ fontSize: "0.8125rem" }}>Nutrition</span>
                <div style={{ fontWeight: 600, color: "var(--success)" }}>✓ Set</div>
              </div>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <Link
            to={`/print?variant_id=${variant.id}`}
            className="btn btn-ghost btn-sm"
            title="Print label"
          >
            Print
          </Link>
          <button className="btn btn-ghost btn-sm" onClick={onEdit}>Edit</button>
          <button className="btn btn-danger btn-sm" onClick={handleDelete} disabled={deleting}>
            {deleting ? <span className="spinner" /> : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

function VariantModal({ productId, variant, onClose, onSaved }) {
  const toast = useToast();
  const isEdit = !!variant;
  const [form, setForm] = useState({
    sku: variant?.sku || "",
    barcode: variant?.barcode || "",
    weight_g: variant?.weight_g ?? "",
    price_gbp: variant?.price_gbp ?? "",
    is_active: variant?.is_active ?? true,
    nutrition_json: variant?.nutrition_json || null,
  });
  const [showNutrition, setShowNutrition] = useState(!!variant?.nutrition_json);
  const [nutrition, setNutrition] = useState(
    variant?.nutrition_json || Object.fromEntries(NUTRITION_FIELDS.map((f) => [f.key, ""]))
  );
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.sku.trim()) { toast.error("SKU required"); return; }
    setSaving(true);
    const payload = {
      ...form,
      weight_g: form.weight_g !== "" ? Number(form.weight_g) : null,
      price_gbp: form.price_gbp !== "" ? Number(form.price_gbp) : null,
      nutrition_json: showNutrition ? nutrition : null,
    };
    try {
      if (isEdit) {
        await api.updateVariant(variant.id, payload);
        toast.success("Variant updated");
      } else {
        await api.createVariant(productId, payload);
        toast.success("Variant created");
      }
      onSaved();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 600 }}>
        <div className="modal-header">
          <h2>{isEdit ? "Edit Variant" : "Add Variant"}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="grid-2">
            <div className="form-group">
              <label>SKU *</label>
              <input
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                placeholder="e.g. GRN-500G"
                autoFocus={!isEdit}
              />
            </div>
            <div className="form-group">
              <label>Barcode</label>
              <input
                value={form.barcode}
                onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                placeholder="e.g. 5012345678900"
              />
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label>Weight (g)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.weight_g}
                onChange={(e) => setForm({ ...form, weight_g: e.target.value })}
                placeholder="e.g. 500"
              />
            </div>
            <div className="form-group">
              <label>Price (£)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.price_gbp}
                onChange={(e) => setForm({ ...form, price_gbp: e.target.value })}
                placeholder="e.g. 4.99"
              />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input
              type="checkbox"
              id="is_active"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              style={{ width: "auto" }}
            />
            <label htmlFor="is_active" style={{ margin: 0, cursor: "pointer" }}>Active variant</label>
          </div>

          {/* Nutrition toggle */}
          <div>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setShowNutrition(!showNutrition)}
            >
              {showNutrition ? "▲ Hide" : "▼ Add"} Nutrition Info
            </button>
          </div>

          {showNutrition && (
            <div
              style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                padding: 16,
              }}
            >
              <p style={{ fontSize: "0.875rem", fontWeight: 700, marginBottom: 12, color: "var(--text)" }}>
                Nutrition per 100g
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                {NUTRITION_FIELDS.map((field) => (
                  <div key={field.key} className="form-group">
                    <label style={{ fontSize: "0.8125rem" }}>{field.label}</label>
                    <div style={{ position: "relative" }}>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={nutrition[field.key] ?? ""}
                        onChange={(e) => setNutrition({ ...nutrition, [field.key]: e.target.value })}
                        style={{ paddingRight: field.unit.length > 2 ? 50 : 36 }}
                      />
                      <span
                        style={{
                          position: "absolute",
                          right: 10,
                          top: "50%",
                          transform: "translateY(-50%)",
                          fontSize: "0.8125rem",
                          color: "var(--text-muted)",
                          pointerEvents: "none",
                        }}
                      >
                        {field.unit}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="spinner" /> : isEdit ? "Save Changes" : "Add Variant"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useToast } from "../components/Toast.jsx";

export default function Products() {
  const toast = useToast();
  const [products, setProducts] = useState([]);
  const [tags, setTags] = useState([]);
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (activeTag) params.tag_id = activeTag;
      const data = await api.getProducts(params);
      setProducts(data);
    } catch (err) {
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  }, [search, activeTag]);

  useEffect(() => {
    api.getTags().then(setTags).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(fetchProducts, 200);
    return () => clearTimeout(t);
  }, [fetchProducts]);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Products</h1>
          <p className="text-secondary text-sm mt-1">
            {products.length} product{products.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowAddModal(true)}
        >
          + Add Product
        </button>
      </div>

      {/* Search + Tag Filter */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <div className="search-bar" style={{ minWidth: 240 }}>
          <input
            type="search"
            placeholder="Search products…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            className="btn btn-sm"
            style={{
              ...(activeTag === "" ? activeTagStyle : inactiveTagStyle),
            }}
            onClick={() => setActiveTag("")}
          >
            All
          </button>
          {tags.map((tag) => (
            <button
              key={tag.id}
              className="btn btn-sm"
              style={{
                ...(activeTag === tag.id ? activeTagStyle : inactiveTagStyle),
                ...(activeTag === tag.id ? { background: tag.colour, color: "white", borderColor: tag.colour } : {}),
              }}
              onClick={() => setActiveTag(activeTag === tag.id ? "" : tag.id)}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: activeTag === tag.id ? "white" : tag.colour,
                  display: "inline-block",
                  flexShrink: 0,
                }}
              />
              {tag.name}
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 60 }}>
          <span className="spinner" style={{ width: 28, height: 28 }} />
        </div>
      ) : products.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: 48, marginBottom: 12 }}>📦</div>
          <h3>No products found</h3>
          <p style={{ marginBottom: 20 }}>
            {search || activeTag ? "Try a different search or filter" : "Add your first product to get started"}
          </p>
          {!search && !activeTag && (
            <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
              Add Product
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {products.map((product) => (
            <Link key={product.id} to={`/products/${product.id}`} style={{ textDecoration: "none" }}>
              <div className="card" style={{ cursor: "pointer", transition: "box-shadow 0.15s", padding: "16px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                      <h3 style={{ fontSize: "1rem", margin: 0 }}>{product.name}</h3>
                      {product.tags.map((tag) => (
                        <span
                          key={tag.id}
                          className="tag-badge"
                          style={{ background: tag.colour, fontSize: "0.75rem", padding: "2px 8px" }}
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                    <p
                      className="text-secondary"
                      style={{ fontSize: "0.875rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                    >
                      {product.brand && <strong style={{ color: "var(--text)" }}>{product.brand} · </strong>}
                      {product.description || "No description"}
                    </p>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <span style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
                      {product.variant_count} variant{product.variant_count !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <span style={{ color: "var(--text-muted)", fontSize: 18 }}>›</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {showAddModal && (
        <AddProductModal
          tags={tags}
          onClose={() => setShowAddModal(false)}
          onCreated={() => {
            setShowAddModal(false);
            fetchProducts();
          }}
        />
      )}
    </div>
  );
}

function AddProductModal({ tags, onClose, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState({ name: "", brand: "", description: "", tag_ids: [] });
  const [loading, setLoading] = useState(false);

  function toggleTag(id) {
    setForm((f) => ({
      ...f,
      tag_ids: f.tag_ids.includes(id) ? f.tag_ids.filter((t) => t !== id) : [...f.tag_ids, id],
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    setLoading(true);
    try {
      await api.createProduct(form);
      toast.success("Product created");
      onCreated();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>Add Product</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="form-group">
            <label>Product Name *</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Organic Granola"
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>Brand</label>
            <input
              value={form.brand}
              onChange={(e) => setForm({ ...form, brand: e.target.value })}
              placeholder="e.g. NutriCo"
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Short product description"
              style={{ minHeight: 80 }}
            />
          </div>
          {tags.length > 0 && (
            <div className="form-group">
              <label>Tags</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {tags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    className="btn btn-sm"
                    style={{
                      ...(form.tag_ids.includes(tag.id)
                        ? { background: tag.colour, color: "white", borderColor: tag.colour }
                        : { background: "var(--bg-tertiary)", color: "var(--text)", border: "1px solid var(--border)" }),
                    }}
                    onClick={() => toggleTag(tag.id)}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" /> : "Create Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const activeTagStyle = {
  background: "var(--accent)",
  color: "white",
  border: "1px solid var(--accent)",
};
const inactiveTagStyle = {
  background: "var(--bg-tertiary)",
  color: "var(--text)",
  border: "1px solid var(--border)",
};

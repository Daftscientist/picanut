import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

const ToastContext = createContext(null);

export function useToast() {
  return useContext(ToastContext);
}

let toastCount = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "info", duration = 3500) => {
    const id = ++toastCount;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = {
    success: (msg, dur) => addToast(msg, "success", dur),
    error: (msg, dur) => addToast(msg, "error", dur || 5000),
    info: (msg, dur) => addToast(msg, "info", dur),
    warning: (msg, dur) => addToast(msg, "warning", dur),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div style={styles.container}>
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} onClose={() => removeToast(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function Toast({ toast, onClose }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const icons = {
    success: "✓",
    error: "✕",
    info: "ℹ",
    warning: "⚠",
  };

  const colors = {
    success: { bg: "var(--success-bg)", color: "var(--success)", border: "#b8e4bf" },
    error: { bg: "var(--error-bg)", color: "var(--error)", border: "#f5c6c2" },
    info: { bg: "#e8f4fd", color: "#1565c0", border: "#b3d9f5" },
    warning: { bg: "var(--warning-bg)", color: "var(--warning)", border: "#ffe0b2" },
  };

  const c = colors[toast.type] || colors.info;

  return (
    <div
      style={{
        ...styles.toast,
        background: c.bg,
        color: c.color,
        border: `1px solid ${c.border}`,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(12px)",
      }}
    >
      <span style={styles.icon}>{icons[toast.type]}</span>
      <span style={{ ...styles.message, whiteSpace: "pre-line" }}>{toast.message}</span>
      <button style={{ ...styles.closeBtn, color: c.color }} onClick={onClose}>
        ✕
      </button>
    </div>
  );
}

const styles = {
  container: {
    position: "fixed",
    bottom: 24,
    right: 24,
    display: "flex",
    flexDirection: "column",
    gap: 10,
    zIndex: 9999,
    maxWidth: 380,
    width: "calc(100vw - 48px)",
  },
  toast: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "12px 16px",
    borderRadius: "var(--radius-md)",
    boxShadow: "var(--shadow-md)",
    fontSize: "0.9375rem",
    fontWeight: 500,
    transition: "opacity 0.2s, transform 0.2s",
  },
  icon: {
    fontSize: 16,
    fontWeight: 700,
    flexShrink: 0,
  },
  message: {
    flex: 1,
    lineHeight: 1.4,
  },
  closeBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "2px 4px",
    fontSize: 14,
    opacity: 0.7,
    flexShrink: 0,
    fontFamily: "inherit",
  },
};

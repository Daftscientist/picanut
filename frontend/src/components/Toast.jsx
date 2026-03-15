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
          <ToastItem key={t.id} toast={t} onClose={() => removeToast(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onClose }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => setVisible(true));
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  const config = {
    success: {
      icon: "✓",
      borderColor: "var(--ok)",
      iconBg: "var(--ok-bg)",
      iconColor: "var(--ok)",
    },
    error: {
      icon: "✕",
      borderColor: "var(--danger)",
      iconBg: "var(--danger-bg)",
      iconColor: "var(--danger)",
    },
    info: {
      icon: "i",
      borderColor: "var(--accent)",
      iconBg: "var(--accent-bg)",
      iconColor: "var(--accent-fg)",
    },
    warning: {
      icon: "!",
      borderColor: "var(--warn)",
      iconBg: "var(--warn-bg)",
      iconColor: "var(--warn)",
    },
  };

  const c = config[toast.type] || config.info;

  return (
    <div
      style={{
        ...styles.toast,
        borderLeftColor: c.borderColor,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(16px)",
      }}
    >
      <span
        style={{
          ...styles.iconBadge,
          background: c.iconBg,
          color: c.iconColor,
        }}
      >
        {c.icon}
      </span>
      <span style={{ ...styles.message, whiteSpace: "pre-line" }}>{toast.message}</span>
      <button style={styles.closeBtn} onClick={onClose} aria-label="Dismiss">
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
    pointerEvents: "none",
  },
  toast: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "13px 14px",
    borderRadius: "var(--rs)",
    background: "var(--surface)",
    color: "var(--text)",
    boxShadow: "var(--shadow-lg)",
    border: "1px solid var(--border)",
    borderLeft: "3px solid transparent",
    fontSize: "13px",
    fontWeight: 500,
    transition: "opacity 0.25s ease, transform 0.25s ease",
    pointerEvents: "all",
    lineHeight: 1.4,
  },
  iconBadge: {
    width: 22,
    height: 22,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 11,
    fontWeight: 800,
    flexShrink: 0,
    fontStyle: "normal",
    lineHeight: 1,
  },
  message: {
    flex: 1,
    lineHeight: 1.45,
  },
  closeBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "2px 4px",
    fontSize: 12,
    color: "var(--text3)",
    flexShrink: 0,
    fontFamily: "inherit",
    transition: "color 0.15s",
    lineHeight: 1,
    display: "flex",
    alignItems: "center",
  },
};

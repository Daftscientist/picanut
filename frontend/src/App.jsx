import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ToastProvider } from "./components/Toast.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Sidebar from "./components/Sidebar.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Products from "./pages/Products.jsx";
import ProductDetail from "./pages/ProductDetail.jsx";
import PrintPreview from "./pages/PrintPreview.jsx";
import Settings from "./pages/Settings.jsx";
import Agents from "./pages/Agents.jsx";
import Team from "./pages/Team.jsx";
import Billing from "./pages/Billing.jsx";
import Admin from "./pages/Admin.jsx";
import PrintQueue from "./pages/PrintQueue.jsx";
import Orders from "./pages/Orders.jsx";
import { api } from "./api.js";

function AppShell({ children }) {
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    api.getPendingOrders().then((orders) => {
      setPendingCount(orders.length);
    }).catch(() => {});
    const t = setInterval(() => {
      api.getPendingOrders().then((orders) => setPendingCount(orders.length)).catch(() => {});
    }, 60000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="shell">
      <Sidebar pendingCount={pendingCount} />
      <div className="main">
        <div className="content">
          {children}
        </div>
      </div>
    </div>
  );
}

function Protected({ children, requireAdmin = false }) {
  return (
    <ProtectedRoute requireAdmin={requireAdmin}>
      <AppShell>{children}</AppShell>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/" element={<Protected><Dashboard /></Protected>} />
          <Route path="/products" element={<Protected><Products /></Protected>} />
          <Route path="/products/:id" element={<Protected><ProductDetail /></Protected>} />
          <Route path="/print" element={<Protected><PrintPreview /></Protected>} />
          <Route path="/queue" element={<Protected><PrintQueue /></Protected>} />
          <Route path="/orders" element={<Protected><Orders /></Protected>} />
          <Route path="/agents" element={<Protected><Agents /></Protected>} />
          <Route path="/team" element={<Protected><Team /></Protected>} />
          <Route path="/billing" element={<Protected><Billing /></Protected>} />
          <Route path="/settings" element={<Protected><Settings /></Protected>} />
          <Route path="/admin" element={<Protected requireAdmin><Admin /></Protected>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}

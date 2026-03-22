import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { RequireAuth } from './components/guards/RequireAuth';
import { RequirePlatformAdmin } from './components/guards/RequirePlatformAdmin';

import Landing from './pages/Landing';
import Pricing from './pages/Pricing';
import Login from './pages/Login';
import Signup from './pages/Signup';

import SidebarLayout from './layouts/SidebarLayout';
import OverlapLayout from './layouts/OverlapLayout';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import PrintLabel from './pages/PrintLabel';
import PrintQueue from './pages/PrintQueue';
import Products from './pages/Products';
import Agents from './pages/Agents';
import Team from './pages/Team';
import LabelDesigner from './pages/LabelDesigner';
import Billing from './pages/Billing';
import Intelligence from './pages/Intelligence';
import Support from './pages/Support';

import AdminPlans from './pages/AdminPlans';
import AdminOrgs from './pages/AdminOrgs';

import './index.css';

const LayoutSwitcher = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;

  // Managers and Platform Admins get the SidebarLayout
  if (user.role === 'manager' || user.is_platform_admin) {
    return <SidebarLayout />;
  }

  // Subusers (Employees) get the OverlapLayout
  return <OverlapLayout />;
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* App Routes (Role-based Layout) */}
          <Route path="/app" element={<RequireAuth><LayoutSwitcher /></RequireAuth>}>
            <Route index element={<Dashboard />} />
            <Route path="print" element={<PrintLabel />} />
            <Route path="print-queue" element={<PrintQueue />} />
            <Route path="orders" element={<Orders />} />
            <Route path="products" element={<Products />} />
            <Route path="agents" element={<Agents />} />
            <Route path="team" element={<Team />} />
            <Route path="billing" element={<Billing />} />
            <Route path="intelligence" element={<Intelligence />} />
            <Route path="support" element={<Support />} />
            <Route path="designer" element={<LabelDesigner />} />
          </Route>

          {/* Admin Routes (Shared SidebarLayout for consistent admin experience) */}
          <Route path="/admin" element={<RequireAuth><RequirePlatformAdmin><SidebarLayout /></RequirePlatformAdmin></RequireAuth>}>
            <Route index element={<Navigate to="/admin/plans" replace />} />
            <Route path="plans" element={<AdminPlans />} />
            <Route path="orgs" element={<AdminOrgs />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="bottom-right" />
    </AuthProvider>
  </React.StrictMode>
);

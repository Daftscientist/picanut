import React from "react";
import { Navigate } from "react-router-dom";
import { getToken } from "../api.js";

export default function ProtectedRoute({ children, requireAdmin = false }) {
  const token = getToken();
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin) {
    const isPlatformAdmin = localStorage.getItem("lf_is_platform_admin") === "true";
    if (!isPlatformAdmin) {
      return <Navigate to="/" replace />;
    }
  }

  return children;
}

const BASE = "";

function getToken() {
  return localStorage.getItem("lf_token");
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(method, path, body, options = {}) {
  const headers = {
    ...authHeaders(),
    ...(body !== undefined && !(body instanceof FormData)
      ? { "Content-Type": "application/json" }
      : {}),
    ...options.headers,
  };

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined
      ? body instanceof FormData
        ? body
        : JSON.stringify(body)
      : undefined,
    ...options,
  });

  if (res.status === 401) {
    localStorage.removeItem("lf_token");
    localStorage.removeItem("lf_username");
    window.location.href = "/login";
    throw new Error("Unauthorised");
  }

  if (options.raw) return res;

  if (res.status === 204 || res.headers.get("content-length") === "0") {
    return null;
  }

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/octet-stream")) {
    return res;
  }

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return data;
}

export const api = {
  get: (path, opts) => request("GET", path, undefined, opts),
  post: (path, body, opts) => request("POST", path, body, opts),
  put: (path, body, opts) => request("PUT", path, body, opts),
  delete: (path, opts) => request("DELETE", path, undefined, opts),

  // Auth
  login: (username, password) =>
    request("POST", "/api/auth/login", { username, password }),
  logout: () => request("POST", "/api/auth/logout"),
  me: () => request("GET", "/api/auth/me"),
  signup: (data) => request("POST", "/api/auth/signup", data),

  // Products
  getProducts: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request("GET", `/api/products${qs ? "?" + qs : ""}`);
  },
  createProduct: (data) => request("POST", "/api/products", data),
  getProduct: (id) => request("GET", `/api/products/${id}`),
  updateProduct: (id, data) => request("PUT", `/api/products/${id}`, data),
  deleteProduct: (id) => request("DELETE", `/api/products/${id}`),

  // Variants
  createVariant: (productId, data) =>
    request("POST", `/api/products/${productId}/variants`, data),
  updateVariant: (id, data) => request("PUT", `/api/variants/${id}`, data),
  deleteVariant: (id) => request("DELETE", `/api/variants/${id}`),

  // Tags
  getTags: () => request("GET", "/api/tags"),
  createTag: (data) => request("POST", "/api/tags", data),
  updateTag: (id, data) => request("PUT", `/api/tags/${id}`, data),
  deleteTag: (id) => request("DELETE", `/api/tags/${id}`),

  // Print
  renderLabel: (data) => request("POST", "/api/print/render", data, { raw: true }),
  confirmPrint: (jobId) => request("POST", `/api/print/${jobId}/confirm`),
  getPrintJobs: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request("GET", `/api/print/jobs${qs ? "?" + qs : ""}`);
  },
  getPendingOrders: () => request("GET", "/api/print/orders/pending"),
  printAllForOrder: (orderId) =>
    request("POST", `/api/print/orders/${orderId}/print-all`, {}, { raw: true }),

  // Agents (new)
  listAgents: () => request("GET", "/api/agents"),
  createAgent: (data) => request("POST", "/api/agents", data),
  getAgent: (id) => request("GET", `/api/agents/${id}`),
  updateAgent: (id, data) => request("PUT", `/api/agents/${id}`, data),
  deleteAgent: (id) => request("DELETE", `/api/agents/${id}`),
  regenerateAgentToken: (id) => request("POST", `/api/agents/${id}/regenerate-token`),
  setDefaultAgent: (id) => request("POST", `/api/agents/${id}/set-default`),
  setAgentAccess: (agentId, data) => request("PUT", `/api/agents/${agentId}/access`, data),

  // Billing (new)
  listPlans: () => request("GET", "/api/billing/plans"),
  billingStatus: () => request("GET", "/api/billing/status"),
  createCheckout: (planId) => request("POST", "/api/billing/checkout", { plan_id: planId }),
  openPortal: () => request("POST", "/api/billing/portal"),

  // Admin (new)
  adminListPlans: () => request("GET", "/api/admin/plans"),
  adminCreatePlan: (data) => request("POST", "/api/admin/plans", data),
  adminUpdatePlan: (id, data) => request("PUT", `/api/admin/plans/${id}`, data),
  adminDeletePlan: (id) => request("DELETE", `/api/admin/plans/${id}`),
  adminListOrgs: () => request("GET", "/api/admin/organizations"),
  adminGetOrg: (id) => request("GET", `/api/admin/organizations/${id}`),
  adminUpdateOrg: (id, data) => request("PUT", `/api/admin/organizations/${id}`, data),

  // Settings
  listUsers: () => request("GET", "/api/settings/users"),
  createUser: (data) => request("POST", "/api/settings/users", data),
  revokeSessions: () => request("POST", "/api/settings/revoke-sessions"),
  getUserSettings: () => request("GET", "/api/settings/user"),
  setUserDefaultAgent: (agentId) =>
    request("PUT", "/api/settings/user/default-agent", { agent_id: agentId }),

  // Agent + printers (updated)
  agentStatus: () => request("GET", "/api/agent/status"),
  listPrinters: (agentId) =>
    request("GET", `/api/printers${agentId ? "?agent_id=" + agentId : ""}`),
};

export { getToken };

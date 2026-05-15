/**
 * services/api.js — Central API client for the Escalation Tracker backend.
 * All functions return parsed JSON. Auto-attaches JWT from localStorage.
 */

const TOKEN_KEY = 'escalation_token';

function getToken() { return localStorage.getItem(TOKEN_KEY); }
export function setToken(t) { localStorage.setItem(TOKEN_KEY, t); }
export function clearToken() { localStorage.removeItem(TOKEN_KEY); }

async function request(url, opts = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { ...opts, headers });
  if (res.status === 401) {
    clearToken();
    alert("Session expired. Please login again.");
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  const data = await res.json();
  if (!res.ok && !data.success) throw new Error(data.message || 'Request failed');
  return data;
}

// ── Auth ──
export const authAPI = {
  login: (email, password) => request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => request('/api/auth/me'),
};

// ── Config ──
export const configAPI = {
  enums: () => request('/api/config/enums'),
};

// ── Complaints ──
export const complaintsAPI = {
  getAll: (filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
    return request(`/api/complaints?${params}`);
  },
  getById: (id) => request(`/api/complaints/${id}`),
  create: (data) => request('/api/complaints', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/api/complaints/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/api/complaints/${id}`, { method: 'DELETE' }),
  addAction: (id, text) => request(`/api/complaints/${id}/actions`, { method: 'POST', body: JSON.stringify({ text }) }),
  assign: (id, data) => request(`/api/complaints/${id}/assign`, { method: 'POST', body: JSON.stringify(data) }),
  validate: (id, data) => request(`/api/complaints/${id}/validate`, { method: 'POST', body: JSON.stringify(data) }),
  reject: (id) => request(`/api/complaints/${id}/reject`, { method: 'POST' }),
  aiClassify: (text) => request('/api/complaints/ai-classify', { method: 'POST', body: JSON.stringify({ text }) }),
};

// ── RCA / CAPA ──
export const rcaAPI = {
  submit: (id, data) => request(`/api/complaints/${id}/rca`, { method: 'POST', body: JSON.stringify(data) }),
  approve: (id) => request(`/api/complaints/${id}/rca/approve`, { method: 'POST' }),
  returnRca: (id) => request(`/api/complaints/${id}/rca/return`, { method: 'POST' }),
  aiRephrase: (id, data) => request(`/api/complaints/${id}/rca/ai-rephrase`, { method: 'POST', body: JSON.stringify(data) }),
};

// ── Closure ──
export const closureAPI = {
  soft: (id) => request(`/api/complaints/${id}/close/soft`, { method: 'POST' }),
  hard: (id, data) => request(`/api/complaints/${id}/close/hard`, { method: 'POST', body: JSON.stringify(data || {}) }),
};

// ── Emails ──
export const emailsAPI = {
  getAll: () => request('/api/emails'),
  sync: () => request('/api/emails/sync', { method: 'POST' }),
  processAI: (id) => request(`/api/emails/${id}/process-ai`, { method: 'POST' }),
  sendToQueue: (id, data) => request(`/api/emails/${id}/send-to-queue`, { method: 'POST', body: JSON.stringify(data || {}) }),
  reject: (id) => request(`/api/emails/${id}/reject`, { method: 'POST' }),
};

// ── Notifications ──
export const notificationsAPI = {
  getAll: () => request('/api/notifications'),
  markRead: (id) => request(`/api/notifications/${id}/read`, { method: 'PUT' }),
  markAllRead: () => request('/api/notifications/read-all', { method: 'PUT' }),
};

// ── Analytics ──
export const analyticsAPI = {
  dashboard: () => request('/api/analytics/dashboard'),
  reports: () => request('/api/analytics/reports'),
};

// ── Admin ──
export const adminAPI = {
  getUsers: () => request('/api/admin/users'),
  createUser: (data) => request('/api/admin/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id, data) => request(`/api/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id) => request(`/api/admin/users/${id}`, { method: 'DELETE' }),
  getDepartments: () => request('/api/admin/departments'),
  createDept: (data) => request('/api/admin/departments', { method: 'POST', body: JSON.stringify(data) }),
  updateDept: (id, data) => request(`/api/admin/departments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  getMatrix: () => request('/api/admin/matrix'),
  updateMatrix: (id, data) => request(`/api/admin/matrix/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
};

/**
 * TIMS Frontend API Service
 * Centralized HTTP client connecting React frontend to Express.js / PostgreSQL backend
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
const SERVER_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export const TOKEN_KEY = 'tims_auth_token';
export const USER_KEY = 'tims_auth_user';

// Clean up any legacy localStorage entries from insecure previous sessions
try {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem('tims_token');
  localStorage.removeItem('tims_complaints_v3');
  localStorage.removeItem('tims_contractors');
  localStorage.removeItem('tims_rate_cards');
} catch {
  // Ignore in non-browser environments
}

/**
 * Validates JWT token structure and expiration claim on the client
 */
export function isTokenValid(token) {
  if (!token || typeof token !== 'string') return false;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    // Decode base64url payload
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const decoded = JSON.parse(jsonPayload);
    if (decoded.exp && decoded.exp * 1000 <= Date.now()) {
      return false; // Expired
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * XSS Sanitizer: strips/escapes dangerous HTML characters
 */
export function sanitizeInput(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Low-level API request helper
 */
export async function apiRequest(endpoint, options = {}) {
  // Use sessionStorage (tab-isolated) to prevent token leakage across tabs or browsers
  let token = sessionStorage.getItem(TOKEN_KEY);

  // If token is expired, immediately purge it
  if (token && !isTokenValid(token)) {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    token = null;
    window.dispatchEvent(new Event('tims_auth_session_expired'));
    throw new Error('Your session has expired. Please sign in again.');
  }

  const defaultHeaders = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  // If sending FormData (file uploads), do NOT set Content-Type header (browser will set multipart boundary)
  if (options.body instanceof FormData) {
    delete defaultHeaders['Content-Type'];
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;

  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    // Handle 401 Unauthorized globally: purge session and notify app
    if (res.status === 401) {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(USER_KEY);
      window.dispatchEvent(new Event('tims_auth_unauthorized'));
    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errorMessage = data?.error?.message || data?.message || `Request failed with status ${res.status}`;
      const err = new Error(errorMessage);
      err.status = res.status;
      err.code = data?.error?.code;
      throw err;
    }

    return data;
  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      throw new Error('Cannot connect to backend server. Make sure the backend is running on port 5000.');
    }
    throw err;
  }
}

/**
 * Authentication API Service (using tab-isolated sessionStorage)
 */
export const authApi = {
  /**
   * Log in user with credentials and persist session token in sessionStorage
   */
  async login(emailOrUsername, password) {
    const res = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: emailOrUsername,
        password,
      }),
    });

    if (res.data?.token) {
      sessionStorage.setItem(TOKEN_KEY, res.data.token);
      sessionStorage.setItem(USER_KEY, JSON.stringify(res.data.user));
    }

    return res.data;
  },

  /**
   * Fetch current authenticated user profile
   */
  async getMe() {
    const res = await apiRequest('/auth/me');
    if (res.data?.user) {
      sessionStorage.setItem(USER_KEY, JSON.stringify(res.data.user));
    }
    return res.data.user;
  },

  /**
   * Log out and clear local credentials
   */
  async logout() {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch {
      // Ignore network errors on logout
    } finally {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(USER_KEY);
      window.dispatchEvent(new Event('tims_auth_logout'));
    }
  },

  /**
   * Get cached user from sessionStorage (validates token first)
   */
  getCachedUser() {
    try {
      const token = sessionStorage.getItem(TOKEN_KEY);
      if (!isTokenValid(token)) {
        sessionStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem(USER_KEY);
        return null;
      }
      const stored = sessionStorage.getItem(USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  },

  /**
   * Check if token is present and unexpired
   */
  isAuthenticated() {
    const token = sessionStorage.getItem(TOKEN_KEY);
    return isTokenValid(token);
  },
};

/**
 * Complaints API Service (Member 1 - RWA Endpoints)
 */
export const complaintApi = {
  async getComplaints(params = {}) {
    const query = new URLSearchParams(params).toString();
    const endpoint = `/complaints${query ? `?${query}` : ''}`;
    const res = await apiRequest(endpoint);
    return res.data;
  },

  async getComplaintById(id) {
    const res = await apiRequest(`/complaints/${id}`);
    return res.data;
  },

  async createComplaint(data) {
    const res = await apiRequest('/complaints', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  },

  async verifyComplaint(id, payload) {
    const res = await apiRequest(`/complaints/${id}/verify`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  async disputeComplaint(id, payload) {
    const res = await apiRequest(`/complaints/${id}/dispute`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  },
};

/**
 * Master Data API Service (Contractors, AMC Rates, Departments)
 */
export const masterApi = {
  async getContractors() {
    const res = await apiRequest('/master/contractors');
    return res.data || [];
  },

  async getDepartments() {
    const res = await apiRequest('/master/departments');
    return res.data || [];
  },

  async getAmcRates() {
    const res = await apiRequest('/master/amc-rates');
    return res.data || [];
  },

  async resetMaster() {
    const res = await apiRequest('/master/reset', { method: 'POST' });
    return res;
  },
};

/**
 * Desk Clerk API Service (Member 2)
 */
export const clerkApi = {
  async getTriageQueue() {
    const res = await apiRequest('/clerk/triage-queue');
    return res.data || [];
  },

  async getDuplicateCheck(complaintId) {
    const res = await apiRequest(`/clerk/duplicate-check?complaintId=${encodeURIComponent(complaintId)}`);
    return res;
  },

  async linkDuplicate(duplicateId, masterComplaintId, notes = '') {
    const res = await apiRequest(`/clerk/duplicate-link/${duplicateId}`, {
      method: 'POST',
      body: JSON.stringify({ masterComplaintId, notes }),
    });
    return res.data;
  },

  async triageComplaint(id) {
    const res = await apiRequest(`/clerk/complaints/${id}/triage`, {
      method: 'PATCH',
    });
    return res.data;
  },

  async validateComplaint(id) {
    const res = await apiRequest(`/clerk/complaints/${id}/validate`, {
      method: 'PATCH',
    });
    return res.data;
  },

  async rejectComplaint(id, payload) {
    const res = await apiRequest(`/clerk/complaints/${id}/reject`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  async createWorkOrder(payload) {
    const res = await apiRequest('/clerk/work-orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  async getWorkOrders(params = {}) {
    const query = new URLSearchParams(params).toString();
    const endpoint = `/clerk/work-orders${query ? `?${query}` : ''}`;
    const res = await apiRequest(endpoint);
    return res.data || [];
  },

  async getWorkOrderById(id) {
    const res = await apiRequest(`/clerk/work-orders/${id}`);
    return res.data;
  },

  async escalate(id, payload) {
    const res = await apiRequest(`/clerk/escalate/${id}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  },
};

/**
 * Department Head API Service (Member 4)
 */
export const deptHeadApi = {
  async getApprovals() {
    const res = await apiRequest('/dept-head/approvals');
    return res.data || [];
  },

  async processApproval(id, { action = 'APPROVE', notes = '' } = {}) {
    const res = await apiRequest(`/dept-head/approvals/${id}`, {
      method: 'POST',
      body: JSON.stringify({ action, notes }),
    });
    return res.data;
  },

  async getStaff() {
    const res = await apiRequest('/dept-head/staff');
    return res.data || [];
  },

  async createStaff(payload) {
    const res = await apiRequest('/dept-head/staff', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  async updateStaffStatus(id, status) {
    const res = await apiRequest(`/dept-head/staff/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    return res.data;
  },

  async getAnalytics() {
    const res = await apiRequest('/dept-head/analytics');
    return res.data || {};
  },
};

/**
 * Field Contractor API Service (Member 3)
 */
export const contractorApi = {
  async getJobs(params = {}) {
    const query = new URLSearchParams(params).toString();
    const endpoint = `/contractor/jobs${query ? `?${query}` : ''}`;
    const res = await apiRequest(endpoint);
    return res.data || [];
  },

  async getJobById(id) {
    const res = await apiRequest(`/contractor/jobs/${id}`);
    return res.data;
  },

  async submitInspection(payload) {
    const res = await apiRequest('/contractor/inspection', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  async submitEstimate(payload) {
    const res = await apiRequest('/contractor/estimates', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  async updateJobStatus(id, payload) {
    const res = await apiRequest(`/contractor/jobs/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  async uploadEvidence(payload) {
    const res = await apiRequest('/contractor/evidence', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  },
};

/**
 * Finance & AMC API Service (Member 5)
 */
export const financeApi = {
  async getInvoices(params = {}) {
    const query = new URLSearchParams(params).toString();
    const endpoint = `/finance/invoices${query ? `?${query}` : ''}`;
    const res = await apiRequest(endpoint);
    return res.data || [];
  },

  async getInvoiceById(id) {
    const res = await apiRequest(`/finance/invoices/${id}`);
    return res.data;
  },

  async get3WayCheck(id) {
    const res = await apiRequest(`/finance/invoices/${id}/3-way-check`);
    return res.data;
  },

  async authorizeInvoice(id, payload = {}) {
    const res = await apiRequest(`/finance/invoices/${id}/authorize`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  async flagVariance(id, reason) {
    const res = await apiRequest(`/finance/invoices/${id}/flag-variance`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
    return res.data;
  },

  async releasePayment(id, payload = {}) {
    const res = await apiRequest(`/finance/invoices/${id}/pay`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  async getRateCards() {
    const res = await apiRequest('/finance/rate-cards');
    return res.data || [];
  },

  async getAnalytics() {
    const res = await apiRequest('/finance/analytics');
    return res.data || {};
  },
};

/**
 * Township COO API Service (Executive Governance)
 */
export const cooApi = {
  async getDashboard() {
    const res = await apiRequest('/coo/dashboard');
    return res.data || {};
  },

  async getDepartments() {
    const res = await apiRequest('/coo/departments');
    return res.data || [];
  },

  async createDepartment(payload) {
    const res = await apiRequest('/coo/departments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  async updateDepartment(id, payload) {
    const res = await apiRequest(`/coo/departments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  async updateDepartmentStatus(id, status) {
    const res = await apiRequest(`/coo/departments/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    return res.data;
  },

  async assignDepartmentHead(deptId, departmentHeadId) {
    const res = await apiRequest(`/coo/departments/${deptId}/head`, {
      method: 'PATCH',
      body: JSON.stringify({ departmentHeadId }),
    });
    return res.data;
  },

  async getDepartmentHeads() {
    const res = await apiRequest('/coo/department-heads');
    return res.data || [];
  },

  async getDepartmentStaff(deptId) {
    const res = await apiRequest(`/coo/departments/${deptId}/staff`);
    return res.data || [];
  },

  async getWorkOrders(params = {}) {
    const query = new URLSearchParams(params).toString();
    const endpoint = `/coo/work-orders${query ? `?${query}` : ''}`;
    const res = await apiRequest(endpoint);
    return res.data || [];
  },

  async getWorkOrderById(id) {
    const res = await apiRequest(`/coo/work-orders/${id}`);
    return res.data;
  },

  async escalateWorkOrder(id, payload = {}) {
    const res = await apiRequest(`/coo/work-orders/${id}/escalate`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  async getApprovals() {
    const res = await apiRequest('/coo/approvals');
    return res.data || [];
  },

  async processApproval(id, payload = {}) {
    const res = await apiRequest(`/coo/approvals/${id}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  },
};

/**
 * Health and diagnostics API
 */
export const systemApi = {
  async checkHealth() {
    try {
      const res = await fetch(`${SERVER_BASE}/health`);
      return await res.json();
    } catch (err) {
      return { success: false, status: 'DOWN', error: err.message };
    }
  },
};

export default {
  apiRequest,
  authApi,
  complaintApi,
  clerkApi,
  contractorApi,
  deptHeadApi,
  financeApi,
  cooApi,
  masterApi,
  systemApi,
};

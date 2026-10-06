/**
 * TIMS Frontend API Service
 * Centralized HTTP client connecting React frontend to Express.js / PostgreSQL backend
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
const SERVER_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export const TOKEN_KEY = 'tims_auth_token';
export const USER_KEY = 'tims_auth_user';

/**
 * Low-level API request helper
 */
export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY);

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
 * Authentication API Service
 */
export const authApi = {
  /**
   * Log in user with credentials and persist session token
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
      localStorage.setItem(TOKEN_KEY, res.data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(res.data.user));
    }

    return res.data;
  },

  /**
   * Fetch current authenticated user profile
   */
  async getMe() {
    const res = await apiRequest('/auth/me');
    if (res.data?.user) {
      localStorage.setItem(USER_KEY, JSON.stringify(res.data.user));
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
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
  },

  /**
   * Get cached user from localStorage
   */
  getCachedUser() {
    try {
      const stored = localStorage.getItem(USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  },

  /**
   * Check if token is present
   */
  isAuthenticated() {
    return !!localStorage.getItem(TOKEN_KEY);
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
  systemApi,
};

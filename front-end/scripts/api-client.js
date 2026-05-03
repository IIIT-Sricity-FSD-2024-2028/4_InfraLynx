/**
 * CRIMS API Client
 * Thin HTTP wrapper that every data-store function uses to talk to the NestJS backend.
 */
(function attachApiClient(globalScope) {
  const crims = (globalScope.CRIMS = globalScope.CRIMS || {});

  const API_BASE = 'http://localhost:3000';

  function getSessionRole() {
    try {
      const raw = globalScope.localStorage.getItem('crims-front-end-session');
      if (!raw) return null;
      const session = JSON.parse(raw);
      return session.role || null;
    } catch (_e) {
      return null;
    }
  }

  function buildHeaders(role) {
    const headers = { 'Content-Type': 'application/json' };
    const effectiveRole = role || getSessionRole();
    if (effectiveRole) {
      headers['x-role'] = effectiveRole;
    }
    return headers;
  }

  async function handleResponse(res) {
    if (res.ok) {
      const text = await res.text();
      return text ? JSON.parse(text) : null;
    }

    let errorMessage = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      errorMessage = body.message || body.error || errorMessage;
    } catch (_e) { /* ignore parse failures */ }

    throw new Error(errorMessage);
  }

  async function get(path) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'GET',
      headers: buildHeaders(),
    });
    return handleResponse(res);
  }

  async function post(path, body, role) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: buildHeaders(role),
      body: JSON.stringify(body),
    });
    return handleResponse(res);
  }

  async function patch(path, body, role) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'PATCH',
      headers: buildHeaders(role),
      body: JSON.stringify(body),
    });
    return handleResponse(res);
  }

  async function del(path, role) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'DELETE',
      headers: buildHeaders(role),
    });
    return handleResponse(res);
  }

  crims.api = { get, post, patch, del, API_BASE };
})(window);


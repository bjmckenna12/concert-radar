const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

function getToken() {
  return localStorage.getItem('cr_token');
}

function setToken(token) {
  localStorage.setItem('cr_token', token);
}

function clearToken() {
  localStorage.removeItem('cr_token');
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const resp = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (resp.status === 401) {
    clearToken();
    window.location.href = '/';
    return null;
  }

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(err.detail || `HTTP ${resp.status}`);
  }

  return resp.json();
}

export const api = {
  // Auth
  getLoginUrl: () => `${API_URL}/auth/login`,
  getMe: () => request('/auth/me'),

  // Artists
  syncArtists: () => request('/artists/sync'),
  listArtists: () => request('/artists/'),

  // Concerts
  listConcerts: (limit = 50) => request(`/concerts/?limit=${limit}`),
  triggerScan: () => request('/concerts/scan', { method: 'POST' }),

  // Settings
  updateSettings: (data) => request('/settings/', {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),

  setToken,
  getToken,
  clearToken,
};

export default api;

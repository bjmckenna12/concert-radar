const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

function getToken() { return localStorage.getItem('cr_token'); }
function setToken(token) { localStorage.setItem('cr_token', token); }
function clearToken() { localStorage.removeItem('cr_token'); }

async function request(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const resp = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (resp.status === 401) { clearToken(); window.location.href = '/'; return null; }
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(err.detail || `HTTP ${resp.status}`);
  }
  return resp.json();
}

export const api = {
  getLoginUrl: () => `${API_URL}/auth/login`,
  getMe: () => request('/auth/me'),
  syncArtists: () => request('/artists/sync'),
  listArtists: () => request('/artists/'),
  listConcerts: (limit = 100, ticketSalesOnly = false) =>
    request(`/concerts/?limit=${limit}&ticket_sales_only=${ticketSalesOnly}`),
  triggerScan: () => request('/concerts/scan', { method: 'POST' }),
  dedupeConcerts: () => request('/concerts/dedupe', { method: 'POST' }),
  updateSettings: (data) => request('/settings/', { method: 'PATCH', body: JSON.stringify(data) }),
  getStatsSummary: () => request('/stats/summary'),
  getTopArtists: (limit = 20, range = 'medium_term') => request(`/stats/top-artists?limit=${limit}&time_range=${range}`),
  getTopTracks: (limit = 20, range = 'medium_term') => request(`/stats/top-tracks?limit=${limit}&time_range=${range}`),
  getFriends: () => request('/friends/'),
  addFriend: (spotifyId) => request('/friends/add', { method: 'POST', body: JSON.stringify({ spotify_id: spotifyId }) }),
  getFriendConcerts: (friendId) => request(`/friends/${friendId}/concerts`),
  getFriendArtists: (friendId) => request(`/friends/${friendId}/artists`),
  setToken, getToken, clearToken,
};

export default api;

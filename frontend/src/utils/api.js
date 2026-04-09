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
  // Auth
  getLoginUrl: () => `${API_URL}/auth/login`,
  getMe: () => request('/auth/me'),

  // Artists
  syncArtists: () => request('/artists/sync'),
  listArtists: () => request('/artists/'),

  // Concerts
  listConcerts: (limit = 200, ticketSalesOnly = false) =>
    request(`/concerts/?limit=${limit}&ticket_sales_only=${ticketSalesOnly}`),
  triggerScan: () => request('/concerts/scan', { method: 'POST' }),
  getScanStatus: () => request('/concerts/scan/status'),
  clearTmCache: () => request('/concerts/clear-cache', { method: 'POST' }),

  // Saved / watchlist
  saveConcert: (concertId, status = 'interested') =>
    request('/saved/', { method: 'POST', body: JSON.stringify({ concert_id: concertId, status }) }),
  unsaveConcert: (concertId) => request(`/saved/${concertId}`, { method: 'DELETE' }),
  getSaved: () => request('/saved/'),
  getSavedIds: () => request('/saved/ids'),

  // Activity & gamification
  getActivity: (limit = 50) => request(`/activity/?limit=${limit}`),
  getBadges: () => request('/activity/badges'),
  getGamificationStats: () => request('/activity/stats'),

  // Stats (Spotify)
  getStatsSummary: () => request('/stats/summary'),
  getTopArtists: (limit = 20, range = 'medium_term') =>
    request(`/stats/top-artists?limit=${limit}&time_range=${range}`),
  getTopTracks: (limit = 20, range = 'medium_term') =>
    request(`/stats/top-tracks?limit=${limit}&time_range=${range}`),

  // Friends
  getFriends: () => request('/friends/'),
  addFriend: (spotifyId) =>
    request('/friends/add', { method: 'POST', body: JSON.stringify({ spotify_id: spotifyId }) }),
  getFriendConcerts: (friendId) => request(`/friends/${friendId}/concerts`),
  getFriendArtists: (friendId) => request(`/friends/${friendId}/artists`),

  // Settings
  updateSettings: (data) =>
    request('/settings/', { method: 'PATCH', body: JSON.stringify(data) }),

  setToken, getToken, clearToken,
};

export default api;

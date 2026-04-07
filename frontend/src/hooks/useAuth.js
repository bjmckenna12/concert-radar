import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    if (!api.getToken()) { setLoading(false); return; }
    try {
      const me = await api.getMe();
      setUser(me);
    } catch {
      api.clearToken();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Handle token from Spotify OAuth redirect
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const error = params.get('error');
    if (token) {
      api.setToken(token);
      window.history.replaceState({}, '', window.location.pathname);
    }
    if (error) {
      console.error('Auth error:', error);
    }
    fetchUser();
  }, [fetchUser]);

  const logout = () => {
    api.clearToken();
    setUser(null);
  };

  const refreshUser = () => fetchUser();

  return (
    <AuthContext.Provider value={{ user, loading, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { useAuth } from './useAuth';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const { user } = useAuth();
  const [concerts, setConcerts] = useState([]);
  const [artists, setArtists] = useState({ total: 0, artists: [] });
  const [topArtists, setTopArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastFetched, setLastFetched] = useState(null);

  const fetchAll = useCallback(async (force = false) => {
    if (!user) return;
    // Don't refetch if data is less than 2 minutes old
    if (!force && lastFetched && Date.now() - lastFetched < 120000) return;

    setLoading(true);
    try {
      const [concertsData, artistsData, topArtistsData] = await Promise.all([
        api.listConcerts(200),
        api.listArtists(),
        api.getTopArtists(20).catch(() => ({ artists: [] })),
      ]);
      setConcerts(concertsData?.concerts || []);
      setArtists(artistsData || { total: 0, artists: [] });
      setTopArtists(topArtistsData?.artists || []);
      setLastFetched(Date.now());
    } catch (e) {
      console.error('Data fetch failed:', e);
    } finally {
      setLoading(false);
    }
  }, [user, lastFetched]);

  useEffect(() => {
    if (user) fetchAll();
  }, [user, fetchAll]);

  const refresh = () => fetchAll(true);

  return (
    <DataContext.Provider value={{ concerts, artists, topArtists, loading, refresh }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  return useContext(DataContext);
}

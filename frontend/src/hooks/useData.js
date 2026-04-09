import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { useAuth } from './useAuth';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const { user } = useAuth();
  const [concerts, setConcerts] = useState([]);
  const [artists, setArtists] = useState({ total: 0, artists: [] });
  const [topArtists, setTopArtists] = useState([]);
  const [savedIds, setSavedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [lastFetched, setLastFetched] = useState(null);

  const fetchAll = useCallback(async (force = false) => {
    if (!user) return;
    if (!force && lastFetched && Date.now() - lastFetched < 120000) return;
    setLoading(true);
    try {
      const [concertsData, artistsData, topArtistsData, savedData] = await Promise.all([
        api.listConcerts(200),
        api.listArtists(),
        api.getTopArtists(20).catch(() => ({ artists: [] })),
        api.getSavedIds().catch(() => ({ ids: [] })),
      ]);
      setConcerts(concertsData?.concerts || []);
      setArtists(artistsData || { total: 0, artists: [] });
      setTopArtists(topArtistsData?.artists || []);
      setSavedIds(new Set(savedData?.ids || []));
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

  const refresh = useCallback(() => fetchAll(true), [fetchAll]);

  const toggleSave = async (concertId, currentlySaved) => {
    if (currentlySaved) {
      await api.unsaveConcert(concertId);
      setSavedIds(prev => { const next = new Set(prev); next.delete(concertId); return next; });
    } else {
      await api.saveConcert(concertId, 'interested');
      setSavedIds(prev => new Set([...prev, concertId]));
    }
  };

  return (
    <DataContext.Provider value={{ concerts, artists, topArtists, savedIds, loading, refresh, toggleSave }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  return useContext(DataContext);
}

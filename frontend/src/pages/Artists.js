import { useState, useEffect } from 'react';
import api from '../utils/api';

export default function Artists() {
  const [artists, setArtists] = useState([]);
  const [concerts, setConcerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    Promise.all([
      api.listArtists().then(d => setArtists(d?.artists || [])),
      api.listConcerts(200).then(d => setConcerts(d?.concerts || [])),
    ]).finally(() => setLoading(false));
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await api.syncArtists();
      const d = await api.listArtists();
      setArtists(d?.artists || []);
    } finally {
      setSyncing(false);
    }
  };

  const filtered = artists.filter(a =>
    !search || a.artist_name?.toLowerCase().includes(search.toLowerCase())
  );

  const getArtistConcerts = (artistId) =>
    concerts.filter(c => c.artist_id === artistId);

  const selectedArtist = selected ? artists.find(a => a.spotify_artist_id === selected) : null;
  const selectedConcerts = selected ? getArtistConcerts(selected) : [];

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "'Orbitron', monospace", fontSize: '1.5rem', fontWeight: 900, letterSpacing: '0.08em', marginBottom: 6 }}>
            FOLLOWED ARTISTS
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>
            {artists.length} artists being monitored
          </p>
        </div>
        <button onClick={handleSync} disabled={syncing} className="y2k-btn y2k-btn-outline" style={{ border: '1px solid var(--accent)' }}>
          {syncing ? 'SYNCING...' : '◈ SYNC SPOTIFY'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 380px' : '1fr', gap: 16 }}>
        {/* Artist grid */}
        <div>
          <input
            type="text" placeholder="Search artists..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="y2k-input" style={{ marginBottom: 16 }}
          />

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', fontFamily: "'Orbitron', monospace", fontSize: 11, color: 'var(--accent)', letterSpacing: '0.1em' }}>LOADING...</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8, maxHeight: 560, overflowY: 'auto', paddingRight: 4 }}>
              {filtered.map(a => {
                const artistConcerts = getArtistConcerts(a.spotify_artist_id);
                const isSelected = selected === a.spotify_artist_id;
                return (
                  <div
                    key={a.spotify_artist_id}
                    onClick={() => setSelected(isSelected ? null : a.spotify_artist_id)}
                    style={{
                      background: isSelected ? 'rgba(0,255,159,0.08)' : 'var(--surface)',
                      border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border2)'}`,
                      padding: '14px 12px', cursor: 'pointer',
                      clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))',
                      transition: 'all 0.15s', position: 'relative',
                      boxShadow: isSelected ? '0 0 15px rgba(0,255,159,0.2)' : 'none',
                    }}
                  >
                    {/* Avatar */}
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%', marginBottom: 10,
                      background: `hsl(${(a.artist_name?.charCodeAt(0) || 0) * 37 % 360}, 60%, 25%)`,
                      border: `1px solid hsl(${(a.artist_name?.charCodeAt(0) || 0) * 37 % 360}, 60%, 40%)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: "'Orbitron', monospace", fontSize: 13, fontWeight: 700,
                      color: `hsl(${(a.artist_name?.charCodeAt(0) || 0) * 37 % 360}, 80%, 70%)`,
                    }}>
                      {(a.artist_name || '?')[0].toUpperCase()}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, lineHeight: 1.3, wordBreak: 'break-word' }}>
                      {a.artist_name}
                    </div>
                    {artistConcerts.length > 0 && (
                      <span className="tag tag-green" style={{ fontSize: 9 }}>
                        {artistConcerts.length} show{artistConcerts.length !== 1 ? 's' : ''}
                      </span>
                    )}
                    {isSelected && (
                      <div style={{ position: 'absolute', top: 8, right: 8, width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', animation: 'pulse 1s infinite' }} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Artist detail panel */}
        {selected && selectedArtist && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <div className="y2k-card" style={{ padding: '1.5rem', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                <div style={{
                  width: 52, height: 52, borderRadius: '50%',
                  background: `hsl(${(selectedArtist.artist_name?.charCodeAt(0) || 0) * 37 % 360}, 60%, 20%)`,
                  border: `2px solid hsl(${(selectedArtist.artist_name?.charCodeAt(0) || 0) * 37 % 360}, 60%, 40%)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: "'Orbitron', monospace", fontSize: 18, fontWeight: 700,
                  color: `hsl(${(selectedArtist.artist_name?.charCodeAt(0) || 0) * 37 % 360}, 80%, 70%)`,
                  boxShadow: `0 0 20px hsl(${(selectedArtist.artist_name?.charCodeAt(0) || 0) * 37 % 360}, 60%, 25%)`,
                }}>
                  {(selectedArtist.artist_name || '?')[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                    {selectedArtist.artist_name?.toUpperCase()}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {selectedConcerts.length} concert{selectedConcerts.length !== 1 ? 's' : ''} detected
                  </div>
                </div>
                <button onClick={() => setSelected(null)} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 18 }}>✕</button>
              </div>

              <a
                href={`https://open.spotify.com/artist/${selectedArtist.spotify_artist_id}`}
                target="_blank" rel="noopener noreferrer"
                className="y2k-btn y2k-btn-green"
                style={{ textDecoration: 'none', width: '100%', marginBottom: 0 }}
              >
                ◈ VIEW ON SPOTIFY
              </a>
            </div>

            <div className="section-label">Detected concerts</div>
            {selectedConcerts.length === 0 ? (
              <div className="y2k-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                <div style={{ fontFamily: "'VT323', monospace", fontSize: 32, color: 'var(--muted2)', marginBottom: 8 }}>◎</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>No concerts detected yet for this artist.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {selectedConcerts.map(c => (
                  <div key={c.id} className="y2k-card" style={{ padding: '1rem' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                      {[c.venue, c.city].filter(Boolean).join(' · ') || 'Location TBC'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
                      {c.event_date ? new Date(c.event_date).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }) : 'Date TBC'}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <span className={`tag ${c.source === 'website' ? 'tag-green' : c.source === 'news' ? 'tag-blue' : 'tag-purple'}`}>
                        {c.source}
                      </span>
                      {c.source_url && (
                        <a href={c.source_url} target="_blank" rel="noopener noreferrer" className="tag tag-green" style={{ textDecoration: 'none' }}>
                          Tickets ↗
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

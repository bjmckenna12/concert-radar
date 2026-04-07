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
    try { await api.syncArtists(); const a = await api.listArtists(); setArtists(a?.artists || []); }
    finally { setSyncing(false); }
  };

  const filtered = artists.filter(a => !search || a.artist_name?.toLowerCase().includes(search.toLowerCase()));
  const getArtistConcerts = (id) => concerts.filter(c => c.artist_id === id);
  const selectedArtist = selected ? artists.find(a => a.spotify_artist_id === selected) : null;
  const selectedConcerts = selected ? getArtistConcerts(selected) : [];

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "'Orbitron', monospace", fontSize: '1.5rem', fontWeight: 900, letterSpacing: '0.08em', marginBottom: 6 }}>ARTISTS 🎵</h1>
          <p style={{ color: 'var(--text2)', fontSize: 13 }}>{artists.length} artists being monitored</p>
        </div>
        <button onClick={handleSync} disabled={syncing} className="pill-btn pill-btn-outline" style={{ border: '1.5px solid var(--accent)' }}>
          {syncing ? '...' : '🔄'} Sync Spotify
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 360px' : '1fr', gap: 16 }}>
        <div>
          <input type="text" placeholder="Search artists..." value={search} onChange={e => setSearch(e.target.value)} className="input-field" style={{ marginBottom: 16, borderRadius: 50, padding: '10px 18px' }} />

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>Loading artists...</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8, maxHeight: 560, overflowY: 'auto', paddingRight: 4 }}>
              {filtered.map(a => {
                const ac = getArtistConcerts(a.spotify_artist_id);
                const isSelected = selected === a.spotify_artist_id;
                const hue = (a.artist_name?.charCodeAt(0) || 0) * 37 % 360;
                return (
                  <div key={a.spotify_artist_id} onClick={() => setSelected(isSelected ? null : a.spotify_artist_id)} style={{
                    background: isSelected ? `hsl(${hue}, 60%, 92%)` : 'white',
                    border: `1.5px solid ${isSelected ? `hsl(${hue}, 60%, 65%)` : 'var(--border)'}`,
                    borderRadius: 16, padding: '14px 12px', cursor: 'pointer',
                    transition: 'all 0.15s', boxShadow: isSelected ? `0 4px 16px hsla(${hue}, 60%, 50%, 0.2)` : 'var(--shadow)',
                  }}
                    onMouseOver={e => !isSelected && (e.currentTarget.style.transform = 'translateY(-2px)')}
                    onMouseOut={e => e.currentTarget.style.transform = 'none'}
                  >
                    <div style={{ width: 38, height: 38, borderRadius: '50%', marginBottom: 10, background: `hsl(${hue}, 60%, 88%)`, border: `2px solid hsl(${hue}, 60%, 65%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, color: `hsl(${hue}, 60%, 35%)` }}>
                      {(a.artist_name || '?')[0].toUpperCase()}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.3, wordBreak: 'break-word', marginBottom: 6 }}>{a.artist_name}</div>
                    {ac.length > 0 && (
                      <span style={{ background: 'var(--mint-light)', color: '#065f46', padding: '2px 8px', borderRadius: 50, fontSize: 11, fontWeight: 700, border: '1px solid var(--mint)' }}>
                        {ac.length} show{ac.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {selected && selectedArtist && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <div className="card" style={{ padding: '1.5rem', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                {(() => { const hue = (selectedArtist.artist_name?.charCodeAt(0) || 0) * 37 % 360; return (
                  <div style={{ width: 52, height: 52, borderRadius: '50%', background: `hsl(${hue}, 60%, 88%)`, border: `2px solid hsl(${hue}, 60%, 60%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 20, color: `hsl(${hue}, 60%, 35%)`, boxShadow: `0 4px 16px hsla(${hue}, 60%, 50%, 0.25)` }}>
                    {(selectedArtist.artist_name || '?')[0].toUpperCase()}
                  </div>
                ); })()}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 3 }}>{selectedArtist.artist_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{selectedConcerts.length} concert{selectedConcerts.length !== 1 ? 's' : ''} detected</div>
                </div>
                <button onClick={() => setSelected(null)} style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 20 }}>×</button>
              </div>
              <a href={`https://open.spotify.com/artist/${selectedArtist.spotify_artist_id}`} target="_blank" rel="noopener noreferrer" className="pill-btn pill-btn-purple" style={{ textDecoration: 'none', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                🎵 Open in Spotify
              </a>
            </div>

            <div className="section-label">Concerts</div>
            {selectedConcerts.length === 0 ? (
              <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>No concerts detected for this artist yet.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {selectedConcerts.map(c => (
                  <div key={c.id} className="card" style={{ padding: '12px 14px' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{[c.venue, c.city].filter(Boolean).join(' · ') || 'Location TBC'}</div>
                    <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8 }}>
                      {c.event_date ? new Date(c.event_date).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }) : 'Date TBC'}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {c.source_url && <a href={c.source_url} target="_blank" rel="noopener noreferrer" className="pill-btn pill-btn-purple" style={{ padding: '5px 12px', fontSize: 11, textDecoration: 'none' }}>🎟️ Tickets ↗</a>}
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

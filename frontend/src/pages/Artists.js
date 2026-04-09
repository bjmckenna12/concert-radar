import { useState, useEffect } from 'react';
import { useData } from '../hooks/useData';
import api from '../utils/api';

export default function Artists() {
  const { artists: artistsData, concerts, loading, refresh } = useData();
  const [topArtists, setTopArtists] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [timeRange, setTimeRange] = useState('medium_term');

  useEffect(() => {
    api.getTopArtists(50, timeRange).then(d => setTopArtists(d?.artists || [])).catch(() => {});
  }, [timeRange]);

  const handleSync = async () => {
    setSyncing(true);
    try { await api.syncArtists(); await refresh(); }
    finally { setSyncing(false); }
  };

  // Merge followed artists with top artists data for ordering
  const followedArtists = artistsData?.artists || [];
  const topArtistMap = {};
  topArtists.forEach((a, i) => { topArtistMap[a.id] = { rank: i + 1, image: a.image, genres: a.genres }; });

  // Sort: top artists first (by rank), then alphabetical for the rest
  const sortedArtists = [...followedArtists].sort((a, b) => {
    const rankA = topArtistMap[a.spotify_artist_id]?.rank;
    const rankB = topArtistMap[b.spotify_artist_id]?.rank;
    if (rankA && rankB) return rankA - rankB;
    if (rankA) return -1;
    if (rankB) return 1;
    return a.artist_name.localeCompare(b.artist_name);
  });

  const filtered = sortedArtists.filter(a =>
    !search || a.artist_name?.toLowerCase().includes(search.toLowerCase())
  );

  const getArtistConcerts = (id) => concerts.filter(c => c.artist_id === id);

  const selectedArtist = selected ? sortedArtists.find(a => a.spotify_artist_id === selected) : null;
  const selectedConcerts = selected ? getArtistConcerts(selected) : [];
  const selectedTopData = selected ? topArtistMap[selected] : null;

  const TIME_RANGES = [
    { val: 'short_term', label: 'Last 4 weeks' },
    { val: 'medium_term', label: 'Last 6 months' },
    { val: 'long_term', label: 'All time' },
  ];

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "'Orbitron', monospace", fontSize: '1.5rem', fontWeight: 900, letterSpacing: '0.08em', marginBottom: 6 }}>
            ARTISTS 🎵
          </h1>
          <p style={{ color: 'var(--text2)', fontSize: 13 }}>
            {followedArtists.length} artists monitored · ordered by your listening frequency
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {TIME_RANGES.map(r => (
            <button key={r.val} onClick={() => setTimeRange(r.val)} className="pill-btn" style={{
              padding: '7px 14px', fontSize: 12, borderRadius: 50,
              background: timeRange === r.val ? 'var(--accent)' : 'white',
              color: timeRange === r.val ? 'white' : 'var(--text2)',
              border: `1.5px solid ${timeRange === r.val ? 'var(--accent)' : 'var(--border2)'}`,
            }}>{r.label}</button>
          ))}
          <button onClick={handleSync} disabled={syncing} className="pill-btn pill-btn-outline" style={{ border: '1.5px solid var(--accent)' }}>
            {syncing ? '...' : '🔄'} Sync
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 380px' : '1fr', gap: 16 }}>
        <div>
          <input type="text" placeholder="Search artists..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field" style={{ marginBottom: 16, borderRadius: 50, padding: '10px 18px' }}
          />

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>Loading artists...</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10, maxHeight: 600, overflowY: 'auto', paddingRight: 4 }}>
              {filtered.map((a, idx) => {
                const ac = getArtistConcerts(a.spotify_artist_id);
                const isSelected = selected === a.spotify_artist_id;
                const topData = topArtistMap[a.spotify_artist_id];
                const hue = (a.artist_name?.charCodeAt(0) || 0) * 37 % 360;
                const hasShows = ac.length > 0;

                return (
                  <div key={a.spotify_artist_id}
                    onClick={() => setSelected(isSelected ? null : a.spotify_artist_id)}
                    style={{
                      background: isSelected ? `hsl(${hue}, 60%, 92%)` : 'white',
                      border: `1.5px solid ${isSelected ? `hsl(${hue}, 60%, 65%)` : 'var(--border)'}`,
                      borderRadius: 16, padding: '14px 12px', cursor: 'pointer',
                      transition: 'all 0.15s',
                      boxShadow: isSelected ? `0 4px 16px hsla(${hue}, 60%, 50%, 0.2)` : 'var(--shadow)',
                      position: 'relative',
                    }}
                    onMouseOver={e => !isSelected && (e.currentTarget.style.transform = 'translateY(-2px)')}
                    onMouseOut={e => e.currentTarget.style.transform = 'none'}
                  >
                    {/* Rank badge for top artists */}
                    {topData && (
                      <div style={{
                        position: 'absolute', top: 8, right: 8,
                        background: topData.rank <= 3 ? '#fbbf24' : 'var(--surface3)',
                        color: topData.rank <= 3 ? '#92400e' : 'var(--muted)',
                        borderRadius: 50, padding: '1px 6px', fontSize: 10, fontWeight: 700,
                      }}>
                        #{topData.rank}
                      </div>
                    )}

                    {/* Artist image or initial */}
                    {topData?.image ? (
                      <img src={topData.image} alt={a.artist_name}
                        style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', marginBottom: 10, border: `2px solid hsl(${hue}, 60%, 65%)` }}
                      />
                    ) : (
                      <div style={{
                        width: 44, height: 44, borderRadius: '50%', marginBottom: 10,
                        background: `hsl(${hue}, 60%, 88%)`, border: `2px solid hsl(${hue}, 60%, 65%)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 800, fontSize: 18, color: `hsl(${hue}, 60%, 35%)`,
                      }}>
                        {(a.artist_name || '?')[0].toUpperCase()}
                      </div>
                    )}

                    <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.3, marginBottom: 6, wordBreak: 'break-word' }}>
                      {a.artist_name}
                    </div>

                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {/* Has shows badge */}
                      {hasShows && (
                        <span style={{
                          background: '#d1fae5', color: '#065f46',
                          padding: '2px 8px', borderRadius: 50, fontSize: 10, fontWeight: 700,
                          border: '1px solid #34d399', display: 'flex', alignItems: 'center', gap: 3,
                        }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                          {ac.length} show{ac.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Artist detail panel */}
        {selected && selectedArtist && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <div className="card" style={{ padding: '1.5rem', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                {(() => {
                  const hue = (selectedArtist.artist_name?.charCodeAt(0) || 0) * 37 % 360;
                  return selectedTopData?.image ? (
                    <img src={selectedTopData.image} alt={selectedArtist.artist_name}
                      style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: `2px solid hsl(${hue}, 60%, 60%)` }}
                    />
                  ) : (
                    <div style={{ width: 56, height: 56, borderRadius: '50%', background: `hsl(${hue}, 60%, 88%)`, border: `2px solid hsl(${hue}, 60%, 60%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 22, color: `hsl(${hue}, 60%, 35%)` }}>
                      {(selectedArtist.artist_name || '?')[0].toUpperCase()}
                    </div>
                  );
                })()}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 3 }}>{selectedArtist.artist_name}</div>
                  {selectedTopData && (
                    <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, marginBottom: 4 }}>
                      #{selectedTopData.rank} in your top artists
                    </div>
                  )}
                  {selectedTopData?.genres?.length > 0 && (
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {selectedTopData.genres.map(g => (
                        <span key={g} style={{ background: 'var(--surface3)', color: 'var(--text2)', padding: '2px 8px', borderRadius: 50, fontSize: 11 }}>{g}</span>
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={() => setSelected(null)} style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 20 }}>×</button>
              </div>

              <a href={`https://open.spotify.com/artist/${selectedArtist.spotify_artist_id}`}
                target="_blank" rel="noopener noreferrer"
                className="pill-btn pill-btn-purple"
                style={{ textDecoration: 'none', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                🎵 Open in Spotify
              </a>
            </div>

            <div className="section-label">Upcoming concerts</div>
            {selectedConcerts.length === 0 ? (
              <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>No concerts detected yet.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {selectedConcerts.map(c => (
                  <div key={c.id} className="card" style={{ padding: '12px 14px' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                      {[c.venue, c.city].filter(Boolean).join(' · ') || 'Location TBC'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8 }}>
                      {c.event_date ? new Date(c.event_date).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }) : 'Date TBC'}
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span className={`type-badge ${c.concert_type === 'ticket_sale' ? 'badge-ticket' : c.concert_type === 'presale' ? 'badge-presale' : 'badge-announce'}`}>
                        {c.concert_type === 'ticket_sale' ? '🎟️ On Sale' : c.concert_type === 'presale' ? '🔑 Presale' : '📢 Announced'}
                      </span>
                      {c.price && <span style={{ fontSize: 12, color: '#065f46', fontWeight: 600 }}>💰 {c.price}</span>}
                      {c.source_url && (
                        <a href={c.source_url} target="_blank" rel="noopener noreferrer"
                          className="pill-btn pill-btn-purple"
                          style={{ padding: '4px 12px', fontSize: 11, textDecoration: 'none', marginLeft: 'auto' }}>
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

import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../hooks/useAuth';

const TIME_RANGES = [
  { val: 'short_term', label: 'Last 4 weeks' },
  { val: 'medium_term', label: 'Last 6 months' },
  { val: 'long_term', label: 'All time' },
];

const SCENE_COLORS = {
  'Hip-Hop · Rap': { bg: 'linear-gradient(135deg, #1e1b4b, #4c1d95)', text: '#a78bfa' },
  'Electronic · Dance': { bg: 'linear-gradient(135deg, #0c4a6e, #0e7490)', text: '#67e8f9' },
  'Indie · Alternative': { bg: 'linear-gradient(135deg, #14532d, #065f46)', text: '#6ee7b7' },
  'Pop · Mainstream': { bg: 'linear-gradient(135deg, #831843, #9d174d)', text: '#f9a8d4' },
  'Rock · Alternative': { bg: 'linear-gradient(135deg, #450a0a, #7f1d1d)', text: '#fca5a5' },
  'R&B · Soul': { bg: 'linear-gradient(135deg, #713f12, #92400e)', text: '#fcd34d' },
};

function ArtistBubble({ artist, rank }) {
  const size = Math.max(60, 120 - rank * 8);
  const hue = (artist.name?.charCodeAt(0) || 0) * 37 % 360;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `hsl(${hue}, 65%, 88%)`,
      border: `3px solid hsl(${hue}, 65%, 70%)`,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 8, textAlign: 'center', cursor: 'default',
      transition: 'transform 0.2s', boxShadow: `0 4px 16px hsla(${hue}, 65%, 60%, 0.3)`,
    }}
      onMouseOver={e => e.currentTarget.style.transform = 'scale(1.08)'}
      onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
    >
      {artist.image ? (
        <img src={artist.image} alt={artist.name} style={{ width: size - 16, height: size - 16, borderRadius: '50%', objectFit: 'cover' }} />
      ) : (
        <div style={{ fontSize: Math.max(16, size * 0.25), fontWeight: 800, color: `hsl(${hue}, 65%, 35%)` }}>
          {artist.name?.[0]}
        </div>
      )}
    </div>
  );
}

export default function Stats() {
  
  const [summary, setSummary] = useState(null);
  const [topTracks, setTopTracks] = useState([]);
  const [timeRange, setTimeRange] = useState('medium_term');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getStatsSummary().then(setSummary).catch(() => setError('Could not load stats. Try re-connecting Spotify.')),
      api.getTopTracks(20, timeRange).then(d => setTopTracks(d?.tracks || [])).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [timeRange]);

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '4rem' }}>
      <div style={{ fontSize: 48, animation: 'float 2s ease-in-out infinite', marginBottom: 16 }}>🎵</div>
      <div style={{ color: 'var(--muted)', fontSize: 14 }}>Loading your music stats...</div>
    </div>
  );

  if (error) return (
    <div className="card" style={{ padding: '2rem', textAlign: 'center', marginTop: '2rem' }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>😕</div>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>Stats unavailable</div>
      <div style={{ fontSize: 13, color: 'var(--text2)' }}>{error}</div>
      <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 12 }}>You may need to log out and log back in to grant the required Spotify permissions.</p>
    </div>
  );

  const sceneStyle = SCENE_COLORS[summary?.scene] || { bg: 'linear-gradient(135deg, var(--accent), var(--pink))', text: '#fff' };

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "'Orbitron', monospace", fontSize: '1.5rem', fontWeight: 900, letterSpacing: '0.08em', marginBottom: 6 }}>YOUR MUSIC STATS 📊</h1>
        <p style={{ color: 'var(--text2)', fontSize: 13 }}>Your personal Spotify wrapped — updated live.</p>
      </div>

      {/* Scene card */}
      {summary?.scene && (
        <div style={{ background: sceneStyle.bg, borderRadius: 24, padding: '1.75rem', marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -20, right: -20, fontSize: 100, opacity: 0.1 }}>🎸</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontFamily: "'Orbitron', monospace", letterSpacing: '0.15em', marginBottom: 8 }}>YOUR SCENE</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: sceneStyle.text, marginBottom: 12 }}>{summary.scene}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(summary.top_genres || []).map(g => (
              <span key={g} style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.9)', padding: '4px 12px', borderRadius: 50, fontSize: 12, fontWeight: 600, backdropFilter: 'blur(4px)' }}>
                {g}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Time range selector */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
        {TIME_RANGES.map(r => (
          <button key={r.val} onClick={() => setTimeRange(r.val)} className="pill-btn" style={{
            padding: '7px 16px', fontSize: 12, borderRadius: 50,
            background: timeRange === r.val ? 'var(--accent)' : 'white',
            color: timeRange === r.val ? 'white' : 'var(--text2)',
            border: `1.5px solid ${timeRange === r.val ? 'var(--accent)' : 'var(--border2)'}`,
            boxShadow: timeRange === r.val ? '0 4px 12px rgba(124,58,237,0.3)' : 'none',
          }}>{r.label}</button>
        ))}
      </div>

      {/* Top artists bubbles */}
      {summary?.top_artists?.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div className="section-label">Top Artists</div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            {summary.top_artists.map((a, i) => <ArtistBubble key={a.id} artist={a} rank={i} />)}
          </div>
        </div>
      )}

      {/* Top tracks */}
      {topTracks.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div className="section-label">Top Tracks</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {topTracks.map((t, i) => (
              <div key={t.id} className="card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 12, fontWeight: 700, color: 'var(--muted)', minWidth: 24, textAlign: 'right' }}>
                  {String(i + 1).padStart(2, '0')}
                </div>
                {t.image && <img src={t.image} alt={t.name} style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)' }}>{t.artist}</div>
                </div>
                {i < 3 && (
                  <div style={{ fontSize: 18 }}>{['🥇','🥈','🥉'][i]}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Share your stats */}
      <div style={{ background: 'linear-gradient(135deg, var(--accent), var(--pink))', borderRadius: 20, padding: '1.5rem', color: 'white', textAlign: 'center' }}>
        <div style={{ fontSize: 24, marginBottom: 8 }}>✨</div>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Share your music taste</div>
        <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 16 }}>
          Your scene: <strong>{summary?.scene}</strong>
          <br />Top artist: <strong>{summary?.top_artists?.[0]?.name}</strong>
        </div>
        <button onClick={() => {
          const text = `🎵 My music scene: ${summary?.scene}\n🎸 Top artist: ${summary?.top_artists?.[0]?.name}\n📊 via Concert Radar`;
          navigator.clipboard.writeText(text);
        }} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', padding: '10px 24px', borderRadius: 50, fontSize: 13, fontWeight: 700, cursor: 'pointer', backdropFilter: 'blur(4px)' }}>
          📋 Copy to share
        </button>
      </div>
    </div>
  );
}

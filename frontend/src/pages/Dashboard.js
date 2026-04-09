import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../utils/api';

const TYPE_CONFIG = {
  presale: { label: '🔑 Presale', cls: 'badge-presale' },
  ticket_sale: { label: '🎟️ Tickets On Sale', cls: 'badge-ticket' },
  tour_announcement: { label: '📢 Announced', cls: 'badge-announce' },
  unknown: { label: '📍 Concert', cls: 'badge-unknown' },
};

function ConcertCard({ concert: c }) {
  const dateObj = c.event_date ? new Date(c.event_date) : null;
  const isValid = dateObj && !isNaN(dateObj.getTime());
  const type = TYPE_CONFIG[c.concert_type] || TYPE_CONFIG.unknown;

  return (
    <div className="concert-card">
      <div style={{ background: 'linear-gradient(135deg, var(--surface3), var(--pink-light))', borderRadius: 12, minWidth: 52, textAlign: 'center', padding: '10px 8px', flexShrink: 0 }}>
        <div style={{ fontSize: 10, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
          {isValid ? dateObj.toLocaleString('en-AU', { month: 'short' }) : '—'}
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent)', lineHeight: 1.2 }}>
          {isValid ? dateObj.getDate() : '?'}
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{c.artist_name}</div>
        <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8 }}>
          {[c.venue, c.city].filter(Boolean).join(' · ') || 'Location TBC'}
        </div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          <span className={`type-badge ${type.cls}`}>{type.label}</span>
          {!c.notified && <span className="type-badge badge-new">✨ New</span>}
          {c.price && <span className="type-badge" style={{background:'#d1fae5',color:'#065f46',border:'1.5px solid #34d399'}}>💰 {c.price}</span>}
        </div>
      </div>
      {c.source_url && (
        <a href={c.source_url} target="_blank" rel="noopener noreferrer" className="pill-btn pill-btn-purple" style={{ padding: '7px 14px', fontSize: 11, textDecoration: 'none', flexShrink: 0 }}>
          Tickets ↗
        </a>
      )}
    </div>
  );
}

function ShareCard({ concert: c, user }) {
  const cardRef = useRef(null);
  const dateObj = c.event_date ? new Date(c.event_date) : null;
  const isValid = dateObj && !isNaN(dateObj.getTime());

  const handleCopy = () => {
    const text = `🎸 ${c.artist_name} @ ${c.city || 'TBC'} — ${isValid ? dateObj.toLocaleDateString('en-AU') : 'Date TBC'}\nFound on Concert Radar 🎟️`;
    navigator.clipboard.writeText(text);
  };

  return (
    <div ref={cardRef} style={{
      background: 'linear-gradient(135deg, #7c3aed, #f472b6)',
      borderRadius: 20, padding: '1.5rem', color: 'white',
      position: 'relative', overflow: 'hidden', minHeight: 160,
    }}>
      <div style={{ position: 'absolute', top: -20, right: -20, fontSize: 80, opacity: 0.15 }}>🎸</div>
      <div style={{ fontSize: 11, fontFamily: "'Orbitron', monospace", letterSpacing: '0.15em', marginBottom: 10, opacity: 0.8 }}>CONCERT RADAR</div>
      <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>{c.artist_name}</div>
      <div style={{ fontSize: 14, opacity: 0.85, marginBottom: 12 }}>
        {c.city || 'TBC'} · {isValid ? dateObj.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Date TBC'}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={handleCopy} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', padding: '6px 14px', borderRadius: 50, fontSize: 12, fontWeight: 600, cursor: 'pointer', backdropFilter: 'blur(4px)' }}>
          📋 Copy
        </button>
        {c.source_url && (
          <a href={c.source_url} target="_blank" rel="noopener noreferrer" style={{ background: 'rgba(255,255,255,0.2)', color: 'white', padding: '6px 14px', borderRadius: 50, fontSize: 12, fontWeight: 600, textDecoration: 'none', backdropFilter: 'blur(4px)' }}>
            🎟️ Tickets
          </a>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, refreshUser } = useAuth();
  const [concerts, setConcerts] = useState([]);
  const [topArtistConcerts, setTopArtistConcerts] = useState([]);
  const [topArtists, setTopArtists] = useState([]);
  const [artists, setArtists] = useState({ total: 0 });
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState('');
  const [loading, setLoading] = useState(true);
  

  useEffect(() => {
    Promise.all([
      api.listConcerts(50).then(d => setConcerts(d?.concerts || [])),
      api.listArtists().then(d => setArtists(d || { total: 0 })),
      api.getTopArtists(10).then(d => setTopArtists(d?.artists || [])).catch(() => []),
    ]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (topArtists.length && concerts.length) {
      const topIds = new Set(topArtists.map(a => a.id));
      // Show concerts from top 20 artists, prioritised first
      const topConcerts = concerts.filter(c => topIds.has(c.artist_id));
      const otherConcerts = concerts.filter(c => !topIds.has(c.artist_id));
      setTopArtistConcerts(topConcerts.slice(0, 8));
    }
  }, [topArtists, concerts]);

  const handleSync = async () => {
    setScanning(true); setScanMsg('Syncing your Spotify artists...');
    try {
      const res = await api.syncArtists();
      setScanMsg(`✓ Synced ${res.synced} artists`);
      const d = await api.listArtists();
      setArtists(d || { total: 0 });
      refreshUser();
    } catch (e) { setScanMsg('Sync failed: ' + e.message); }
    finally { setScanning(false); }
  };

  const handleScan = async () => {
    setScanning(true); setScanMsg('Scanning all sources for new shows...');
    try {
      await api.triggerScan();
      setScanMsg('Scan running in background — check back in a few minutes!');
      setTimeout(async () => {
        const d = await api.listConcerts(50);
        setConcerts(d?.concerts || []);
        setScanMsg('');
      }, 15000);
    } catch (e) { setScanMsg('Scan failed: ' + e.message); setScanning(false); }
  };

  const presales = concerts.filter(c => c.concert_type === 'presale' && !c.notified);
  const ticketSales = concerts.filter(c => c.concert_type === 'ticket_sale');
  const recentAll = concerts.slice(0, 6);

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "'Orbitron', monospace", fontSize: 'clamp(1.2rem, 4vw, 1.8rem)', fontWeight: 900, letterSpacing: '0.05em', marginBottom: 4 }}>
          HEY {user?.display_name?.toUpperCase()?.split(' ')[0]} 👋
        </h1>
        <p style={{ color: 'var(--text2)', fontSize: 14 }}>Here's what's happening with your concert radar.</p>
      </div>

      {/* Setup warning */}
      {!user?.alert_email && (
        <div style={{ background: '#fef3c7', border: '1.5px solid #fbbf24', borderRadius: 24, padding: '14px 18px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 22 }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#92400e', marginBottom: 2 }}>Set up your alert email</div>
            <div style={{ fontSize: 13, color: '#92400e' }}>Add your Gmail in Settings to get concert alerts.</div>
          </div>
          <Link to="/settings" className="pill-btn pill-btn-yellow" style={{ textDecoration: 'none', padding: '8px 16px', fontSize: 12 }}>Settings →</Link>
        </div>
      )}

      {/* Presale alert banner */}
      {presales.length > 0 && (
        <div style={{ background: 'linear-gradient(135deg, #fef3c7, #fce7f3)', border: '1.5px solid #fbbf24', borderRadius: 24, padding: '16px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 28 }}>🔑</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#92400e', marginBottom: 2 }}>{presales.length} presale{presales.length > 1 ? 's' : ''} detected!</div>
            <div style={{ fontSize: 13, color: '#92400e' }}>{presales.map(p => p.artist_name).join(', ')}</div>
          </div>
          <Link to="/concerts" className="pill-btn pill-btn-yellow" style={{ textDecoration: 'none', padding: '8px 16px', fontSize: 12 }}>View →</Link>
        </div>
      )}

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { label: 'Artists monitored', value: loading ? '—' : artists.total, emoji: '🎵', color: 'var(--accent)', bg: 'var(--surface3)' },
          { label: 'Concerts found', value: loading ? '—' : concerts.length, emoji: '🎸', color: 'var(--pink)', bg: '#fce7f3' },
          { label: 'Ticket sales', value: loading ? '—' : ticketSales.length, emoji: '🎟️', color: 'var(--mint)', bg: 'var(--mint-light)' },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ flex: 1, minWidth: 140, background: s.bg }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>{s.emoji}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 10, marginBottom: scanMsg ? 16 : 28, flexWrap: 'wrap' }}>
        <button onClick={handleSync} disabled={scanning} className="pill-btn pill-btn-outline">
          {scanning ? '...' : '🎵'} Sync artists
        </button>
        <button onClick={handleScan} disabled={scanning} className="pill-btn pill-btn-purple">
          {scanning ? '...' : '📡'} Scan for shows
        </button>
      </div>

      {scanMsg && (
        <div style={{ background: '#ede9fe', border: '1.5px solid var(--accent-light)', borderRadius: 16, padding: '10px 16px', marginBottom: 24, fontSize: 13, color: 'var(--accent)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', animation: 'pulse 1s infinite' }} />
          {scanMsg}
        </div>
      )}

      {/* Top Artists Concerts */}
      {topArtistConcerts.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div className="section-label">🔥 Your top artists have shows</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {topArtistConcerts.map(c => <ConcertCard key={c.id} concert={c} />)}
          </div>
        </div>
      )}

      {/* Share cards for ticket sales */}
      {ticketSales.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div className="section-label">🎟️ Share these shows</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
            {ticketSales.slice(0, 3).map(c => <ShareCard key={c.id} concert={c} user={user} />)}
          </div>
        </div>
      )}

      {/* Recent alerts */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div className="section-label" style={{ marginBottom: 0, flex: 1 }}>Recent alerts</div>
          <Link to="/concerts" style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600, marginLeft: 16 }}>View all →</Link>
        </div>

        {loading ? (
          <div style={{ color: 'var(--muted)', fontSize: 14, padding: '2rem 0' }}>Loading...</div>
        ) : recentAll.length === 0 ? (
          <div className="card" style={{ padding: '2.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12, animation: 'float 3s ease-in-out infinite' }}>🎸</div>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>No concerts yet</div>
            <div style={{ fontSize: 13, color: 'var(--text2)' }}>Hit "Scan for shows" to check your artists now.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recentAll.map(c => <ConcertCard key={c.id} concert={c} />)}
          </div>
        )}
      </div>
    </div>
  );
}

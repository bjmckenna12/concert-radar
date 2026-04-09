import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../utils/api';

function ConcertMiniCard({ concert: c }) {
  const dateObj = c.event_date ? new Date(c.event_date) : null;
  const isValid = dateObj && !isNaN(dateObj.getTime());

  return (
    <div style={{
      background: 'white', borderRadius: 14, border: '1.5px solid var(--border)',
      padding: '12px 14px', marginBottom: 8, transition: 'all 0.2s',
      boxShadow: '0 2px 8px rgba(124,58,237,0.05)',
    }}
      onMouseOver={e => e.currentTarget.style.transform = 'translateY(-1px)'}
      onMouseOut={e => e.currentTarget.style.transform = 'none'}
    >
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 3, lineHeight: 1.3 }}>
        {c.artist_name}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}>
        {[c.venue, c.city, c.country].filter(Boolean).join(' · ') || 'Location TBC'}
      </div>
      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>
        {isValid
          ? dateObj.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
          : 'Date TBC'}
      </div>
      {c.source_url ? (
        <a href={c.source_url} target="_blank" rel="noopener noreferrer"
          className="pill-btn pill-btn-purple"
          style={{ padding: '5px 12px', fontSize: 11, textDecoration: 'none', display: 'inline-flex' }}>
          {c.concert_type === 'presale' ? '🔑 Get presale' :
           c.concert_type === 'ticket_sale' ? '🎟️ Buy tickets' : '🔗 View'}
          &nbsp;↗
        </a>
      ) : (
        <span style={{ fontSize: 11, color: 'var(--muted)', fontStyle: 'italic' }}>No link yet</span>
      )}
    </div>
  );
}

function ConcertColumn({ title, emoji, concerts, emptyMsg, accentColor, accentBg, mobileActive, onSelect, isMobile }) {
  const count = concerts.length;

  return (
    <div style={{
      flex: 1, minWidth: 0,
      display: isMobile && !mobileActive ? 'none' : 'flex',
      flexDirection: 'column',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 12, padding: '10px 14px',
        background: accentBg, borderRadius: 12,
        border: `1.5px solid ${accentColor}40`,
        cursor: isMobile ? 'pointer' : 'default',
      }} onClick={isMobile ? onSelect : undefined}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>{emoji}</span>
          <span style={{ fontWeight: 700, fontSize: 14, color: accentColor }}>{title}</span>
        </div>
        <span style={{
          background: accentColor, color: 'white',
          borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 700,
          minWidth: 24, textAlign: 'center'
        }}>{count}</span>
      </div>

      <div style={{ flex: 1 }}>
        {count === 0 ? (
          <div style={{
            background: 'white', borderRadius: 14, border: '1.5px dashed var(--border2)',
            padding: '1.5rem', textAlign: 'center'
          }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>
              {emoji}
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>{emptyMsg}</div>
          </div>
        ) : (
          concerts.map(c => <ConcertMiniCard key={c.id} concert={c} />)
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, emoji, color, bg }) {
  return (
    <div className="stat-card" style={{ flex: 1, minWidth: 120, background: bg }}>
      <div style={{ fontSize: 22, marginBottom: 6 }}>{emoji}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>{label}</div>
    </div>
  );
}

function Spinner() {
  return <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />;
}

export default function Dashboard() {
  const { user, refreshUser } = useAuth();
  const [concerts, setConcerts] = useState([]);
  const [topArtists, setTopArtists] = useState([]);
  const [artists, setArtists] = useState({ total: 0 });
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [mobileTab, setMobileTab] = useState('announced');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    Promise.all([
      api.listConcerts(200).then(d => setConcerts(d?.concerts || [])),
      api.listArtists().then(d => setArtists(d || { total: 0 })),
      api.getTopArtists(20).then(d => setTopArtists(d?.artists || [])).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  // Filter to top 20 artists' concerts for dashboard
  const topArtistIds = new Set(topArtists.map(a => a.id));
  const dashboardConcerts = topArtists.length > 0
    ? [...concerts.filter(c => topArtistIds.has(c.artist_id)), ...concerts.filter(c => !topArtistIds.has(c.artist_id))]
    : concerts;

  // Split into 3 columns
  const announced = dashboardConcerts.filter(c => c.concert_type === 'tour_announcement');
  const presales = dashboardConcerts.filter(c => c.concert_type === 'presale');
  const onSale = dashboardConcerts.filter(c => c.concert_type === 'ticket_sale');
  const unknown = dashboardConcerts.filter(c => c.concert_type === 'unknown' || !c.concert_type);

  // Merge unknown into announced as a fallback
  const announcedAll = [...announced, ...unknown];

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
    setScanning(true); setScanMsg('Scanning for new shows...');
    try {
      await api.triggerScan();
      setScanMsg('Scan running — check back in a few minutes!');
      setTimeout(async () => {
        const d = await api.listConcerts(200);
        setConcerts(d?.concerts || []);
        setScanMsg('');
      }, 20000);
    } catch (e) { setScanMsg('Scan failed: ' + e.message); setScanning(false); }
  };

  const columns = [
    { key: 'announced', title: 'Announced', emoji: '📢', concerts: announcedAll, emptyMsg: 'No new announcements yet', accentColor: '#1d4ed8', accentBg: '#dbeafe' },
    { key: 'presale', title: 'Presale Live', emoji: '🔑', concerts: presales, emptyMsg: 'No active presales right now', accentColor: '#92400e', accentBg: '#fef3c7' },
    { key: 'onsale', title: 'On Sale', emoji: '🎟️', concerts: onSale, emptyMsg: 'No tickets on sale yet', accentColor: '#065f46', accentBg: '#d1fae5' },
  ];

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "'Orbitron', monospace", fontSize: 'clamp(1.2rem, 4vw, 1.8rem)', fontWeight: 900, letterSpacing: '0.05em', marginBottom: 4 }}>
          HEY {user?.display_name?.toUpperCase()?.split(' ')[0]} 👋
        </h1>
        <p style={{ color: 'var(--text2)', fontSize: 14 }}>Your concert radar is active.</p>
      </div>

      {/* Setup warning */}
      {!user?.alert_email && (
        <div style={{ background: '#fef3c7', border: '1.5px solid #fbbf24', borderRadius: 16, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 22 }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#92400e', marginBottom: 2 }}>Set up your alert email</div>
            <div style={{ fontSize: 13, color: '#92400e' }}>Add your Gmail in Settings to get concert alerts.</div>
          </div>
          <Link to="/settings" className="pill-btn pill-btn-yellow" style={{ textDecoration: 'none', padding: '8px 16px', fontSize: 12 }}>Settings →</Link>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <StatCard label="Artists monitored" value={loading ? '—' : artists.total} emoji="🎵" color="var(--accent)" bg="var(--surface3)" />
        <StatCard label="Announced" value={loading ? '—' : announcedAll.length} emoji="📢" color="#1d4ed8" bg="#dbeafe" />
        <StatCard label="Presales live" value={loading ? '—' : presales.length} emoji="🔑" color="#92400e" bg="#fef3c7" />
        <StatCard label="On sale now" value={loading ? '—' : onSale.length} emoji="🎟️" color="#065f46" bg="#d1fae5" />
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 10, marginBottom: scanMsg ? 14 : 24, flexWrap: 'wrap' }}>
        <button onClick={handleSync} disabled={scanning} className="pill-btn pill-btn-outline" style={{ border: '1.5px solid var(--accent)' }}>
          {scanning ? <Spinner /> : '🎵'} Sync artists
        </button>
        <button onClick={handleScan} disabled={scanning} className="pill-btn pill-btn-purple">
          {scanning ? <Spinner /> : '📡'} Scan for shows
        </button>
      </div>

      {scanMsg && (
        <div style={{ background: '#ede9fe', border: '1.5px solid var(--accent-light)', borderRadius: 12, padding: '10px 16px', marginBottom: 20, fontSize: 13, color: 'var(--accent)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', animation: 'pulse 1s infinite' }} />
          {scanMsg}
        </div>
      )}

      {/* Top artists callout */}
      {topArtists.length > 0 && (
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 600 }}>
            🔥 Showing concerts for your top artists first:
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {topArtists.slice(0, 8).map(a => (
              <span key={a.id} style={{ background: 'var(--surface3)', color: 'var(--accent)', padding: '3px 10px', borderRadius: 50, fontSize: 11, fontWeight: 600, border: '1px solid var(--border2)' }}>
                {a.name}
              </span>
            ))}
            {topArtists.length > 8 && (
              <span style={{ color: 'var(--muted)', fontSize: 11, padding: '3px 6px' }}>+{topArtists.length - 8} more</span>
            )}
          </div>
        </div>
      )}

      {/* Mobile tab switcher */}
      {isMobile && (
        <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: 'var(--surface2)', borderRadius: 50, padding: 4 }}>
          {columns.map(col => (
            <button key={col.key} onClick={() => setMobileTab(col.key)} style={{
              flex: 1, padding: '8px 4px', borderRadius: 50, border: 'none', cursor: 'pointer',
              background: mobileTab === col.key ? 'white' : 'transparent',
              color: mobileTab === col.key ? col.accentColor : 'var(--muted)',
              fontWeight: 700, fontSize: 12, transition: 'all 0.2s',
              boxShadow: mobileTab === col.key ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
              fontFamily: "'Space Grotesk', sans-serif",
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            }}>
              {col.emoji} {col.title}
              <span style={{
                background: col.accentColor, color: 'white',
                borderRadius: 20, padding: '1px 6px', fontSize: 10, fontWeight: 700
              }}>{col.concerts.length}</span>
            </button>
          ))}
        </div>
      )}

      {/* Three columns */}
      {loading ? (
        <div style={{ color: 'var(--muted)', fontSize: 14, padding: '2rem 0', textAlign: 'center' }}>Loading your concerts...</div>
      ) : (
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
          {columns.map(col => (
            <ConcertColumn
              key={col.key}
              title={col.title}
              emoji={col.emoji}
              concerts={col.concerts}
              emptyMsg={col.emptyMsg}
              accentColor={col.accentColor}
              accentBg={col.accentBg}
              isMobile={isMobile}
              mobileActive={mobileTab === col.key}
              onSelect={() => setMobileTab(col.key)}
            />
          ))}
        </div>
      )}

      {/* Link to full list */}
      <div style={{ marginTop: 20, textAlign: 'center' }}>
        <Link to="/concerts" style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}>
          View all concerts & filter by type →
        </Link>
      </div>
    </div>
  );
}


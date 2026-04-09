import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useData } from '../hooks/useData';
import api from '../utils/api';

function SaveButton({ concertId, savedIds, toggleSave, small }) {
  const saved = savedIds.has(concertId);
  return (
    <button
      onClick={e => { e.stopPropagation(); toggleSave(concertId, saved); }}
      title={saved ? 'Remove from watchlist' : 'Save to watchlist'}
      style={{
        background: saved ? '#fce7f3' : 'var(--surface2)',
        border: `1.5px solid ${saved ? '#f472b6' : 'var(--border2)'}`,
        borderRadius: 50, cursor: 'pointer', transition: 'all 0.2s',
        padding: small ? '3px 8px' : '5px 12px',
        fontSize: small ? 11 : 12, fontWeight: 600,
        color: saved ? '#be185d' : 'var(--muted)',
        display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap',
        fontFamily: "'Space Grotesk', sans-serif",
      }}
    >
      {saved ? '♥ Saved' : '♡ Save'}
    </button>
  );
}

function ConcertMiniCard({ concert: c, savedIds, toggleSave }) {
  const dateObj = c.event_date ? new Date(c.event_date) : null;
  const isValid = dateObj && !isNaN(dateObj.getTime());

  return (
    <div style={{
      background: 'white', borderRadius: 14, border: '1.5px solid var(--border)',
      padding: '12px 14px', marginBottom: 8, transition: 'all 0.2s',
      boxShadow: '0 2px 8px rgba(124,58,237,0.04)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2, lineHeight: 1.3 }}>
            {c.artist_name}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>
            {[c.venue, c.city, c.country].filter(Boolean).join(' · ') || 'Location TBC'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>
            {isValid ? dateObj.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : 'Date TBC'}
          </div>
        </div>
        <SaveButton concertId={c.id} savedIds={savedIds} toggleSave={toggleSave} small />
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {c.source_url && (
          <a href={c.source_url} target="_blank" rel="noopener noreferrer"
            className="pill-btn pill-btn-purple"
            style={{ padding: '5px 12px', fontSize: 11, textDecoration: 'none' }}>
            {c.concert_type === 'presale' ? '🔑 Presale' : c.concert_type === 'ticket_sale' ? '🎟️ Tickets' : '🔗 View'} ↗
          </a>
        )}
      </div>
    </div>
  );
}

function ConcertColumn({ title, emoji, concerts, total, emptyMsg, accentColor, accentBg, linkFilter, savedIds, toggleSave, isMobile, mobileActive }) {
  const shown = concerts.slice(0, 10);

  return (
    <div style={{ flex: 1, minWidth: 0, display: isMobile && !mobileActive ? 'none' : 'flex', flexDirection: 'column' }}>
      {/* Column header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, padding: '10px 14px', background: accentBg, borderRadius: 12, border: `1.5px solid ${accentColor}40` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>{emoji}</span>
          <span style={{ fontWeight: 700, fontSize: 14, color: accentColor }}>{title}</span>
        </div>
        <span style={{ background: accentColor, color: 'white', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>
          {total}
        </span>
      </div>

      {/* Cards */}
      <div style={{ flex: 1 }}>
        {total === 0 ? (
          <div style={{ background: 'white', borderRadius: 14, border: '1.5px dashed var(--border2)', padding: '1.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>{emoji}</div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>{emptyMsg}</div>
          </div>
        ) : (
          <>
            {shown.map(c => (
              <ConcertMiniCard key={c.id} concert={c} savedIds={savedIds} toggleSave={toggleSave} />
            ))}
            {total > 10 && (
              <Link to={`/concerts?filter=${linkFilter}`} style={{
                display: 'block', textAlign: 'center', padding: '10px',
                fontSize: 13, color: accentColor, fontWeight: 600,
                background: accentBg, borderRadius: 10, textDecoration: 'none',
                border: `1px solid ${accentColor}30`, marginTop: 4,
              }}>
                See all {total} →
              </Link>
            )}
          </>
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

export default function Dashboard() {
  const { user, refreshUser } = useAuth();
  const { concerts, artists, topArtists, savedIds, loading, refresh, toggleSave } = useData();
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState('');
  const [mobileTab, setMobileTab] = useState('announced');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Get first name
  const firstName = user?.display_name?.split(' ')[0] || user?.display_name || 'there';

  // Build prioritised concert list: fav cities first, then top artists, then rest
  const favCities = (() => { try { return JSON.parse(user?.favorite_cities || '[]'); } catch { return []; } })();
  const topArtistIds = new Set(topArtists.map(a => a.id));

  const prioritise = (list) => {
    const favCity = list.filter(c => favCities.some(fc => c.city?.toLowerCase().includes(fc.toLowerCase())));
    const topArtist = list.filter(c => topArtistIds.has(c.artist_id) && !favCity.includes(c));
    const rest = list.filter(c => !favCity.includes(c) && !topArtist.includes(c));
    return [...favCity, ...topArtist, ...rest];
  };

  // Deduplicate: ticket_sale wins over presale/announcement for same artist
  const deduped = (() => {
    const byArtist = {};
    const typePriority = { ticket_sale: 0, presale: 1, tour_announcement: 2, unknown: 3 };
    concerts.forEach(c => {
      const key = c.artist_id;
      if (!byArtist[key]) {
        byArtist[key] = [];
      }
      byArtist[key].push(c);
    });

    const result = [];
    Object.values(byArtist).forEach(artistConcerts => {
      // Find best type for this artist
      const bestType = artistConcerts.reduce((best, c) => {
        const cp = typePriority[c.concert_type] ?? 3;
        const bp = typePriority[best] ?? 3;
        return cp < bp ? c.concert_type : best;
      }, 'unknown');

      // Keep all concerts of the best type (multiple shows allowed)
      // Suppress lower priority types
      const kept = artistConcerts.filter(c => {
        const cp = typePriority[c.concert_type] ?? 3;
        const bp = typePriority[bestType] ?? 3;
        return cp <= bp;
      });
      result.push(...kept);
    });
    return result;
  })();

  const announced = prioritise(deduped.filter(c => c.concert_type === 'tour_announcement' || c.concert_type === 'unknown'));
  const presales = prioritise(deduped.filter(c => c.concert_type === 'presale'));
  const onSale = prioritise(deduped.filter(c => c.concert_type === 'ticket_sale'));

  const handleSync = async () => {
    setScanning(true); setScanMsg('Syncing your Spotify artists...');
    try {
      const res = await api.syncArtists();
      setScanMsg(`✓ Synced ${res.synced} artists`);
      await refresh(); refreshUser();
    } catch (e) { setScanMsg('Sync failed: ' + e.message); }
    finally { setScanning(false); }
  };

  const handleScan = async () => {
    setScanning(true); setScanMsg('Scanning all sources for new shows...');
    try {
      await api.triggerScan();
      const poll = setInterval(async () => {
        try {
          const status = await api.getScanStatus();
          if (status?.status === 'complete') {
            clearInterval(poll); setScanMsg('Scan complete! Refreshing...');
            await refresh(); setScanMsg(''); setScanning(false);
          } else if (status?.status?.startsWith('error')) {
            clearInterval(poll); setScanMsg('Scan complete with some errors.');
            await refresh(); setScanning(false);
          } else {
            setScanMsg('Scanning your artists...');
          }
        } catch { clearInterval(poll); setScanning(false); setScanMsg(''); }
      }, 3000);
      setTimeout(() => { clearInterval(poll); if (scanning) { setScanning(false); setScanMsg(''); refresh(); } }, 300000);
    } catch (e) { setScanMsg('Scan failed: ' + e.message); setScanning(false); }
  };

  const columns = [
    { key: 'announced', title: 'Announced', emoji: '📢', concerts: announced, total: announced.length, emptyMsg: 'No new announcements', accentColor: '#1d4ed8', accentBg: '#dbeafe', linkFilter: 'announce' },
    { key: 'presale', title: 'Presale Live', emoji: '🔑', concerts: presales, total: presales.length, emptyMsg: 'No active presales', accentColor: '#92400e', accentBg: '#fef3c7', linkFilter: 'presale' },
    { key: 'onsale', title: 'On Sale', emoji: '🎟️', concerts: onSale, total: onSale.length, emptyMsg: 'No tickets on sale yet', accentColor: '#065f46', accentBg: '#d1fae5', linkFilter: 'ticket_sale' },
  ];

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "'Orbitron', monospace", fontSize: 'clamp(1.2rem, 4vw, 1.8rem)', fontWeight: 900, letterSpacing: '0.05em', marginBottom: 4 }}>
          Hey {firstName} 👋
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

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <StatCard label="Artists" value={loading ? '—' : artists.total} emoji="🎵" color="var(--accent)" bg="var(--surface3)" />
        <StatCard label="Announced" value={loading ? '—' : announced.length} emoji="📢" color="#1d4ed8" bg="#dbeafe" />
        <StatCard label="Presales" value={loading ? '—' : presales.length} emoji="🔑" color="#92400e" bg="#fef3c7" />
        <StatCard label="On Sale" value={loading ? '—' : onSale.length} emoji="🎟️" color="#065f46" bg="#d1fae5" />
        <StatCard label="Saved" value={loading ? '—' : savedIds.size} emoji="♥" color="#be185d" bg="#fce7f3" />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, marginBottom: scanMsg ? 14 : 20, flexWrap: 'wrap' }}>
        <button onClick={handleSync} disabled={scanning} className="pill-btn pill-btn-outline" style={{ border: '1.5px solid var(--accent)' }}>
          🎵 Sync artists
        </button>
        <button onClick={handleScan} disabled={scanning} className="pill-btn pill-btn-purple">
          📡 {scanning ? 'Scanning...' : 'Scan for shows'}
        </button>
      </div>

      {scanMsg && (
        <div style={{ background: '#ede9fe', border: '1.5px solid var(--accent-light)', borderRadius: 12, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: 'var(--accent)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', animation: 'pulse 1s infinite' }} />
          {scanMsg}
        </div>
      )}

      {/* Top artists row */}
      {topArtists.length > 0 && (
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 600 }}>🔥 Your top artists:</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {topArtists.slice(0, 6).map(a => (
              <span key={a.id} style={{ background: 'var(--surface3)', color: 'var(--accent)', padding: '3px 10px', borderRadius: 50, fontSize: 11, fontWeight: 600, border: '1px solid var(--border2)' }}>
                {a.name}
              </span>
            ))}
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
              <span style={{ background: col.accentColor, color: 'white', borderRadius: 20, padding: '1px 6px', fontSize: 10 }}>{col.total}</span>
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
              {...col}
              savedIds={savedIds}
              toggleSave={toggleSave}
              isMobile={isMobile}
              mobileActive={mobileTab === col.key}
            />
          ))}
        </div>
      )}

      <div style={{ marginTop: 20, textAlign: 'center' }}>
        <Link to="/concerts" style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}>
          View all concerts →
        </Link>
      </div>
    </div>
  );
}

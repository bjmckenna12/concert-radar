import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../utils/api';

function StatCard({ label, value, accent, sub }) {
  return (
    <div className="y2k-card" style={{ padding: '1.25rem', flex: 1 }}>
      <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 10, color: 'var(--muted)', letterSpacing: '0.12em', marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 26, fontWeight: 900, color: accent || 'var(--text)', lineHeight: 1, textShadow: accent ? `0 0 15px ${accent}60` : 'none' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--muted2)', marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

function ConcertRow({ concert: c }) {
  const SOURCE_TAG = { website: 'tag-green', news: 'tag-blue', twitter: 'tag-purple', mailing_list: 'tag-pink' };
  const SOURCE_LABEL = { website: 'Website', news: 'News', twitter: 'Twitter', mailing_list: 'Mail' };
  const dateObj = c.event_date ? new Date(c.event_date) : null;
  const isValid = dateObj && !isNaN(dateObj.getTime());

  return (
    <div className="y2k-card concert-card-hover" style={{ padding: '1rem', display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 8 }}>
      <div style={{
        background: 'var(--surface2)', minWidth: 50, textAlign: 'center', padding: '8px 6px', flexShrink: 0,
        border: '1px solid var(--border2)',
        clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))',
      }}>
        <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 8, color: 'var(--muted)', textTransform: 'uppercase' }}>
          {isValid ? dateObj.toLocaleString('en-AU', { month: 'short' }) : '—'}
        </div>
        <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 18, fontWeight: 900, color: 'var(--accent)', lineHeight: 1.2 }}>
          {isValid ? dateObj.getDate() : '?'}
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, marginBottom: 3, fontFamily: "'Orbitron', monospace", fontSize: 12, letterSpacing: '0.03em' }}>
          {c.artist_name}
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>
          {[c.venue, c.city].filter(Boolean).join(' · ') || 'Location TBC'}
        </div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          <span className={`tag ${SOURCE_TAG[c.source] || 'tag-gray'}`}>{SOURCE_LABEL[c.source] || c.source}</span>
          {!c.notified && <span className="tag tag-pink">NEW</span>}
        </div>
      </div>
      {c.source_url && (
        <a href={c.source_url} target="_blank" rel="noopener noreferrer" className="y2k-btn y2k-btn-green" style={{ padding: '5px 10px', fontSize: 9, textDecoration: 'none', flexShrink: 0 }}>
          Tickets ↗
        </a>
      )}
    </div>
  );
}

function Spinner() {
  return <div style={{ width: 14, height: 14, border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#050508', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />;
}

export default function Dashboard() {
  const { user, refreshUser } = useAuth();
  const [concerts, setConcerts] = useState([]);
  const [artists, setArtists] = useState({ total: 0 });
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.listConcerts(10).then(d => setConcerts(d?.concerts || [])),
      api.listArtists().then(d => setArtists(d || { total: 0 })),
    ]).finally(() => setLoading(false));
  }, []);

  const handleSync = async () => {
    setScanning(true); setScanMsg('Syncing Spotify artists...');
    try {
      const res = await api.syncArtists();
      setScanMsg(`Synced ${res.synced} artists ✓`);
      const d = await api.listArtists();
      setArtists(d || { total: 0 });
      refreshUser();
    } catch (e) { setScanMsg('Sync failed: ' + e.message); }
    finally { setScanning(false); }
  };

  const handleScan = async () => {
    setScanning(true); setScanMsg('Scan initiated — checking all sources...');
    try {
      await api.triggerScan();
      setScanMsg('Scan running in background. Results appear in ~5 mins.');
      setTimeout(async () => {
        const d = await api.listConcerts(10);
        setConcerts(d?.concerts || []);
        setScanMsg('');
      }, 15000);
    } catch (e) { setScanMsg('Scan failed: ' + e.message); setScanning(false); }
  };

  const needsSetup = !user?.alert_email;
  const newCount = concerts.filter(c => !c.notified).length;

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{ width: 8, height: 8, background: 'var(--accent)', clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)', animation: 'spinDiamond 3s linear infinite' }} />
          <span style={{ fontFamily: "'Orbitron', monospace", fontSize: 10, color: 'var(--muted)', letterSpacing: '0.15em' }}>SYSTEM ONLINE</span>
        </div>
        <h1 style={{ fontFamily: "'Orbitron', monospace", fontSize: 'clamp(1.3rem, 4vw, 2rem)', fontWeight: 900, letterSpacing: '0.05em', marginBottom: 4 }}>
          WELCOME BACK, {user?.display_name?.toUpperCase()?.split(' ')[0]}
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 13 }}>Your concert radar is active.</p>
      </div>

      {/* Setup warning */}
      {needsSetup && (
        <div style={{
          background: 'rgba(255,45,120,0.06)', border: '1px solid rgba(255,45,120,0.3)',
          padding: '14px 18px', marginBottom: 24,
          clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))',
          display: 'flex', alignItems: 'center', gap: 12
        }}>
          <div style={{ fontFamily: "'VT323', monospace", fontSize: 28, color: 'var(--accent2)' }}>!</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 11, fontWeight: 700, color: 'var(--accent2)', marginBottom: 2, letterSpacing: '0.05em' }}>
              ALERT EMAIL NOT SET
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Add your Gmail in Settings to receive concert alerts.</div>
          </div>
          <Link to="/settings" className="y2k-btn y2k-btn-pink" style={{ textDecoration: 'none', padding: '7px 14px', fontSize: 10 }}>
            SETTINGS →
          </Link>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        <StatCard label="Artists monitored" value={loading ? '—' : artists.total} accent="var(--accent)" />
        <StatCard label="Concerts found" value={loading ? '—' : concerts.length} accent="var(--accent4)" />
        <StatCard label="New alerts" value={loading ? '—' : newCount} accent={newCount > 0 ? 'var(--accent2)' : 'var(--muted)'} />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, marginBottom: scanMsg ? 16 : 28, flexWrap: 'wrap' }}>
        <button onClick={handleSync} disabled={scanning} className="y2k-btn y2k-btn-outline" style={{ border: '1px solid var(--accent)' }}>
          {scanning ? <Spinner /> : '◈'} SYNC ARTISTS
        </button>
        <button onClick={handleScan} disabled={scanning} className="y2k-btn y2k-btn-green">
          {scanning ? <Spinner /> : '◎'} SCAN FOR SHOWS
        </button>
      </div>

      {scanMsg && (
        <div style={{
          background: 'var(--surface2)', border: '1px solid var(--border2)',
          padding: '10px 14px', marginBottom: 24, fontSize: 12,
          color: 'var(--accent)', fontFamily: "'Orbitron', monospace", letterSpacing: '0.06em',
          clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
          display: 'flex', alignItems: 'center', gap: 8
        }}>
          <div style={{ width: 6, height: 6, background: 'var(--accent)', borderRadius: '50%', animation: 'pulse 1s infinite' }} />
          {scanMsg}
        </div>
      )}

      {/* Recent concerts */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div className="section-label" style={{ marginBottom: 0, flex: 1 }}>Recent alerts</div>
          <Link to="/concerts" style={{ fontSize: 11, color: 'var(--accent)', fontFamily: "'Orbitron', monospace", letterSpacing: '0.08em', marginLeft: 16 }}>
            VIEW ALL →
          </Link>
        </div>

        {loading ? (
          <div style={{ color: 'var(--muted)', fontSize: 12, padding: '2rem 0', fontFamily: "'Orbitron', monospace", letterSpacing: '0.1em' }}>SCANNING DATABASE...</div>
        ) : concerts.length === 0 ? (
          <div className="y2k-card" style={{ padding: '2.5rem', textAlign: 'center' }}>
            <div style={{ fontFamily: "'VT323', monospace", fontSize: 56, color: 'var(--muted2)', marginBottom: 12, lineHeight: 1 }}>◎</div>
            <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 13, marginBottom: 8 }}>NO SIGNALS DETECTED</div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>
              Hit "Scan for shows" to check your artists now.
            </div>
          </div>
        ) : (
          concerts.map(c => <ConcertRow key={c.id} concert={c} />)
        )}
      </div>
    </div>
  );
}

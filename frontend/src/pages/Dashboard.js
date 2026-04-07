import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../utils/api';

function StatCard({ label, value, accent }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '1.25rem', flex: 1
    }}>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: accent || 'var(--text)' }}>{value}</div>
    </div>
  );
}

function ConcertRow({ concert }) {
  const sourceLabel = { website: 'Artist website', news: 'News', twitter: 'Twitter', mailing_list: 'Mailing list' };
  const sourceColor = { website: 'var(--accent)', news: '#4a9eff', twitter: '#1da1f2', mailing_list: 'var(--accent2)' };

  const date = concert.event_date
    ? new Date(concert.event_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Date TBC';

  return (
    <div style={{
      display: 'flex', gap: 16, padding: '14px 0',
      borderBottom: '1px solid var(--border)', alignItems: 'flex-start',
      animation: 'fadeIn 0.3s ease'
    }}>
      <div style={{
        background: 'var(--surface2)', borderRadius: 8, padding: '8px 10px',
        textAlign: 'center', minWidth: 48, flexShrink: 0
      }}>
        <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {concert.event_date ? new Date(concert.event_date).toLocaleString('en-AU', { month: 'short' }) : '—'}
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1 }}>
          {concert.event_date ? new Date(concert.event_date).getDate() || '?' : '?'}
        </div>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 3 }}>{concert.artist_name}</div>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>
          {[concert.venue, concert.city, concert.country].filter(Boolean).join(' · ') || 'Location TBC'}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 11, padding: '2px 8px', borderRadius: 4,
            fontFamily: "'DM Mono', monospace",
            background: `${sourceColor[concert.source] || '#888'}20`,
            color: sourceColor[concert.source] || 'var(--muted)',
            border: `1px solid ${sourceColor[concert.source] || '#888'}40`
          }}>
            {sourceLabel[concert.source] || concert.source}
          </span>
          {!concert.notified && (
            <span style={{
              fontSize: 11, padding: '2px 8px', borderRadius: 4,
              background: 'rgba(255,107,53,0.12)', color: 'var(--accent2)',
              border: '1px solid rgba(255,107,53,0.25)',
              fontFamily: "'DM Mono', monospace"
            }}>NEW</span>
          )}
        </div>
      </div>
      {concert.source_url && (
        <a href={concert.source_url} target="_blank" rel="noopener noreferrer"
          style={{ color: 'var(--muted2)', fontSize: 18, flexShrink: 0, alignSelf: 'center' }}>
          →
        </a>
      )}
    </div>
  );
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
    setScanning(true);
    setScanMsg('Syncing Spotify artists...');
    try {
      const res = await api.syncArtists();
      setScanMsg(`Synced ${res.synced} artists`);
      const d = await api.listArtists();
      setArtists(d || { total: 0 });
      refreshUser();
    } catch (e) {
      setScanMsg('Sync failed: ' + e.message);
    } finally {
      setScanning(false);
    }
  };

  const handleScan = async () => {
    setScanning(true);
    setScanMsg('Scan started — this may take a few minutes...');
    try {
      await api.triggerScan();
      setScanMsg('Scan running in background. Check back soon!');
      setTimeout(async () => {
        const d = await api.listConcerts(10);
        setConcerts(d?.concerts || []);
        setScanMsg('');
      }, 15000);
    } catch (e) {
      setScanMsg('Scan failed: ' + e.message);
      setScanning(false);
    }
  };

  const needsSetup = !user?.alert_email;

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '2rem', marginBottom: 6 }}>
          Hey {user?.display_name?.split(' ')[0]} 👋
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>
          Here's what Concert Radar has found for you.
        </p>
      </div>

      {needsSetup && (
        <div style={{
          background: 'rgba(255,107,53,0.08)', border: '1px solid rgba(255,107,53,0.25)',
          borderRadius: 12, padding: '14px 18px', marginBottom: 24,
          display: 'flex', alignItems: 'center', gap: 12
        }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent2)', marginBottom: 2 }}>
              Set up your alert email
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>
              Add your Gmail in Settings to receive concert alerts.
            </div>
          </div>
          <Link to="/settings" style={{
            background: 'var(--accent2)', color: '#fff', padding: '7px 14px',
            borderRadius: 7, fontSize: 13, fontWeight: 600, textDecoration: 'none'
          }}>Go to Settings →</Link>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <StatCard label="Artists monitored" value={loading ? '—' : artists.total} accent="var(--accent)" />
        <StatCard label="Concerts found" value={loading ? '—' : concerts.length} />
        <StatCard label="Location" value={user?.location_override || 'Auto-detected'} />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 28, flexWrap: 'wrap' }}>
        <button onClick={handleSync} disabled={scanning} style={{
          background: 'var(--surface)', border: '1px solid var(--border2)',
          color: 'var(--text)', padding: '10px 18px', borderRadius: 8,
          fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8
        }}>
          {scanning ? <Spinner /> : '🎵'} Sync Spotify artists
        </button>
        <button onClick={handleScan} disabled={scanning} style={{
          background: 'var(--accent)', color: '#000',
          padding: '10px 18px', borderRadius: 8,
          fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8
        }}>
          {scanning ? <Spinner dark /> : '📡'} Scan for new shows
        </button>
      </div>

      {scanMsg && (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 8, padding: '10px 14px', marginBottom: 20,
          fontSize: 13, color: 'var(--muted)', fontFamily: "'DM Mono', monospace"
        }}>
          {scanMsg}
        </div>
      )}

      {/* Recent concerts */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{
            fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 8
          }}>
            Recent alerts
            <div style={{ flex: 1, height: 1, background: 'var(--border)', width: 60 }} />
          </div>
          <Link to="/concerts" style={{ fontSize: 13, color: 'var(--accent)' }}>View all →</Link>
        </div>

        {loading ? (
          <div style={{ color: 'var(--muted)', fontSize: 14, padding: '2rem 0' }}>Loading...</div>
        ) : concerts.length === 0 ? (
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '2.5rem', textAlign: 'center'
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🎸</div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>No concerts found yet</div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>
              Hit "Scan for new shows" to check your artists now, or wait for the automatic scan.
            </div>
          </div>
        ) : (
          concerts.map(c => <ConcertRow key={c.id} concert={c} />)
        )}
      </div>
    </div>
  );
}

function Spinner({ dark }) {
  return (
    <div style={{
      width: 14, height: 14, border: `2px solid ${dark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)'}`,
      borderTopColor: dark ? '#000' : '#fff',
      borderRadius: '50%', animation: 'spin 0.7s linear infinite'
    }} />
  );
}

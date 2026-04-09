import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';

const EVENT_CONFIG = {
  concert_detected: { emoji: '📡', label: 'Detected', color: '#1d4ed8', bg: '#dbeafe' },
  saved_concert: { emoji: '♥', label: 'Saved', color: '#be185d', bg: '#fce7f3' },
  presale_opened: { emoji: '🔑', label: 'Presale opened', color: '#92400e', bg: '#fef3c7' },
  ticket_sale: { emoji: '🎟️', label: 'On sale', color: '#065f46', bg: '#d1fae5' },
  badge_earned: { emoji: '🏆', label: 'Badge earned', color: '#7c3aed', bg: '#ede9fe' },
};

function ActivityItem({ item }) {
  const config = EVENT_CONFIG[item.event_type] || { emoji: '📍', label: item.event_type, color: 'var(--text2)', bg: 'var(--surface2)' };
  const date = new Date(item.created_at);
  const timeAgo = getTimeAgo(date);

  return (
    <div style={{ display: 'flex', gap: 14, padding: '14px 0', borderBottom: '1px solid var(--border)', alignItems: 'flex-start' }}>
      {/* Icon */}
      <div style={{ width: 40, height: 40, borderRadius: '50%', background: config.bg, border: `1.5px solid ${config.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
        {config.emoji}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 3 }}>
          {item.artist_name && <span style={{ color: 'var(--accent)' }}>{item.artist_name}</span>}
          {item.artist_name && ' — '}
          <span style={{ color: config.color }}>{config.label}</span>
        </div>
        {item.detail && (
          <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: item.detected_early_days > 0 ? 6 : 0 }}>
            {item.detail}
          </div>
        )}
        {item.detected_early_days > 0 && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#d1fae5', color: '#065f46', padding: '3px 10px', borderRadius: 50, fontSize: 11, fontWeight: 700, border: '1px solid #34d399' }}>
            🚀 Detected ~{item.detected_early_days} days before Ticketmaster
          </div>
        )}
      </div>

      {/* Time */}
      <div style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0, marginTop: 2 }}>{timeAgo}</div>
    </div>
  );
}

function BadgeCard({ badge }) {
  return (
    <div style={{ background: 'white', borderRadius: 14, border: '1.5px solid var(--border)', padding: '14px', textAlign: 'center', boxShadow: 'var(--shadow)' }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>{badge.badge_emoji}</div>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{badge.badge_name}</div>
      <div style={{ fontSize: 11, color: 'var(--muted)' }}>
        {new Date(badge.awarded_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
      </div>
    </div>
  );
}

function LockedBadge({ badgeKey, badge }) {
  return (
    <div style={{ background: 'var(--surface2)', borderRadius: 14, border: '1.5px dashed var(--border2)', padding: '14px', textAlign: 'center', opacity: 0.5 }}>
      <div style={{ fontSize: 32, marginBottom: 8, filter: 'grayscale(1)' }}>{badge.emoji}</div>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{badge.name}</div>
      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{badge.desc}</div>
    </div>
  );
}

function getTimeAgo(date) {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

export default function Activity() {
  const [activities, setActivities] = useState([]);
  const [badges, setBadges] = useState([]);
  const [allBadges, setAllBadges] = useState({});
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('feed');

  useEffect(() => {
    Promise.all([
      api.getActivity(100).then(d => setActivities(d?.activities || [])),
      api.getBadges().then(d => { setBadges(d?.badges || []); setAllBadges(d?.all_badges || {}); }),
      api.getGamificationStats().then(setStats),
    ]).finally(() => setLoading(false));
  }, []);

  const earnedKeys = new Set(badges.map(b => b.badge_key));

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "'Orbitron', monospace", fontSize: '1.5rem', fontWeight: 900, letterSpacing: '0.08em', marginBottom: 6 }}>
          ACTIVITY 📋
        </h1>
        <p style={{ color: 'var(--text2)', fontSize: 13 }}>Your concert radar history and achievements.</p>
      </div>

      {/* Stats row */}
      {stats && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
          {[
            { label: 'Radar Score', value: stats.radar_score, emoji: '⚡', color: 'var(--accent)', bg: 'var(--surface3)' },
            { label: 'Early detections', value: stats.early_detections, emoji: '🚀', color: '#065f46', bg: '#d1fae5' },
            { label: 'Shows saved', value: stats.saved_count, emoji: '♥', color: '#be185d', bg: '#fce7f3' },
            { label: 'Countries', value: stats.countries_covered, emoji: '✈️', color: '#1d4ed8', bg: '#dbeafe' },
            { label: 'Badges', value: badges.length, emoji: '🏆', color: '#92400e', bg: '#fef3c7' },
          ].map(s => (
            <div key={s.label} className="stat-card" style={{ flex: 1, minWidth: 100, background: s.bg }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>{s.emoji}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {[
          { key: 'feed', label: '📋 Activity Feed' },
          { key: 'badges', label: '🏆 Badges' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className="pill-btn" style={{
            padding: '8px 18px', fontSize: 13, borderRadius: 50,
            background: tab === t.key ? 'var(--accent)' : 'white',
            color: tab === t.key ? 'white' : 'var(--text2)',
            border: `1.5px solid ${tab === t.key ? 'var(--accent)' : 'var(--border2)'}`,
            boxShadow: tab === t.key ? '0 4px 12px rgba(124,58,237,0.3)' : 'none',
          }}>{t.label}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>Loading activity...</div>
      ) : tab === 'feed' ? (
        <div className="card" style={{ padding: '0 1.5rem' }}>
          {activities.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📡</div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>No activity yet</div>
              <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16 }}>
                Run a scan to start building your concert history.
              </div>
              <Link to="/dashboard" className="pill-btn pill-btn-purple" style={{ textDecoration: 'none', display: 'inline-flex' }}>
                Go to Dashboard →
              </Link>
            </div>
          ) : (
            activities.map(item => <ActivityItem key={item.id} item={item} />)
          )}
        </div>
      ) : (
        <div>
          {badges.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div className="section-label">Earned badges</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
                {badges.map(b => <BadgeCard key={b.id} badge={b} />)}
              </div>
            </div>
          )}
          <div>
            <div className="section-label">All badges</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
              {Object.entries(allBadges).map(([key, badge]) =>
                earnedKeys.has(key) ? null : <LockedBadge key={key} badgeKey={key} badge={badge} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

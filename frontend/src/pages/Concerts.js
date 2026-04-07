import { useState, useEffect } from 'react';
import api from '../utils/api';

const SOURCE_LABELS = { website: 'Artist website', news: 'News', twitter: 'Twitter', mailing_list: 'Mailing list' };
const SOURCE_COLORS = { website: '#1DB954', news: '#4a9eff', twitter: '#1da1f2', mailing_list: '#ff6b35' };

function Badge({ children, color }) {
  return (
    <span style={{
      fontSize: 11, padding: '3px 8px', borderRadius: 4,
      fontFamily: "'DM Mono', monospace",
      background: `${color}18`, color,
      border: `1px solid ${color}35`
    }}>{children}</span>
  );
}

export default function Concerts() {
  const [concerts, setConcerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.listConcerts(100)
      .then(d => setConcerts(d?.concerts || []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = concerts.filter(c => {
    const matchSource = filter === 'all' || c.source === filter;
    const matchSearch = !search || c.artist_name?.toLowerCase().includes(search.toLowerCase())
      || c.city?.toLowerCase().includes(search.toLowerCase())
      || c.venue?.toLowerCase().includes(search.toLowerCase());
    return matchSource && matchSearch;
  });

  const filterBtn = (val, label) => (
    <button key={val} onClick={() => setFilter(val)} style={{
      padding: '7px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600,
      background: filter === val ? 'var(--surface2)' : 'transparent',
      color: filter === val ? 'var(--text)' : 'var(--muted)',
      border: `1px solid ${filter === val ? 'var(--border2)' : 'transparent'}`,
      fontFamily: "'Syne', sans-serif"
    }}>{label}</button>
  );

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.8rem', marginBottom: 6 }}>
          Concert alerts
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>
          {concerts.length} alerts found across all your followed artists.
        </p>
      </div>

      {/* Search + filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text" placeholder="Search artist, city, venue..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{
            background: 'var(--surface)', border: '1px solid var(--border2)',
            borderRadius: 8, color: 'var(--text)', padding: '8px 14px',
            fontSize: 14, width: 260
          }}
        />
        <div style={{ display: 'flex', gap: 4 }}>
          {filterBtn('all', 'All')}
          {filterBtn('website', 'Website')}
          {filterBtn('news', 'News')}
          {filterBtn('twitter', 'Twitter')}
        </div>
      </div>

      {loading ? (
        <div style={{ color: 'var(--muted)', padding: '3rem 0', textAlign: 'center' }}>Loading concerts...</div>
      ) : filtered.length === 0 ? (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '3rem', textAlign: 'center'
        }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🎸</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>
            {search || filter !== 'all' ? 'No matches found' : 'No concerts yet'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>
            {search || filter !== 'all'
              ? 'Try adjusting your search or filter.'
              : 'Go to the dashboard and trigger a scan to find upcoming shows.'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(c => (
            <div key={c.id} style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '1.25rem',
              display: 'flex', gap: 16, alignItems: 'flex-start',
              animation: 'fadeIn 0.3s ease'
            }}>
              {/* Date block */}
              <div style={{
                background: 'var(--surface2)', borderRadius: 8,
                padding: '8px 10px', textAlign: 'center', minWidth: 52, flexShrink: 0
              }}>
                <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {c.event_date ? new Date(c.event_date).toLocaleString('en-AU', { month: 'short' }) : '—'}
                </div>
                <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.2 }}>
                  {c.event_date ? (new Date(c.event_date).getDate() || '?') : '?'}
                </div>
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{c.artist_name}</div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>
                  {[c.venue, c.city, c.country].filter(Boolean).join(' · ') || 'Location TBC'}
                  {c.event_date && ` · ${new Date(c.event_date).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}`}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: c.raw_text ? 10 : 0 }}>
                  <Badge color={SOURCE_COLORS[c.source] || '#888'}>
                    {SOURCE_LABELS[c.source] || c.source}
                  </Badge>
                  {!c.notified && <Badge color="var(--accent2)">New</Badge>}
                </div>
                {c.raw_text && (
                  <p style={{
                    fontSize: 12, color: 'var(--muted2)', marginTop: 8,
                    lineHeight: 1.6, fontStyle: 'italic',
                    borderLeft: '2px solid var(--border2)', paddingLeft: 10
                  }}>
                    {c.raw_text.substring(0, 250)}{c.raw_text.length > 250 ? '...' : ''}
                  </p>
                )}
              </div>

              {/* Source link */}
              {c.source_url && (
                <a href={c.source_url} target="_blank" rel="noopener noreferrer" style={{
                  color: 'var(--muted)', fontSize: 13, flexShrink: 0,
                  padding: '6px 12px', border: '1px solid var(--border)',
                  borderRadius: 6, textDecoration: 'none', alignSelf: 'flex-start'
                }}>
                  Source →
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

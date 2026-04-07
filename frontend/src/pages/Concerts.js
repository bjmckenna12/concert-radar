import { useState, useEffect } from 'react';
import api from '../utils/api';

export default function Concerts() {
  const [concerts, setConcerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('date');

  useEffect(() => {
    api.listConcerts(100).then(d => setConcerts(d?.concerts || [])).finally(() => setLoading(false));
  }, []);

  const filtered = concerts
    .filter(c => {
      const matchSource = filter === 'all' || c.source === filter;
      const matchSearch = !search ||
        c.artist_name?.toLowerCase().includes(search.toLowerCase()) ||
        c.city?.toLowerCase().includes(search.toLowerCase()) ||
        c.venue?.toLowerCase().includes(search.toLowerCase());
      return matchSource && matchSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'date') {
        if (!a.event_date) return 1;
        if (!b.event_date) return -1;
        return new Date(a.event_date) - new Date(b.event_date);
      }
      if (sortBy === 'location') {
        return (a.city || '').localeCompare(b.city || '');
      }
      if (sortBy === 'artist') {
        return (a.artist_name || '').localeCompare(b.artist_name || '');
      }
      return 0;
    });

  const filterBtn = (val, label) => (
    <button key={val} onClick={() => setFilter(val)} className="y2k-btn" style={{
      padding: '6px 14px', fontSize: 10,
      background: filter === val ? 'var(--accent)' : 'transparent',
      color: filter === val ? '#050508' : 'var(--muted)',
      border: `1px solid ${filter === val ? 'var(--accent)' : 'var(--border2)'}`,
      clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))',
    }}>{label}</button>
  );

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "'Orbitron', monospace", fontSize: '1.5rem', fontWeight: 900, letterSpacing: '0.08em', marginBottom: 6 }}>
          CONCERT ALERTS
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 13 }}>
          {concerts.length} alerts detected across your followed artists
        </p>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text" placeholder="Search artist, city, venue..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="y2k-input" style={{ width: 240 }}
        />
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {filterBtn('all', 'ALL')}
          {filterBtn('website', 'WEBSITE')}
          {filterBtn('news', 'NEWS')}
          {filterBtn('twitter', 'TWITTER')}
        </div>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="y2k-select" style={{ width: 160 }}>
          <option value="date">Sort: Date</option>
          <option value="location">Sort: Location</option>
          <option value="artist">Sort: Artist</option>
        </select>
      </div>

      {loading ? (
        <div style={{ color: 'var(--muted)', padding: '3rem 0', textAlign: 'center', fontFamily: "'Orbitron', monospace", fontSize: 12, letterSpacing: '0.1em' }}>
          SCANNING...
        </div>
      ) : filtered.length === 0 ? (
        <div className="y2k-card" style={{ padding: '3rem', textAlign: 'center' }}>
          <div style={{ fontFamily: "'VT323', monospace", fontSize: 48, color: 'var(--muted2)', marginBottom: 12 }}>◎</div>
          <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 13, marginBottom: 8 }}>NO CONCERTS FOUND</div>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>
            {search || filter !== 'all' ? 'Try adjusting your search or filter.' : 'Go to Dashboard and trigger a scan.'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(c => <ConcertCard key={c.id} concert={c} />)}
        </div>
      )}
    </div>
  );
}

function ConcertCard({ concert: c }) {
  const SOURCE_TAG_MAP = { website: 'tag-green', news: 'tag-blue', twitter: 'tag-purple', mailing_list: 'tag-pink' };
  const SOURCE_LABELS = { website: 'Website', news: 'News', twitter: 'Twitter', mailing_list: 'Mail' };

  const dateObj = c.event_date ? new Date(c.event_date) : null;
  const isValid = dateObj && !isNaN(dateObj.getTime());

  return (
    <div className="y2k-card concert-card-hover" style={{ padding: '1.25rem', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
      {/* Date block */}
      <div style={{
        background: 'var(--surface2)', minWidth: 54, textAlign: 'center',
        padding: '10px 8px', flexShrink: 0, border: '1px solid var(--border2)',
        clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))',
      }}>
        <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {isValid ? dateObj.toLocaleString('en-AU', { month: 'short' }) : '—'}
        </div>
        <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 20, fontWeight: 900, color: 'var(--accent)', lineHeight: 1.2 }}>
          {isValid ? dateObj.getDate() : '?'}
        </div>
        <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 9, color: 'var(--muted2)' }}>
          {isValid ? dateObj.getFullYear() : ''}
        </div>
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, fontFamily: "'Orbitron', monospace", letterSpacing: '0.03em' }}>
          {c.artist_name}
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>
          {[c.venue, c.city, c.country].filter(Boolean).join(' · ') || 'Location TBC'}
          {isValid && ` · ${dateObj.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}`}
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: c.raw_text ? 10 : 0 }}>
          <span className={`tag ${SOURCE_TAG_MAP[c.source] || 'tag-gray'}`}>
            {SOURCE_LABELS[c.source] || c.source}
          </span>
          {!c.notified && <span className="tag tag-pink">NEW</span>}
          {c.cost && <span className="tag tag-purple">{c.cost}</span>}
        </div>

        {c.raw_text && (
          <p style={{ fontSize: 12, color: 'var(--muted2)', lineHeight: 1.6, fontStyle: 'italic', borderLeft: '2px solid var(--border2)', paddingLeft: 10, marginTop: 8 }}>
            {c.raw_text.substring(0, 220)}{c.raw_text.length > 220 ? '...' : ''}
          </p>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
        {c.source_url && (
          <a href={c.source_url} target="_blank" rel="noopener noreferrer" className="y2k-btn y2k-btn-outline" style={{ padding: '6px 12px', fontSize: 10, textDecoration: 'none' }}>
            Source ↗
          </a>
        )}
        {c.source_url && (
          <a href={c.source_url} target="_blank" rel="noopener noreferrer" className="y2k-btn y2k-btn-green" style={{ padding: '6px 12px', fontSize: 10, textDecoration: 'none' }}>
            Tickets ↗
          </a>
        )}
      </div>
    </div>
  );
}

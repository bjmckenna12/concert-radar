import { useState } from 'react';
import { useData } from '../hooks/useData';

const TYPE_CONFIG = {
  presale: { label: '🔑 Presale', cls: 'badge-presale' },
  ticket_sale: { label: '🎟️ Tickets On Sale', cls: 'badge-ticket' },
  tour_announcement: { label: '📢 Announced', cls: 'badge-announce' },
  unknown: { label: '📍 Concert', cls: 'badge-unknown' },
};
const SOURCE_LABELS = { website: '🌐 Website', news: '📰 News', twitter: '🐦 Twitter', mailing_list: '📧 Email' };

export default function Concerts() {
  const { concerts, loading } = useData();
  const [filter, setFilter] = useState('ticket_sale');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('date');

  const filtered = concerts
    .filter(c => {
      if (filter === 'ticket_sale') return ['ticket_sale', 'presale'].includes(c.concert_type);
      if (filter === 'announce') return c.concert_type === 'tour_announcement';
      if (filter === 'all') return true;
      return true;
    })
    .filter(c => !search ||
      c.artist_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.city?.toLowerCase().includes(search.toLowerCase()) ||
      c.venue?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'date') {
        if (!a.event_date) return 1; if (!b.event_date) return -1;
        return new Date(a.event_date) - new Date(b.event_date);
      }
      if (sortBy === 'location') return (a.city || '').localeCompare(b.city || '');
      if (sortBy === 'artist') return (a.artist_name || '').localeCompare(b.artist_name || '');
      return 0;
    });

  const filterBtn = (val, label, count) => (
    <button key={val} onClick={() => setFilter(val)} className="pill-btn" style={{
      padding: '7px 16px', fontSize: 12,
      background: filter === val ? 'var(--accent)' : 'white',
      color: filter === val ? 'white' : 'var(--text2)',
      border: `1.5px solid ${filter === val ? 'var(--accent)' : 'var(--border2)'}`,
      borderRadius: 50,
      boxShadow: filter === val ? '0 4px 12px rgba(124,58,237,0.3)' : 'none',
    }}>
      {label} {count !== undefined && <span style={{ background: filter === val ? 'rgba(255,255,255,0.25)' : 'var(--surface3)', borderRadius: 10, padding: '1px 6px', marginLeft: 4, fontSize: 10 }}>{count}</span>}
    </button>
  );

  const ticketCount = concerts.filter(c => ['ticket_sale','presale'].includes(c.concert_type)).length;
  const announceCount = concerts.filter(c => c.concert_type === 'tour_announcement').length;

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "'Orbitron', monospace", fontSize: '1.5rem', fontWeight: 900, letterSpacing: '0.08em', marginBottom: 6 }}>CONCERTS 🎸</h1>
        <p style={{ color: 'var(--text2)', fontSize: 13 }}>{concerts.length} alerts detected across your followed artists</p>
      </div>

      {/* Info banner */}
      <div style={{ background: '#ede9fe', borderRadius: 12, padding: '10px 16px', marginBottom: 20, fontSize: 13, color: 'var(--accent)', fontWeight: 500, border: '1px solid var(--accent-light)' }}>
        🎟️ <strong>Tickets On Sale</strong> tab shows confirmed sales & presales only. Switch to <strong>All</strong> to see tour announcements too.
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <input type="text" placeholder="Search artist, city, venue..." value={search} onChange={e => setSearch(e.target.value)} className="input-field" style={{ width: 240, borderRadius: 50, padding: '9px 18px' }} />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {filterBtn('ticket_sale', '🎟️ Tickets & Presales', ticketCount)}
          {filterBtn('announce', '📢 Announcements', announceCount)}
          {filterBtn('all', '✦ All')}
        </div>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="select-field" style={{ width: 150, borderRadius: 50, padding: '9px 16px' }}>
          <option value="date">Sort: Date</option>
          <option value="location">Sort: Location</option>
          <option value="artist">Sort: Artist</option>
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', fontSize: 14, color: 'var(--muted)' }}>Loading concerts...</div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎸</div>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>
            {search || filter !== 'all' ? 'No matches found' : 'No concerts yet'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text2)' }}>
            {search || filter !== 'all' ? 'Try changing your filter or search.' : 'Go to Dashboard and trigger a scan.'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(c => <ConcertCard key={c.id} concert={c} />)}
        </div>
      )}
    </div>
  );
}

function ConcertCard({ concert: c }) {
  const dateObj = c.event_date ? new Date(c.event_date) : null;
  const isValid = dateObj && !isNaN(dateObj.getTime());
  const type = TYPE_CONFIG[c.concert_type] || TYPE_CONFIG.unknown;
  const sourceLabel = SOURCE_LABELS[c.source] || c.source;

  return (
    <div className="concert-card">
      <div style={{ background: 'linear-gradient(135deg, var(--surface3), var(--pink-light))', borderRadius: 12, minWidth: 54, textAlign: 'center', padding: '10px 8px', flexShrink: 0 }}>
        <div style={{ fontSize: 10, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
          {isValid ? dateObj.toLocaleString('en-AU', { month: 'short' }) : '—'}
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent)', lineHeight: 1.2 }}>
          {isValid ? dateObj.getDate() : '?'}
        </div>
        <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600 }}>
          {isValid ? dateObj.getFullYear() : ''}
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{c.artist_name}</div>
        <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 8 }}>
          {[c.venue, c.city, c.country].filter(Boolean).join(' · ') || 'Location TBC'}
          {isValid && ` · ${dateObj.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}`}
        </div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
          <span className={`type-badge ${type.cls}`}>{type.label}</span>
          <span className="type-badge badge-source">{sourceLabel}</span>
          {!c.notified && <span className="type-badge badge-new">✨ New</span>}
          {c.price && <span className="type-badge" style={{background:'#d1fae5',color:'#065f46',border:'1.5px solid #34d399'}}>💰 {c.price}</span>}
        </div>
        {c.raw_text && (
          <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6, marginTop: 8, fontStyle: 'italic', borderLeft: '3px solid var(--border2)', paddingLeft: 10 }}>
            {c.raw_text.substring(0, 200)}{c.raw_text.length > 200 ? '...' : ''}
          </p>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
        {c.source_url && (
          <a href={c.source_url} target="_blank" rel="noopener noreferrer" className="pill-btn pill-btn-purple" style={{ padding: '7px 14px', fontSize: 11, textDecoration: 'none' }}>
            🎟️ Tickets ↗
          </a>
        )}
        {c.source_url && (
          <a href={c.source_url} target="_blank" rel="noopener noreferrer" className="pill-btn pill-btn-outline" style={{ padding: '7px 14px', fontSize: 11, textDecoration: 'none', border: '1.5px solid var(--accent)' }}>
            Source ↗
          </a>
        )}
      </div>
    </div>
  );
}

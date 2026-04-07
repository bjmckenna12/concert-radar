import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../utils/api';

function Toggle({ value, onChange }) {
  return (
    <div onClick={() => onChange(!value)} style={{
      width: 40, height: 22, borderRadius: 11, flexShrink: 0, cursor: 'pointer',
      background: value ? 'var(--accent)' : 'var(--surface2)',
      border: `1px solid ${value ? 'var(--accent)' : 'var(--border2)'}`,
      position: 'relative', transition: 'all 0.2s'
    }}>
      <div style={{
        position: 'absolute', width: 16, height: 16, background: '#fff',
        borderRadius: '50%', top: 2,
        left: value ? 20 : 2, transition: 'left 0.2s'
      }} />
    </div>
  );
}

function SettingRow({ label, sub, value, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
      <div>
        <div style={{ fontSize: 14 }}>{label}</div>
        {sub && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{sub}</div>}
      </div>
      <Toggle value={value} onChange={onChange} />
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{
      fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: '0.12em',
      textTransform: 'uppercase', color: 'var(--muted)',
      display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12
    }}>
      {children}
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
  );
}

export default function Settings() {
  const { user, refreshUser } = useAuth();
  const [form, setForm] = useState({
    alert_email: user?.alert_email || '',
    location_override: user?.location_override || '',
    radius_km: user?.radius_km || 80,
    scan_frequency_hours: user?.scan_frequency_hours || 6,
    include_nearby_cities: user?.include_nearby_cities ?? true,
    monitor_websites: user?.monitor_websites ?? true,
    monitor_news: user?.monitor_news ?? true,
    monitor_twitter: user?.monitor_twitter ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await api.updateSettings(form);
      await refreshUser();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    background: 'var(--surface2)', border: '1px solid var(--border2)',
    borderRadius: 8, color: 'var(--text)', padding: '9px 12px',
    fontSize: 14, width: '100%'
  };

  return (
    <div style={{ animation: 'fadeIn 0.4s ease', maxWidth: 600 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.8rem', marginBottom: 6 }}>Settings</h1>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>Configure your alerts and monitoring preferences.</p>
      </div>

      {/* Notifications */}
      <div style={{ marginBottom: 28 }}>
        <SectionLabel>Notifications</SectionLabel>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.25rem' }}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>
              Alert email (Gmail)
            </label>
            <input
              type="email" placeholder="your.email@gmail.com"
              value={form.alert_email} onChange={e => set('alert_email', e.target.value)}
              style={inputStyle}
            />
            <p style={{ fontSize: 11, color: 'var(--muted2)', marginTop: 6 }}>
              We'll email you when new concerts are detected. Use a Gmail address.
            </p>
          </div>

          <div>
            <label style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>
              Scan frequency
            </label>
            <select value={form.scan_frequency_hours} onChange={e => set('scan_frequency_hours', Number(e.target.value))} style={inputStyle}>
              <option value={2}>Every 2 hours (most urgent)</option>
              <option value={6}>Every 6 hours (recommended)</option>
              <option value={12}>Every 12 hours</option>
              <option value={24}>Daily</option>
            </select>
          </div>
        </div>
      </div>

      {/* Location */}
      <div style={{ marginBottom: 28 }}>
        <SectionLabel>Location</SectionLabel>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.25rem' }}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>
              Location override
            </label>
            <input
              type="text" placeholder="Leave blank to auto-detect via IP"
              value={form.location_override} onChange={e => set('location_override', e.target.value)}
              style={inputStyle}
            />
            <p style={{ fontSize: 11, color: 'var(--muted2)', marginTop: 6 }}>
              Example: "Hobart, Tasmania" or "Melbourne, VIC". Auto-detection updates when you move.
            </p>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>
              Search radius
            </label>
            <select value={form.radius_km} onChange={e => set('radius_km', Number(e.target.value))} style={inputStyle}>
              <option value={50}>50 km</option>
              <option value={80}>80 km (~50 miles)</option>
              <option value={150}>150 km</option>
              <option value={300}>300 km</option>
            </select>
          </div>

          <SettingRow
            label="Expand search to Melbourne & Sydney"
            sub="Auto-enabled when you're detected in Tasmania"
            value={form.include_nearby_cities}
            onChange={v => set('include_nearby_cities', v)}
          />
        </div>
      </div>

      {/* Monitoring sources */}
      <div style={{ marginBottom: 28 }}>
        <SectionLabel>Monitoring sources</SectionLabel>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.25rem' }}>
          <SettingRow
            label="Artist official websites"
            sub="Tour page scraping with change detection"
            value={form.monitor_websites}
            onChange={v => set('monitor_websites', v)}
          />
          <SettingRow
            label="Google News RSS"
            sub="News articles mentioning tour/concert/tickets"
            value={form.monitor_news}
            onChange={v => set('monitor_news', v)}
          />
          <SettingRow
            label="Twitter / X"
            sub="Public artist posts via Nitter (no API key needed)"
            value={form.monitor_twitter}
            onChange={v => set('monitor_twitter', v)}
          />
        </div>
      </div>

      {/* Share */}
      <div style={{ marginBottom: 28 }}>
        <SectionLabel>Share with friends</SectionLabel>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.25rem' }}>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12, lineHeight: 1.6 }}>
            Share this link with friends. They connect their own Spotify and get their own personalised alerts.
          </p>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 8, padding: '10px 14px' }}>
            <span style={{ flex: 1, fontSize: 13, fontFamily: "'DM Mono', monospace", color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {window.location.origin}
            </span>
            <button onClick={() => navigator.clipboard.writeText(window.location.origin)} style={{
              background: 'transparent', color: 'var(--accent)', fontSize: 12, fontWeight: 700,
              fontFamily: "'Syne', sans-serif", border: 'none', cursor: 'pointer', whiteSpace: 'nowrap'
            }}>Copy link</button>
          </div>
        </div>
      </div>

      {/* Save */}
      {error && (
        <div style={{ background: 'rgba(231,76,60,0.1)', border: '1px solid rgba(231,76,60,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#e74c3c' }}>
          {error}
        </div>
      )}

      <button onClick={handleSave} disabled={saving} style={{
        background: saved ? 'var(--accent)' : 'var(--accent)',
        color: '#000', padding: '12px 28px', borderRadius: 8,
        fontSize: 15, fontWeight: 700, width: '100%',
        opacity: saving ? 0.7 : 1,
        fontFamily: "'Syne', sans-serif"
      }}>
        {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save settings'}
      </button>
    </div>
  );
}

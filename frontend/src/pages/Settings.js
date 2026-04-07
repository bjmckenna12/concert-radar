import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../utils/api';

const MAX_CITIES = 5;

function Toggle({ value, onChange }) {
  return (
    <div onClick={() => onChange(!value)} style={{
      width: 42, height: 24, borderRadius: 0, flexShrink: 0, cursor: 'pointer',
      background: value ? 'var(--accent)' : 'var(--surface2)',
      border: `1px solid ${value ? 'var(--accent)' : 'var(--border2)'}`,
      position: 'relative', transition: 'all 0.2s',
      clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))',
      boxShadow: value ? '0 0 10px rgba(0,255,159,0.3)' : 'none',
    }}>
      <div style={{
        position: 'absolute', width: 16, height: 16, background: value ? '#050508' : 'var(--muted)',
        top: 3, left: value ? 22 : 3, transition: 'left 0.2s',
      }} />
    </div>
  );
}

function SettingRow({ label, sub, value, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
      <div>
        <div style={{ fontSize: 13 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{sub}</div>}
      </div>
      <Toggle value={value} onChange={onChange} />
    </div>
  );
}

export default function Settings() {
  const { user, refreshUser } = useAuth();

  const parseFavCities = () => {
    try { return JSON.parse(user?.favorite_cities || '[]'); } catch { return []; }
  };

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

  const [favCities, setFavCities] = useState(parseFavCities());
  const [newCity, setNewCity] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const addCity = () => {
    const city = newCity.trim();
    if (!city || favCities.includes(city) || favCities.length >= MAX_CITIES) return;
    setFavCities([...favCities, city]);
    setNewCity('');
  };

  const removeCity = (city) => setFavCities(favCities.filter(c => c !== city));

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      await api.updateSettings({ ...form, favorite_cities: JSON.stringify(favCities) });
      await refreshUser();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.4s ease', maxWidth: 620 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "'Orbitron', monospace", fontSize: '1.5rem', fontWeight: 900, letterSpacing: '0.08em', marginBottom: 6 }}>
          SETTINGS
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 13 }}>Configure your alerts and monitoring preferences.</p>
      </div>

      {/* Notifications */}
      <div style={{ marginBottom: 24 }}>
        <div className="section-label">Notifications</div>
        <div className="y2k-card" style={{ padding: '1.25rem' }}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, color: 'var(--accent)', fontFamily: "'Orbitron', monospace", letterSpacing: '0.1em', display: 'block', marginBottom: 8 }}>ALERT EMAIL</label>
            <input type="email" placeholder="your.email@gmail.com" value={form.alert_email} onChange={e => set('alert_email', e.target.value)} className="y2k-input" />
            <p style={{ fontSize: 11, color: 'var(--muted2)', marginTop: 6 }}>Use a Gmail address. Alerts send when new concerts are detected.</p>
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--accent)', fontFamily: "'Orbitron', monospace", letterSpacing: '0.1em', display: 'block', marginBottom: 8 }}>SCAN FREQUENCY</label>
            <select value={form.scan_frequency_hours} onChange={e => set('scan_frequency_hours', Number(e.target.value))} className="y2k-select">
              <option value={2}>Every 2 hours — most urgent</option>
              <option value={6}>Every 6 hours — recommended</option>
              <option value={12}>Every 12 hours</option>
              <option value={24}>Once daily</option>
              <option value={84}>Twice a week</option>
              <option value={168}>Once a week</option>
            </select>
          </div>
        </div>
      </div>

      {/* Location */}
      <div style={{ marginBottom: 24 }}>
        <div className="section-label">Location</div>
        <div className="y2k-card" style={{ padding: '1.25rem' }}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, color: 'var(--accent)', fontFamily: "'Orbitron', monospace", letterSpacing: '0.1em', display: 'block', marginBottom: 8 }}>HOME LOCATION OVERRIDE</label>
            <input type="text" placeholder="Auto-detected via IP — override here" value={form.location_override} onChange={e => set('location_override', e.target.value)} className="y2k-input" />
            <p style={{ fontSize: 11, color: 'var(--muted2)', marginTop: 6 }}>Example: "Hobart, Tasmania". Leave blank to auto-detect. Updates automatically when you move.</p>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, color: 'var(--accent)', fontFamily: "'Orbitron', monospace", letterSpacing: '0.1em', display: 'block', marginBottom: 8 }}>SEARCH RADIUS</label>
            <select value={form.radius_km} onChange={e => set('radius_km', Number(e.target.value))} className="y2k-select">
              <option value={50}>50 km</option>
              <option value={80}>80 km (~50 miles)</option>
              <option value={150}>150 km</option>
              <option value={300}>300 km</option>
            </select>
          </div>

          {/* Favourite cities */}
          <div>
            <label style={{ fontSize: 11, color: 'var(--accent)', fontFamily: "'Orbitron', monospace", letterSpacing: '0.1em', display: 'block', marginBottom: 8 }}>
              FAVOURITE CITIES <span style={{ color: 'var(--muted2)' }}>({favCities.length}/{MAX_CITIES})</span>
            </label>
            <p style={{ fontSize: 11, color: 'var(--muted2)', marginBottom: 10 }}>Concerts in these cities are always included, regardless of your detected location.</p>

            {/* City tags */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {favCities.map(city => (
                <div key={city} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.25)',
                  padding: '4px 10px', fontSize: 12, color: 'var(--accent4)',
                  clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))',
                }}>
                  <span>◆</span>
                  {city}
                  <button onClick={() => removeCity(city)} style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
                </div>
              ))}
              {favCities.length === 0 && (
                <span style={{ fontSize: 12, color: 'var(--muted2)' }}>No favourite cities added yet</span>
              )}
            </div>

            {/* Add city */}
            {favCities.length < MAX_CITIES && (
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text" placeholder="Add a city (e.g. Boston)"
                  value={newCity}
                  onChange={e => setNewCity(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addCity()}
                  className="y2k-input" style={{ flex: 1 }}
                />
                <button onClick={addCity} className="y2k-btn y2k-btn-outline" style={{ border: '1px solid var(--accent)', whiteSpace: 'nowrap' }}>
                  + ADD
                </button>
              </div>
            )}
          </div>

          <div style={{ marginTop: 14 }}>
            <SettingRow
              label="Include Melbourne & Sydney when in Tasmania"
              sub="Auto-enabled when your IP is detected in Tasmania"
              value={form.include_nearby_cities}
              onChange={v => set('include_nearby_cities', v)}
            />
          </div>
        </div>
      </div>

      {/* Sources */}
      <div style={{ marginBottom: 24 }}>
        <div className="section-label">Monitoring sources</div>
        <div className="y2k-card" style={{ padding: '1.25rem' }}>
          <SettingRow label="Artist official websites" sub="Tour page scraping with change detection" value={form.monitor_websites} onChange={v => set('monitor_websites', v)} />
          <SettingRow label="Google News RSS" sub="Articles mentioning tour/concert/tickets" value={form.monitor_news} onChange={v => set('monitor_news', v)} />
          <SettingRow label="Twitter / X" sub="Public artist posts via Nitter (no API key needed)" value={form.monitor_twitter} onChange={v => set('monitor_twitter', v)} />
        </div>
      </div>

      {/* Share */}
      <div style={{ marginBottom: 24 }}>
        <div className="section-label">Share with friends</div>
        <div className="y2k-card" style={{ padding: '1.25rem' }}>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12, lineHeight: 1.6 }}>
            Share this link. Friends connect their own Spotify and get their own personalised alerts.
          </p>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: 'var(--surface2)', border: '1px solid var(--border2)', padding: '10px 14px', clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))' }}>
            <span style={{ flex: 1, fontSize: 12, fontFamily: "'Orbitron', monospace", color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '0.04em' }}>
              {window.location.origin}
            </span>
            <button onClick={() => navigator.clipboard.writeText(window.location.origin)} style={{ background: 'transparent', color: 'var(--accent)', fontSize: 11, fontWeight: 700, fontFamily: "'Orbitron', monospace", border: 'none', cursor: 'pointer', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
              COPY ↗
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(255,45,120,0.08)', border: '1px solid rgba(255,45,120,0.3)', padding: '10px 14px', marginBottom: 14, fontSize: 13, color: 'var(--accent2)', clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))' }}>
          {error}
        </div>
      )}

      <button onClick={handleSave} disabled={saving} className="y2k-btn y2k-btn-green" style={{ width: '100%', padding: '13px 20px', fontSize: 12 }}>
        {saving ? 'SAVING...' : saved ? '✓ SAVED' : '◈ SAVE SETTINGS'}
      </button>
    </div>
  );
}

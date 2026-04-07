import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../utils/api';

const MAX_CITIES = 5;

function Toggle({ value, onChange }) {
  return (
    <div onClick={() => onChange(!value)} className="toggle-track" style={{ background: value ? 'var(--accent)' : 'var(--muted2)' }}>
      <div className="toggle-thumb" style={{ left: value ? 22 : 3 }} />
    </div>
  );
}

function SettingRow({ label, sub, value, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 500 }}>{label}</div>
        {sub && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{sub}</div>}
      </div>
      <Toggle value={value} onChange={onChange} />
    </div>
  );
}

export default function Settings() {
  const { user, refreshUser } = useAuth();
  const parseFavCities = () => { try { return JSON.parse(user?.favorite_cities || '[]'); } catch { return []; } };

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

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      await api.updateSettings({ ...form, favorite_cities: JSON.stringify(favCities) });
      await refreshUser();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ animation: 'fadeIn 0.4s ease', maxWidth: 620 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "'Orbitron', monospace", fontSize: '1.5rem', fontWeight: 900, letterSpacing: '0.08em', marginBottom: 6 }}>SETTINGS ⚙️</h1>
        <p style={{ color: 'var(--text2)', fontSize: 13 }}>Configure your alerts and monitoring preferences.</p>
      </div>

      {/* Notifications */}
      <div style={{ marginBottom: 24 }}>
        <div className="section-label">Notifications</div>
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', display: 'block', marginBottom: 8 }}>ALERT EMAIL</label>
            <input type="email" placeholder="your.email@gmail.com" value={form.alert_email} onChange={e => set('alert_email', e.target.value)} className="input-field" />
            <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>Use a Gmail address. Alerts send when new concerts are detected.</p>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', display: 'block', marginBottom: 8 }}>SCAN FREQUENCY</label>
            <select value={form.scan_frequency_hours} onChange={e => set('scan_frequency_hours', Number(e.target.value))} className="select-field">
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
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', display: 'block', marginBottom: 8 }}>HOME LOCATION</label>
            <input type="text" placeholder="Auto-detected via IP — override here" value={form.location_override} onChange={e => set('location_override', e.target.value)} className="input-field" />
            <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>e.g. "Hobart, Tasmania". Auto-detects when you move if left blank.</p>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', display: 'block', marginBottom: 8 }}>SEARCH RADIUS</label>
            <select value={form.radius_km} onChange={e => set('radius_km', Number(e.target.value))} className="select-field">
              <option value={50}>50 km</option>
              <option value={80}>80 km (~50 miles)</option>
              <option value={150}>150 km</option>
              <option value={300}>300 km</option>
            </select>
          </div>

          {/* Favourite cities */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', display: 'block', marginBottom: 4 }}>
              FAVOURITE CITIES <span style={{ color: 'var(--muted)', fontWeight: 400 }}>({favCities.length}/{MAX_CITIES})</span>
            </label>
            <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 10 }}>Concerts here are always included, regardless of your detected location.</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {favCities.map(city => (
                <div key={city} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--blue-light)', color: '#1e40af', padding: '5px 12px', borderRadius: 50, fontSize: 13, fontWeight: 600, border: '1.5px solid var(--blue)' }}>
                  📍 {city}
                  <button onClick={() => setFavCities(favCities.filter(c => c !== city))} style={{ background: 'transparent', border: 'none', color: '#1e40af', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0, marginLeft: 2 }}>×</button>
                </div>
              ))}
              {favCities.length === 0 && <span style={{ fontSize: 13, color: 'var(--muted)' }}>No favourite cities yet</span>}
            </div>
            {favCities.length < MAX_CITIES && (
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="text" placeholder="Add a city (e.g. Boston, Melbourne)" value={newCity} onChange={e => setNewCity(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCity()} className="input-field" style={{ flex: 1 }} />
                <button onClick={addCity} className="pill-btn pill-btn-outline" style={{ whiteSpace: 'nowrap', border: '1.5px solid var(--accent)' }}>+ Add</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sources */}
      <div style={{ marginBottom: 24 }}>
        <div className="section-label">Monitoring sources</div>
        <div className="card" style={{ padding: '1.25rem' }}>
          <SettingRow label="Artist official websites" sub="Tour page scraping with change detection" value={form.monitor_websites} onChange={v => set('monitor_websites', v)} />
          <SettingRow label="Google News RSS" sub="Articles mentioning tour/concert/tickets" value={form.monitor_news} onChange={v => set('monitor_news', v)} />
          <SettingRow label="Twitter / X" sub="Public artist posts via Nitter (no API key needed)" value={form.monitor_twitter} onChange={v => set('monitor_twitter', v)} />
        </div>
      </div>

      {/* Share */}
      <div style={{ marginBottom: 24 }}>
        <div className="section-label">Share with friends</div>
        <div className="card" style={{ padding: '1.25rem' }}>
          <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 12, lineHeight: 1.6 }}>Share this link. Friends connect their own Spotify and get their own personalised alerts.</p>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: 'var(--surface2)', border: '1.5px solid var(--border2)', borderRadius: 12, padding: '10px 14px' }}>
            <span style={{ flex: 1, fontSize: 13, color: 'var(--accent)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>{window.location.origin}</span>
            <button onClick={() => navigator.clipboard.writeText(window.location.origin)} className="pill-btn pill-btn-purple" style={{ padding: '6px 14px', fontSize: 12 }}>Copy</button>
          </div>
        </div>
      </div>

      {error && <div style={{ background: '#fce7f3', border: '1.5px solid var(--pink)', borderRadius: 12, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#9d174d' }}>{error}</div>}

      <button onClick={handleSave} disabled={saving} className="pill-btn pill-btn-purple" style={{ width: '100%', padding: '14px', fontSize: 14 }}>
        {saving ? 'Saving...' : saved ? '✓ Saved!' : '💾 Save Settings'}
      </button>
    </div>
  );
}

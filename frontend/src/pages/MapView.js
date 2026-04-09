import { useEffect, useState } from 'react';
import { useData } from '../hooks/useData';

const CITY_COORDS = {
  'Hobart': [-42.8821, 147.3272], 'Melbourne': [-37.8136, 144.9631],
  'Sydney': [-33.8688, 151.2093], 'Brisbane': [-27.4698, 153.0251],
  'Perth': [-31.9505, 115.8605], 'Adelaide': [-34.9285, 138.6007],
  'Canberra': [-35.2809, 149.1300], 'Darwin': [-12.4634, 130.8456],
  'Boston': [42.3601, -71.0589], 'New York': [40.7128, -74.0060],
  'Los Angeles': [34.0522, -118.2437], 'Chicago': [41.8781, -87.6298],
  'London': [51.5074, -0.1278], 'Paris': [48.8566, 2.3522],
  'Tokyo': [35.6762, 139.6503], 'Toronto': [43.6532, -79.3832],
  'Auckland': [-36.8509, 174.7645], 'Dublin': [53.3498, -6.2603],
  'Berlin': [52.5200, 13.4050], 'Amsterdam': [52.3676, 4.9041],
};

function getCoords(city) {
  if (!city) return null;
  for (const [name, coords] of Object.entries(CITY_COORDS)) {
    if (city.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(city.toLowerCase())) {
      return coords;
    }
  }
  return null;
}

export default function MapView() {
  const { concerts, loading } = useData();
  const [MapComponents, setMapComponents] = useState(null);
  const [selectedCity, setSelectedCity] = useState(null);



  useEffect(() => {
    import('react-leaflet').then(rl => {
      setMapComponents({ MapContainer: rl.MapContainer, TileLayer: rl.TileLayer, CircleMarker: rl.CircleMarker, Popup: rl.Popup });
    }).catch(() => setMapComponents(null));
  }, []);

  const cityGroups = {};
  concerts.forEach(c => {
    const coords = getCoords(c.city);
    if (!coords) return;
    const key = c.city || 'Unknown';
    if (!cityGroups[key]) cityGroups[key] = { coords, concerts: [], city: c.city };
    cityGroups[key].concerts.push(c);
  });
  const cities = Object.values(cityGroups).sort((a, b) => b.concerts.length - a.concerts.length);

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '4rem' }}>
      <div style={{ fontSize: 48, animation: 'float 2s ease-in-out infinite', marginBottom: 16 }}>🗺️</div>
      <div style={{ color: 'var(--muted)', fontSize: 14 }}>Loading map...</div>
    </div>
  );

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "'Orbitron', monospace", fontSize: '1.5rem', fontWeight: 900, letterSpacing: '0.08em', marginBottom: 6 }}>CONCERT MAP 🗺️</h1>
        <p style={{ color: 'var(--text2)', fontSize: 13 }}>{cities.length} cities with upcoming shows</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16, alignItems: 'start' }}>
        {/* Map */}
        <div style={{ borderRadius: 24, overflow: 'hidden', border: '1.5px solid var(--border)', boxShadow: 'var(--shadow-lg)', height: 500 }}>
          {MapComponents ? (
            <MapComponents.MapContainer center={[-28, 134]} zoom={4} style={{ height: '100%', width: '100%' }} zoomControl>
              <MapComponents.TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />
              {cities.map(city => (
                <MapComponents.CircleMarker
                  key={city.city}
                  center={city.coords}
                  radius={Math.min(8 + city.concerts.length * 3, 26)}
                  pathOptions={{
                    color: selectedCity === city.city ? '#f472b6' : '#7c3aed',
                    fillColor: selectedCity === city.city ? '#f472b6' : '#a78bfa',
                    fillOpacity: 0.75, weight: 2,
                  }}
                  eventHandlers={{ click: () => setSelectedCity(city.city === selectedCity ? null : city.city) }}
                >
                  <MapComponents.Popup>
                    <div style={{ minWidth: 160 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: '#7c3aed' }}>{city.city}</div>
                      {city.concerts.slice(0, 4).map((c, i) => (
                        <div key={i} style={{ fontSize: 12, marginBottom: 5, paddingBottom: 5, borderBottom: '1px solid #f3f4f6' }}>
                          <div style={{ fontWeight: 600 }}>{c.artist_name}</div>
                          <div style={{ color: '#6b7280', fontSize: 11 }}>{c.event_date ? new Date(c.event_date).toLocaleDateString('en-AU') : 'Date TBC'}</div>
                        </div>
                      ))}
                      {city.concerts.length > 4 && <div style={{ fontSize: 11, color: '#9ca3af' }}>+{city.concerts.length - 4} more</div>}
                    </div>
                  </MapComponents.Popup>
                </MapComponents.CircleMarker>
              ))}
            </MapComponents.MapContainer>
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface2)', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 48 }}>🗺️</div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>Map loading...</div>
            </div>
          )}
        </div>

        {/* City list */}
        <div>
          <div className="section-label">Cities</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 500, overflowY: 'auto' }}>
            {cities.length === 0 ? (
              <div style={{ color: 'var(--muted)', fontSize: 13 }}>No mapped concerts yet.</div>
            ) : cities.map(city => (
              <div key={city.city} onClick={() => setSelectedCity(city.city === selectedCity ? null : city.city)}
                className="card card-hover"
                style={{ padding: '12px 14px', cursor: 'pointer', border: `1.5px solid ${selectedCity === city.city ? 'var(--accent)' : 'var(--border)'}`, boxShadow: selectedCity === city.city ? 'var(--shadow-lg)' : 'var(--shadow)' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: selectedCity === city.city ? 'var(--accent)' : 'var(--text)' }}>
                    📍 {city.city}
                  </div>
                  <span style={{ background: 'var(--surface3)', color: 'var(--accent)', padding: '2px 8px', borderRadius: 50, fontSize: 11, fontWeight: 700 }}>
                    {city.concerts.length}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                  {city.concerts.slice(0, 2).map(c => c.artist_name).join(', ')}
                  {city.concerts.length > 2 ? ` +${city.concerts.length - 2} more` : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Selected city concerts */}
      {selectedCity && cityGroups[selectedCity] && (
        <div style={{ marginTop: 24 }}>
          <div className="section-label">📍 {selectedCity} · {cityGroups[selectedCity].concerts.length} shows</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {cityGroups[selectedCity].concerts.map(c => (
              <div key={c.id} className="card" style={{ padding: '1rem', display: 'flex', gap: 14, alignItems: 'center' }}>
                <div style={{ fontWeight: 700, fontSize: 14, flex: 1 }}>{c.artist_name}</div>
                <div style={{ fontSize: 12, color: 'var(--text2)' }}>{c.event_date ? new Date(c.event_date).toLocaleDateString('en-AU') : 'TBC'}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{c.venue || '—'}</div>
                {c.source_url && (
                  <a href={c.source_url} target="_blank" rel="noopener noreferrer" className="pill-btn pill-btn-purple" style={{ padding: '5px 12px', fontSize: 11, textDecoration: 'none' }}>
                    🎟️ Tickets ↗
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

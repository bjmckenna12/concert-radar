import { useEffect, useState } from 'react';
import api from '../utils/api';

const CITY_COORDS = {
  'Hobart': [-42.8821, 147.3272], 'Melbourne': [-37.8136, 144.9631],
  'Sydney': [-33.8688, 151.2093], 'Brisbane': [-27.4698, 153.0251],
  'Perth': [-31.9505, 115.8605], 'Adelaide': [-34.9285, 138.6007],
  'Canberra': [-35.2809, 149.1300], 'Darwin': [-12.4634, 130.8456],
  'Boston': [42.3601, -71.0589], 'New York': [40.7128, -74.0060],
  'Los Angeles': [34.0522, -118.2437], 'London': [51.5074, -0.1278],
  'Paris': [48.8566, 2.3522], 'Tokyo': [35.6762, 139.6503],
};

function getCoords(city, country) {
  if (!city) return null;
  for (const [name, coords] of Object.entries(CITY_COORDS)) {
    if (city.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(city.toLowerCase())) {
      return coords;
    }
  }
  return null;
}

export default function MapView() {
  const [concerts, setConcerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [MapComponents, setMapComponents] = useState(null);
  const [selectedCity, setSelectedCity] = useState(null);

  useEffect(() => {
    api.listConcerts(100).then(d => setConcerts(d?.concerts || [])).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    import('react-leaflet').then(rl => {
      setMapComponents({ MapContainer: rl.MapContainer, TileLayer: rl.TileLayer, Marker: rl.Marker, Popup: rl.Popup, CircleMarker: rl.CircleMarker });
    }).catch(() => setMapComponents(null));
  }, []);

  // Group concerts by city
  const cityGroups = {};
  concerts.forEach(c => {
    const coords = getCoords(c.city, c.country);
    if (!coords) return;
    const key = c.city || 'Unknown';
    if (!cityGroups[key]) cityGroups[key] = { coords, concerts: [], city: c.city, country: c.country };
    cityGroups[key].concerts.push(c);
  });

  const cities = Object.values(cityGroups);

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '4rem', fontFamily: "'Orbitron', monospace", fontSize: 12, color: 'var(--accent)', letterSpacing: '0.2em' }}>
      LOADING MAP...
    </div>
  );

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "'Orbitron', monospace", fontSize: '1.5rem', fontWeight: 900, letterSpacing: '0.08em', marginBottom: 6 }}>
          CONCERT MAP
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 13 }}>
          {cities.length} cities with upcoming shows from your artists
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'start' }}>
        {/* Map */}
        <div style={{
          height: 500, border: '1px solid var(--accent)', position: 'relative',
          clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))',
          overflow: 'hidden', boxShadow: '0 0 30px rgba(0,255,159,0.1)'
        }}>
          {MapComponents ? (
            <MapComponents.MapContainer
              center={[-30, 140]} zoom={4}
              style={{ height: '100%', width: '100%', background: '#0d0d14' }}
              zoomControl={true}
            >
              <MapComponents.TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap'
              />
              {cities.map(city => (
                <MapComponents.CircleMarker
                  key={city.city}
                  center={city.coords}
                  radius={Math.min(8 + city.concerts.length * 3, 24)}
                  pathOptions={{
                    color: selectedCity === city.city ? '#ff2d78' : '#00ff9f',
                    fillColor: selectedCity === city.city ? '#ff2d78' : '#00ff9f',
                    fillOpacity: 0.7,
                    weight: 2,
                  }}
                  eventHandlers={{ click: () => setSelectedCity(city.city === selectedCity ? null : city.city) }}
                >
                  <MapComponents.Popup>
                    <div style={{ minWidth: 160 }}>
                      <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 11, fontWeight: 700, marginBottom: 8, color: '#00ff9f' }}>
                        {city.city?.toUpperCase()}
                      </div>
                      {city.concerts.slice(0, 4).map((c, i) => (
                        <div key={i} style={{ fontSize: 12, marginBottom: 4, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 4 }}>
                          <div style={{ fontWeight: 600 }}>{c.artist_name}</div>
                          <div style={{ color: '#888', fontSize: 11 }}>{c.event_date ? new Date(c.event_date).toLocaleDateString('en-AU') : 'Date TBC'}</div>
                        </div>
                      ))}
                      {city.concerts.length > 4 && (
                        <div style={{ fontSize: 11, color: '#888' }}>+{city.concerts.length - 4} more</div>
                      )}
                    </div>
                  </MapComponents.Popup>
                </MapComponents.CircleMarker>
              ))}
            </MapComponents.MapContainer>
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: 'var(--muted)' }}>
              <div style={{ fontFamily: "'VT323', monospace", fontSize: 40, color: 'var(--muted2)' }}>◎</div>
              <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 11 }}>MAP UNAVAILABLE</div>
              <div style={{ fontSize: 12 }}>Install react-leaflet to enable map view</div>
            </div>
          )}
          {/* Corner decoration */}
          <div style={{ position: 'absolute', top: 8, right: 8, fontFamily: "'Orbitron', monospace", fontSize: 9, color: 'var(--accent)', letterSpacing: '0.1em', zIndex: 1000, pointerEvents: 'none', background: 'rgba(5,5,8,0.7)', padding: '3px 6px' }}>
            LIVE RADAR
          </div>
        </div>

        {/* City list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 500, overflowY: 'auto' }}>
          <div className="section-label">Cities</div>
          {cities.length === 0 ? (
            <div style={{ color: 'var(--muted)', fontSize: 13 }}>No mapped concerts yet. Run a scan first.</div>
          ) : cities.sort((a, b) => b.concerts.length - a.concerts.length).map(city => (
            <div
              key={city.city}
              onClick={() => setSelectedCity(city.city === selectedCity ? null : city.city)}
              className="y2k-card"
              style={{
                padding: '12px 14px', cursor: 'pointer',
                borderColor: selectedCity === city.city ? 'var(--accent)' : 'var(--border2)',
                boxShadow: selectedCity === city.city ? 'var(--glow-green)' : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 11, fontWeight: 700, color: selectedCity === city.city ? 'var(--accent)' : 'var(--text)' }}>
                  {city.city?.toUpperCase()}
                </div>
                <span className="tag tag-green" style={{ fontSize: 9 }}>{city.concerts.length}</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                {city.concerts.slice(0, 2).map(c => c.artist_name).join(', ')}
                {city.concerts.length > 2 ? ` +${city.concerts.length - 2} more` : ''}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Selected city concerts */}
      {selectedCity && (() => {
        const group = cityGroups[selectedCity];
        if (!group) return null;
        return (
          <div style={{ marginTop: 24 }}>
            <div className="section-label">{selectedCity.toUpperCase()} · {group.concerts.length} shows</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {group.concerts.map(c => (
                <div key={c.id} className="y2k-card" style={{ padding: '1rem', display: 'flex', gap: 14, alignItems: 'center' }}>
                  <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 13, fontWeight: 700, flex: 1 }}>{c.artist_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{c.event_date ? new Date(c.event_date).toLocaleDateString('en-AU') : 'TBC'}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{c.venue || '—'}</div>
                  {c.source_url && (
                    <a href={c.source_url} target="_blank" rel="noopener noreferrer" className="y2k-btn y2k-btn-green" style={{ padding: '5px 12px', fontSize: 10, textDecoration: 'none' }}>Tickets ↗</a>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../hooks/useAuth';

export default function Friends() {
  const { user } = useAuth();
  const [friends, setFriends] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [friendConcerts, setFriendConcerts] = useState([]);
  const [friendArtists, setFriendArtists] = useState([]);
  const [addInput, setAddInput] = useState('');
  const [adding, setAdding] = useState(false);
  const [addMsg, setAddMsg] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getFriends().then(d => setFriends(d?.friends || [])).finally(() => setLoading(false));
  }, []);

  const handleAdd = async () => {
    if (!addInput.trim()) return;
    setAdding(true); setAddMsg('');
    try {
      const res = await api.addFriend(addInput.trim());
      setAddMsg('✓ ' + res.message);
      const d = await api.getFriends();
      setFriends(d?.friends || []);
      setAddInput('');
    } catch (e) {
      setAddMsg('✗ ' + e.message);
    } finally {
      setAdding(false);
    }
  };

  const handleSelectFriend = async (friend) => {
    if (selectedFriend?.id === friend.id) { setSelectedFriend(null); return; }
    setSelectedFriend(friend);
    const [concerts, artists] = await Promise.all([
      api.getFriendConcerts(friend.id).then(d => d?.concerts || []).catch(() => []),
      api.getFriendArtists(friend.id).then(d => d?.artists || []).catch(() => []),
    ]);
    setFriendConcerts(concerts);
    setFriendArtists(artists);
  };

  const shareLink = `${window.location.origin}`;
  const mySpotifyId = user?.spotify_id;

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "'Orbitron', monospace", fontSize: '1.5rem', fontWeight: 900, letterSpacing: '0.08em', marginBottom: 6 }}>FRIENDS 👥</h1>
        <p style={{ color: 'var(--text2)', fontSize: 13 }}>See what concerts your friends are tracking.</p>
      </div>

      {/* My profile share */}
      <div style={{ background: 'linear-gradient(135deg, #ede9fe, #fce7f3)', borderRadius: 20, padding: '1.25rem', marginBottom: 24, border: '1.5px solid var(--border)' }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Your Spotify ID (share this with friends to add you)</div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: 'white', borderRadius: 12, padding: '10px 14px', border: '1px solid var(--border)' }}>
          <span style={{ flex: 1, fontSize: 13, fontFamily: "'Orbitron', monospace", color: 'var(--accent)', letterSpacing: '0.04em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {mySpotifyId || 'Loading...'}
          </span>
          <button onClick={() => navigator.clipboard.writeText(mySpotifyId || '')} className="pill-btn pill-btn-purple" style={{ padding: '6px 14px', fontSize: 11 }}>
            Copy
          </button>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 8 }}>
          Friends enter your Spotify ID to add you. Share the app link too: <strong>{shareLink}</strong>
        </div>
      </div>

      {/* Add friend */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: 24 }}>
        <div className="section-label">Add a friend</div>
        <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 12 }}>Enter your friend's Spotify ID (they need to have signed up for Concert Radar first)</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text" placeholder="spotify_user_id"
            value={addInput} onChange={e => setAddInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            className="input-field" style={{ flex: 1 }}
          />
          <button onClick={handleAdd} disabled={adding} className="pill-btn pill-btn-purple" style={{ whiteSpace: 'nowrap' }}>
            {adding ? '...' : '+ Add'}
          </button>
        </div>
        {addMsg && (
          <div style={{ marginTop: 10, fontSize: 13, color: addMsg.startsWith('✓') ? 'var(--mint)' : 'var(--coral)', fontWeight: 600 }}>
            {addMsg}
          </div>
        )}
      </div>

      {/* Friends list */}
      <div className="section-label">Your friends</div>

      {loading ? (
        <div style={{ color: 'var(--muted)', fontSize: 14, padding: '2rem 0' }}>Loading...</div>
      ) : friends.length === 0 ? (
        <div className="card" style={{ padding: '2.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>👥</div>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>No friends yet</div>
          <div style={{ fontSize: 13, color: 'var(--text2)' }}>Share your Spotify ID above and ask your friends to add you!</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: selectedFriend ? '1fr 360px' : 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {friends.map(f => {
              const isSelected = selectedFriend?.id === f.id;
              const hue = (f.display_name?.charCodeAt(0) || 0) * 47 % 360;
              return (
                <div key={f.id} onClick={() => handleSelectFriend(f)} style={{
                  background: isSelected ? 'linear-gradient(135deg, var(--surface3), var(--pink-light))' : 'white',
                  border: `1.5px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 16, padding: '14px 16px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 14,
                  boxShadow: isSelected ? 'var(--shadow-lg)' : 'var(--shadow)',
                  transition: 'all 0.2s',
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                    background: `hsl(${hue}, 65%, 85%)`, border: `2px solid hsl(${hue}, 65%, 65%)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: 16, color: `hsl(${hue}, 65%, 35%)`,
                  }}>
                    {(f.display_name || '?')[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{f.display_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>@{f.spotify_id}</div>
                  </div>
                  <div style={{ fontSize: 18, color: isSelected ? 'var(--accent)' : 'var(--muted2)' }}>
                    {isSelected ? '✓' : '→'}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Friend detail panel */}
          {selectedFriend && (
            <div style={{ animation: 'fadeIn 0.3s ease' }}>
              <div className="card" style={{ padding: '1.25rem', marginBottom: 12 }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{selectedFriend.display_name}'s profile</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>@{selectedFriend.spotify_id}</div>

                {friendArtists.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 8 }}>Top artists</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {friendArtists.slice(0, 8).map(a => (
                        <span key={a.spotify_artist_id} style={{ background: 'var(--surface3)', color: 'var(--accent)', padding: '3px 10px', borderRadius: 50, fontSize: 12, fontWeight: 600 }}>
                          {a.artist_name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="section-label">{selectedFriend.display_name}'s concerts</div>
              {friendConcerts.length === 0 ? (
                <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>No concerts detected for this friend yet.</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {friendConcerts.slice(0, 6).map(c => (
                    <div key={c.id} className="card" style={{ padding: '12px 14px' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 3 }}>{c.artist_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}>
                        {[c.city, c.country].filter(Boolean).join(', ')} · {c.event_date ? new Date(c.event_date).toLocaleDateString('en-AU') : 'TBC'}
                      </div>
                      {c.source_url && (
                        <a href={c.source_url} target="_blank" rel="noopener noreferrer" className="pill-btn pill-btn-purple" style={{ padding: '5px 12px', fontSize: 11, textDecoration: 'none', display: 'inline-flex' }}>
                          Tickets ↗
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

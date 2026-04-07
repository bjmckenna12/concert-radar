import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const navLinkStyle = (isActive) => ({
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '6px 14px',
  fontSize: 11,
  fontFamily: "'Orbitron', monospace",
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: isActive ? '#050508' : 'var(--muted)',
  background: isActive ? 'var(--accent)' : 'transparent',
  border: `1px solid ${isActive ? 'var(--accent)' : 'var(--border2)'}`,
  textDecoration: 'none',
  transition: 'all 0.15s',
  clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
});

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav style={{
        background: 'rgba(13,13,20,0.97)',
        borderBottom: '1px solid var(--accent)',
        boxShadow: '0 0 30px rgba(0,255,159,0.1)',
        padding: '0 1.5rem',
        display: 'flex', alignItems: 'center', gap: 8,
        height: 60, position: 'sticky', top: 0, zIndex: 100,
        backdropFilter: 'blur(10px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 20 }}>
          <div style={{
            width: 10, height: 10, background: 'var(--accent)',
            clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
            animation: 'spinDiamond 3s linear infinite',
            boxShadow: 'var(--glow-green)'
          }} />
          <span style={{
            fontFamily: "'Orbitron', monospace", fontSize: 12,
            fontWeight: 900, letterSpacing: '0.15em',
            color: 'var(--accent)', textTransform: 'uppercase',
            textShadow: '0 0 10px rgba(0,255,159,0.5)'
          }}>Concert Radar</span>
        </div>

        <NavLink to="/dashboard" style={({ isActive }) => navLinkStyle(isActive)}>Dashboard</NavLink>
        <NavLink to="/concerts" style={({ isActive }) => navLinkStyle(isActive)}>Concerts</NavLink>
        <NavLink to="/map" style={({ isActive }) => navLinkStyle(isActive)}>Map</NavLink>
        <NavLink to="/artists" style={({ isActive }) => navLinkStyle(isActive)}>Artists</NavLink>
        <NavLink to="/settings" style={({ isActive }) => navLinkStyle(isActive)}>Settings</NavLink>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: "'Orbitron', monospace", letterSpacing: '0.05em' }}>
            {user?.display_name?.toUpperCase()}
          </span>
          <button onClick={handleLogout} style={{
            background: 'transparent', border: '1px solid var(--accent2)',
            color: 'var(--accent2)', padding: '5px 12px',
            fontSize: 10, fontFamily: "'Orbitron', monospace",
            letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
            clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))',
          }}>Logout</button>
        </div>
      </nav>

      <style>{`
        @keyframes spinDiamond { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.8)} }
        @keyframes scanline { 0%{top:-10%} 100%{top:110%} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes glowPulse { 0%,100%{box-shadow:0 0 10px rgba(0,255,159,0.3)} 50%{box-shadow:0 0 25px rgba(0,255,159,0.6)} }

        .y2k-btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          padding: 10px 20px; font-family: 'Orbitron', monospace;
          font-size: 11px; font-weight: 700; letter-spacing: 0.1em;
          text-transform: uppercase; cursor: pointer; border: none;
          transition: all 0.2s;
        }
        .y2k-btn-green {
          background: var(--accent); color: #050508;
          clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px));
          box-shadow: 0 0 15px rgba(0,255,159,0.4);
        }
        .y2k-btn-green:hover { box-shadow: 0 0 30px rgba(0,255,159,0.7); transform: translateY(-1px); }
        .y2k-btn-green:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
        .y2k-btn-pink {
          background: var(--accent2); color: #fff;
          clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px));
          box-shadow: 0 0 15px rgba(255,45,120,0.4);
        }
        .y2k-btn-pink:hover { box-shadow: 0 0 30px rgba(255,45,120,0.7); transform: translateY(-1px); }
        .y2k-btn-outline {
          background: transparent; color: var(--accent);
          border: 1px solid var(--accent) !important;
          clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px));
        }
        .y2k-btn-outline:hover { background: rgba(0,255,159,0.08); }
        .y2k-btn-outline:disabled { opacity: 0.4; cursor: not-allowed; }

        .y2k-card {
          background: var(--surface);
          border: 1px solid var(--border2);
          clip-path: polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 14px 100%, 0 calc(100% - 14px));
          position: relative; transition: border-color 0.2s, box-shadow 0.2s;
        }
        .y2k-card:hover { border-color: rgba(0,255,159,0.4); box-shadow: 0 0 20px rgba(0,255,159,0.08); }

        .section-label {
          font-family: 'Orbitron', monospace; font-size: 10px;
          letter-spacing: 0.2em; text-transform: uppercase;
          color: var(--accent); display: flex; align-items: center; gap: 10px;
          margin-bottom: 14px;
        }
        .section-label::after { content: ''; flex: 1; height: 1px; background: linear-gradient(90deg, rgba(0,255,159,0.5), transparent); }

        .tag { display: inline-flex; align-items: center; gap: 4px; font-size: 10px;
          padding: 3px 8px; font-family: 'Orbitron', monospace; letter-spacing: 0.06em; text-transform: uppercase; }
        .tag-green { background: rgba(0,255,159,0.08); color: var(--accent); border: 1px solid rgba(0,255,159,0.25); }
        .tag-pink { background: rgba(255,45,120,0.08); color: var(--accent2); border: 1px solid rgba(255,45,120,0.25); }
        .tag-blue { background: rgba(0,212,255,0.08); color: var(--accent4); border: 1px solid rgba(0,212,255,0.25); }
        .tag-purple { background: rgba(123,47,255,0.08); color: #a06fff; border: 1px solid rgba(123,47,255,0.25); }
        .tag-gray { background: rgba(122,122,154,0.08); color: var(--muted); border: 1px solid var(--border2); }

        .y2k-input {
          background: var(--surface2); border: 1px solid var(--border2);
          color: var(--text); padding: 10px 14px; font-size: 13px;
          font-family: 'Space Grotesk', sans-serif; width: 100%;
          clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px));
          transition: border-color 0.2s;
        }
        .y2k-input:focus { border-color: var(--accent); box-shadow: 0 0 10px rgba(0,255,159,0.2); outline: none; }
        .y2k-select {
          background: var(--surface2); border: 1px solid var(--border2);
          color: var(--text); padding: 10px 14px; font-size: 13px;
          font-family: 'Space Grotesk', sans-serif; width: 100%;
          clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px));
        }
        .y2k-select:focus { border-color: var(--accent); outline: none; }
        .y2k-select option { background: #14141f; }

        .concert-card-hover:hover { border-color: var(--accent) !important; box-shadow: 0 0 20px rgba(0,255,159,0.1) !important; }
      `}</style>

      <main style={{ flex: 1, padding: '2rem 1.5rem', maxWidth: 960, margin: '0 auto', width: '100%' }}>
        {children}
      </main>
    </div>
  );
}

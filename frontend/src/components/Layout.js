import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const navLinkStyle = (isActive) => ({
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '7px 16px', fontSize: 13, fontWeight: 600,
  color: isActive ? '#fff' : 'var(--text2)',
  background: isActive ? 'var(--accent)' : 'transparent',
  borderRadius: 50, textDecoration: 'none', transition: 'all 0.2s',
  boxShadow: isActive ? '0 4px 12px rgba(124,58,237,0.3)' : 'none',
});

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav style={{
        background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)', padding: '0 1.5rem',
        display: 'flex', alignItems: 'center', gap: 6,
        height: 64, position: 'sticky', top: 0, zIndex: 100,
        boxShadow: '0 2px 20px rgba(124,58,237,0.06)',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 20 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: 'linear-gradient(135deg, var(--accent), var(--pink))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, boxShadow: '0 4px 12px rgba(124,58,237,0.3)',
          }}>🎸</div>
          <span style={{ fontFamily: "'Orbitron', monospace", fontSize: 13, fontWeight: 900, color: 'var(--accent)', letterSpacing: '0.08em' }}>
            CONCERT RADAR
          </span>
        </div>

        <NavLink to="/dashboard" style={({ isActive }) => navLinkStyle(isActive)}>Dashboard</NavLink>
        <NavLink to="/concerts" style={({ isActive }) => navLinkStyle(isActive)}>Concerts</NavLink>
        <NavLink to="/map" style={({ isActive }) => navLinkStyle(isActive)}>Map</NavLink>
        <NavLink to="/artists" style={({ isActive }) => navLinkStyle(isActive)}>Artists</NavLink>
        <NavLink to="/activity" style={({ isActive }) => navLinkStyle(isActive)}>Activity</NavLink>
        <NavLink to="/stats" style={({ isActive }) => navLinkStyle(isActive)}>My Stats</NavLink>
        <NavLink to="/friends" style={({ isActive }) => navLinkStyle(isActive)}>Friends</NavLink>
        <NavLink to="/activity" style={({ isActive }) => navLinkStyle(isActive)}>Activity</NavLink>
        <NavLink to="/settings" style={({ isActive }) => navLinkStyle(isActive)}>Settings</NavLink>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'var(--surface2)', borderRadius: 50,
            padding: '6px 14px', border: '1px solid var(--border)',
          }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), var(--pink))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff', fontWeight: 700 }}>
              {(user?.display_name || '?')[0].toUpperCase()}
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)' }}>{user?.display_name}</span>
          </div>
          <button onClick={() => { logout(); navigate('/'); }} style={{
            background: 'transparent', border: '1px solid var(--border2)',
            color: 'var(--muted)', padding: '6px 14px', borderRadius: 50,
            fontSize: 12, fontWeight: 600,
          }}>Logout</button>
        </div>
      </nav>

      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.6;transform:scale(0.85)} }
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }

        .pill-btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          padding: 10px 22px; border-radius: 50px; font-weight: 700; font-size: 13px;
          cursor: pointer; border: none; transition: all 0.2s; font-family: 'Space Grotesk', sans-serif;
        }
        .pill-btn-purple { background: var(--accent); color: #fff; box-shadow: 0 4px 14px rgba(124,58,237,0.35); }
        .pill-btn-purple:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(124,58,237,0.45); }
        .pill-btn-purple:disabled { opacity: 0.5; transform: none; cursor: not-allowed; }
        .pill-btn-pink { background: var(--pink); color: #fff; box-shadow: 0 4px 14px rgba(244,114,182,0.35); }
        .pill-btn-pink:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(244,114,182,0.45); }
        .pill-btn-outline { background: white; color: var(--accent); border: 2px solid var(--accent) !important; }
        .pill-btn-outline:hover { background: var(--surface3); transform: translateY(-1px); }
        .pill-btn-outline:disabled { opacity: 0.5; transform: none; cursor: not-allowed; }
        .pill-btn-yellow { background: var(--yellow); color: #1e1b4b; box-shadow: 0 4px 14px rgba(251,191,36,0.35); }
        .pill-btn-yellow:hover { transform: translateY(-2px); }

        .card {
          background: white; border-radius: var(--radius-lg); border: 1px solid var(--border);
          box-shadow: var(--shadow); transition: box-shadow 0.2s, transform 0.2s;
        }
        .card:hover { box-shadow: var(--shadow-lg); }
        .card-hover:hover { transform: translateY(-2px); }

        .section-label {
          font-family: 'Orbitron', monospace; font-size: 10px; letter-spacing: 0.18em;
          text-transform: uppercase; color: var(--accent); display: flex; align-items: center; gap: 10px; margin-bottom: 14px;
        }
        .section-label::after { content: ''; flex: 1; height: 2px; background: linear-gradient(90deg, rgba(124,58,237,0.3), transparent); border-radius: 1px; }

        .type-badge {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 4px 10px; border-radius: 50px; font-size: 11px; font-weight: 700;
        }
        .badge-presale { background: #fef3c7; color: #92400e; border: 1.5px solid #fbbf24; }
        .badge-ticket { background: #d1fae5; color: #065f46; border: 1.5px solid #34d399; }
        .badge-announce { background: #dbeafe; color: #1e40af; border: 1.5px solid #60a5fa; }
        .badge-unknown { background: #f3f4f6; color: #6b7280; border: 1.5px solid #d1d5db; }
        .badge-new { background: #fce7f3; color: #9d174d; border: 1.5px solid #f472b6; }
        .badge-source { background: var(--surface2); color: var(--text2); border: 1px solid var(--border2); }

        .sticker {
          display: inline-flex; align-items: center; justify-content: center;
          padding: 6px 14px; border-radius: 50px; font-size: 12px; font-weight: 700;
          border: 2px solid; transition: transform 0.2s;
        }
        .sticker:hover { transform: rotate(-2deg) scale(1.05); }

        .input-field {
          background: var(--surface2); border: 1.5px solid var(--border2);
          border-radius: var(--radius); color: var(--text); padding: 11px 16px;
          font-size: 13px; font-family: 'Space Grotesk', sans-serif; width: 100%;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .input-field:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(124,58,237,0.12); outline: none; }

        .select-field {
          background: var(--surface2); border: 1.5px solid var(--border2);
          border-radius: var(--radius); color: var(--text); padding: 11px 16px;
          font-size: 13px; font-family: 'Space Grotesk', sans-serif; width: 100%;
          appearance: none;
        }
        .select-field:focus { border-color: var(--accent); outline: none; }
        .select-field option { background: white; }

        .concert-card {
          background: white; border-radius: var(--radius-lg); border: 1.5px solid var(--border);
          padding: 1.25rem; display: flex; gap: 16px; align-items: flex-start;
          transition: all 0.2s; box-shadow: 0 2px 12px rgba(124,58,237,0.05);
        }
        .concert-card:hover { border-color: var(--accent-light); box-shadow: var(--shadow-lg); transform: translateY(-1px); }

        .stat-card {
          background: white; border-radius: var(--radius-lg); padding: 1.25rem;
          border: 1.5px solid var(--border); box-shadow: var(--shadow);
        }
        .toggle-track {
          width: 44px; height: 24px; border-radius: 12px; cursor: pointer;
          position: relative; transition: background 0.2s; flex-shrink: 0;
        }
        .toggle-thumb {
          position: absolute; width: 18px; height: 18px; background: white;
          border-radius: 50%; top: 3px; transition: left 0.2s;
          box-shadow: 0 1px 4px rgba(0,0,0,0.2);
        }
      `}</style>

      <main style={{ flex: 1, padding: '2rem 1.5rem', maxWidth: 980, margin: '0 auto', width: '100%' }}>
        {children}
      </main>
    </div>
  );
}

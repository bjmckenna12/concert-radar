import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const navStyle = (isActive) => ({
  display: 'flex', alignItems: 'center', gap: 8,
  padding: '8px 14px', borderRadius: 8, fontSize: 14, fontWeight: 600,
  color: isActive ? 'var(--text)' : 'var(--muted)',
  background: isActive ? 'var(--surface2)' : 'transparent',
  textDecoration: 'none', transition: 'all 0.15s',
});

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav style={{
        background: 'var(--surface)', borderBottom: '1px solid var(--border)',
        padding: '0 1.5rem', display: 'flex', alignItems: 'center',
        gap: 4, height: 56, position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 24 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)',
            animation: 'pulse 2s infinite'
          }} />
          <span style={{
            fontFamily: "'DM Mono', monospace", fontSize: 12,
            letterSpacing: '0.12em', color: 'var(--accent)', textTransform: 'uppercase'
          }}>Concert Radar</span>
        </div>

        <NavLink to="/dashboard" style={({ isActive }) => navStyle(isActive)}>Dashboard</NavLink>
        <NavLink to="/concerts" style={({ isActive }) => navStyle(isActive)}>Concerts</NavLink>
        <NavLink to="/settings" style={({ isActive }) => navStyle(isActive)}>Settings</NavLink>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>
            {user?.display_name}
          </span>
          <button onClick={handleLogout} style={{
            background: 'transparent', border: '1px solid var(--border2)',
            color: 'var(--muted)', padding: '6px 14px', borderRadius: 6,
            fontSize: 13, fontFamily: "'Syne', sans-serif",
          }}>
            Log out
          </button>
        </div>
      </nav>

      <main style={{ flex: 1, padding: '2rem 1.5rem', maxWidth: 900, margin: '0 auto', width: '100%' }}>
        {children}
      </main>
    </div>
  );
}

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Concerts from './pages/Concerts';
import Settings from './pages/Settings';
import MapView from './pages/MapView';
import Artists from './pages/Artists';
import Layout from './components/Layout';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/" replace />;
  return children;
}

function LoadingScreen() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 40, height: 40, margin: '0 auto',
          background: 'var(--accent)',
          clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
          animation: 'spinDiamond 1s linear infinite',
          boxShadow: '0 0 20px rgba(0,255,159,0.5)'
        }} />
        <p style={{ marginTop: 20, fontFamily: "'Orbitron', monospace", fontSize: 11, color: 'var(--accent)', letterSpacing: '0.2em' }}>
          LOADING...
        </p>
        <style>{`@keyframes spinDiamond { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/dashboard" element={<PrivateRoute><Layout><Dashboard /></Layout></PrivateRoute>} />
          <Route path="/concerts" element={<PrivateRoute><Layout><Concerts /></Layout></PrivateRoute>} />
          <Route path="/map" element={<PrivateRoute><Layout><MapView /></Layout></PrivateRoute>} />
          <Route path="/artists" element={<PrivateRoute><Layout><Artists /></Layout></PrivateRoute>} />
          <Route path="/settings" element={<PrivateRoute><Layout><Settings /></Layout></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

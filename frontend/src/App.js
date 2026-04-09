import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { DataProvider } from './hooks/useData';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Concerts from './pages/Concerts';
import Settings from './pages/Settings';
import MapView from './pages/MapView';
import Artists from './pages/Artists';
import Stats from './pages/Stats';
import Friends from './pages/Friends';
import Activity from './pages/Activity';
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
        <div style={{ fontSize: 48, animation: 'float 2s ease-in-out infinite', marginBottom: 16 }}>🎸</div>
        <p style={{ fontFamily: "'Orbitron', monospace", fontSize: 11, color: 'var(--accent)', letterSpacing: '0.2em' }}>LOADING...</p>
        <style>{`@keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }`}</style>
      </div>
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/dashboard" element={<PrivateRoute><Layout><Dashboard /></Layout></PrivateRoute>} />
      <Route path="/concerts" element={<PrivateRoute><Layout><Concerts /></Layout></PrivateRoute>} />
      <Route path="/map" element={<PrivateRoute><Layout><MapView /></Layout></PrivateRoute>} />
      <Route path="/artists" element={<PrivateRoute><Layout><Artists /></Layout></PrivateRoute>} />
      <Route path="/stats" element={<PrivateRoute><Layout><Stats /></Layout></PrivateRoute>} />
      <Route path="/friends" element={<PrivateRoute><Layout><Friends /></Layout></PrivateRoute>} />
      <Route path="/settings" element={<PrivateRoute><Layout><Settings /></Layout></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <DataProvider>
          <AppRoutes />
        </DataProvider>
      </BrowserRouter>
    </AuthProvider>
  );
}

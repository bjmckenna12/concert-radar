import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../utils/api';

const features = [
  { emoji: '🎵', label: 'Spotify synced', color: '#7c3aed', bg: '#ede9fe' },
  { emoji: '📡', label: 'Early detection', color: '#0891b2', bg: '#cffafe' },
  { emoji: '🔔', label: 'Instant alerts', color: '#be185d', bg: '#fce7f3' },
  { emoji: '🗺️', label: 'Concert map', color: '#065f46', bg: '#d1fae5' },
  { emoji: '👥', label: 'Friends', color: '#92400e', bg: '#fef3c7' },
  { emoji: '📊', label: 'Your stats', color: '#1d4ed8', bg: '#dbeafe' },
];

export default function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { if (!loading && user) navigate('/dashboard'); }, [user, loading, navigate]);
  if (loading) return null;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @keyframes fadeInUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes float { 0%,100%{transform:translateY(0) rotate(-2deg)} 50%{transform:translateY(-10px) rotate(2deg)} }
        @keyframes floatB { 0%,100%{transform:translateY(0) rotate(3deg)} 50%{transform:translateY(-8px) rotate(-1deg)} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .sticker-float { animation: float 4s ease-in-out infinite; }
        .sticker-float-b { animation: floatB 5s ease-in-out infinite; }
      `}</style>

      {/* Floating sticker decorations */}
      <div className="sticker-float" style={{ position: 'fixed', top: '12%', left: '8%', fontSize: 48, opacity: 0.6, pointerEvents: 'none' }}>🎸</div>
      <div className="sticker-float-b" style={{ position: 'fixed', top: '20%', right: '10%', fontSize: 36, opacity: 0.5, pointerEvents: 'none' }}>🎟️</div>
      <div className="sticker-float" style={{ position: 'fixed', bottom: '20%', left: '6%', fontSize: 40, opacity: 0.5, pointerEvents: 'none', animationDelay: '1s' }}>🎤</div>
      <div className="sticker-float-b" style={{ position: 'fixed', bottom: '25%', right: '8%', fontSize: 32, opacity: 0.4, pointerEvents: 'none', animationDelay: '0.5s' }}>🔮</div>
      <div className="sticker-float" style={{ position: 'fixed', top: '50%', left: '3%', fontSize: 28, opacity: 0.4, pointerEvents: 'none', animationDelay: '2s' }}>⭐</div>

      {/* Blob backgrounds */}
      <div style={{ position: 'fixed', top: '-10%', right: '-5%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(244,114,182,0.15), transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '-5%', left: '-5%', width: 350, height: 350, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.12), transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', top: '40%', right: '15%', width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(52,211,153,0.12), transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ maxWidth: 680, width: '100%', position: 'relative', zIndex: 1 }}>
        {/* Logo pill */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32, animation: 'fadeInUp 0.5s ease' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: 'white', borderRadius: 50, padding: '8px 20px', border: '1.5px solid var(--border2)', boxShadow: 'var(--shadow)' }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, var(--accent), var(--pink))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🎸</div>
            <span style={{ fontFamily: "'Orbitron', monospace", fontSize: 12, fontWeight: 900, color: 'var(--accent)', letterSpacing: '0.1em' }}>CONCERT RADAR</span>
          </div>
        </div>

        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 44, animation: 'fadeInUp 0.5s ease 0.1s both' }}>
          <h1 style={{ fontFamily: "'Orbitron', monospace", fontWeight: 900, fontSize: 'clamp(1.8rem, 6vw, 3rem)', lineHeight: 1.15, marginBottom: 8, color: 'var(--text)', letterSpacing: '0.03em' }}>
            NEVER MISS A
          </h1>
          <h1 style={{ fontFamily: "'Orbitron', monospace", fontWeight: 900, fontSize: 'clamp(1.8rem, 6vw, 3rem)', lineHeight: 1.15, marginBottom: 20, letterSpacing: '0.03em', background: 'linear-gradient(135deg, var(--accent), var(--pink))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            LIVE SHOW ✦
          </h1>
          <p style={{ fontSize: 16, color: 'var(--text2)', maxWidth: 460, margin: '0 auto', lineHeight: 1.7 }}>
            Monitors your Spotify artists across websites, news & social — alerts you before tickets hit Ticketmaster.
          </p>
        </div>

        {/* Feature stickers */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 44, animation: 'fadeInUp 0.5s ease 0.2s both' }}>
          {features.map((f, i) => (
            <div key={f.label} className="sticker" style={{ background: f.bg, color: f.color, borderColor: f.color + '40', animationDelay: `${i * 0.1}s` }}>
              {f.emoji} {f.label}
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ textAlign: 'center', animation: 'fadeInUp 0.5s ease 0.3s both' }}>
          <a href={api.getLoginUrl()} style={{
            display: 'inline-flex', alignItems: 'center', gap: 12,
            background: 'linear-gradient(135deg, var(--accent), #9333ea)',
            color: '#fff', padding: '16px 40px', borderRadius: 50,
            fontSize: 14, fontWeight: 700, textDecoration: 'none',
            boxShadow: '0 8px 30px rgba(124,58,237,0.4)', transition: 'all 0.2s',
            fontFamily: "'Space Grotesk', sans-serif",
          }}
            onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(124,58,237,0.5)'; }}
            onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(124,58,237,0.4)'; }}
          >
            <span style={{ fontSize: 20 }}>🎵</span>
            Connect with Spotify — it's free
          </a>
          <p style={{ marginTop: 14, fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>
            No credit card · Shareable with friends · Works anywhere
          </p>
        </div>

        {/* Share note */}
        <div style={{ marginTop: 40, background: 'white', borderRadius: 24, padding: '18px 22px', border: '1.5px solid var(--border)', boxShadow: 'var(--shadow)', display: 'flex', alignItems: 'center', gap: 14, animation: 'fadeInUp 0.5s ease 0.4s both' }}>
          <div style={{ fontSize: 32, animation: 'float 3s ease-in-out infinite' }}>👥</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 3 }}>Built to share with your crew</div>
            <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>Each friend connects their own Spotify. Everyone gets personalised alerts for their artists & location.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

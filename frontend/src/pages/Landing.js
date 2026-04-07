import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../utils/api';

const steps = [
  { num: '01', icon: '◈', title: 'Connect Spotify', desc: 'We read your followed artists — nothing else.', color: 'var(--accent)' },
  { num: '02', icon: '◎', title: 'We monitor sources', desc: 'Artist sites, Google News, social feeds — scanned every few hours.', color: 'var(--accent4)' },
  { num: '03', icon: '◆', title: 'Get alerted early', desc: 'Email before tickets even hit Ticketmaster.', color: 'var(--accent2)' },
];

export default function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [glitch, setGlitch] = useState(false);

  useEffect(() => { if (!loading && user) navigate('/dashboard'); }, [user, loading, navigate]);
  useEffect(() => {
    const t = setInterval(() => { setGlitch(true); setTimeout(() => setGlitch(false), 150); }, 4000);
    return () => clearInterval(t);
  }, []);

  if (loading) return null;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @keyframes spinDiamond { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes fadeInUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes glitch1 { 0%,100%{clip-path:inset(0 0 100% 0)} 20%{clip-path:inset(20% 0 60% 0)} 40%{clip-path:inset(60% 0 10% 0)} 60%{clip-path:inset(10% 0 80% 0)} 80%{clip-path:inset(80% 0 5% 0)} }
        .scanline { position:fixed; width:100%; height:2px; background:linear-gradient(90deg,transparent,rgba(0,255,159,0.15),transparent); animation:scanline 6s linear infinite; pointer-events:none; z-index:0; }
      `}</style>

      {/* Scanline effect */}
      <div className="scanline" />

      {/* Background orbs */}
      <div style={{ position: 'fixed', top: '20%', left: '10%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,255,159,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '20%', right: '10%', width: 250, height: 250, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,45,120,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ maxWidth: 700, width: '100%', position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center', marginBottom: 40, animation: 'fadeInUp 0.5s ease' }}>
          <div style={{ width: 14, height: 14, background: 'var(--accent)', clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)', animation: 'spinDiamond 3s linear infinite', boxShadow: '0 0 15px rgba(0,255,159,0.6)' }} />
          <span style={{ fontFamily: "'Orbitron', monospace", fontSize: 13, fontWeight: 900, letterSpacing: '0.2em', color: 'var(--accent)', textTransform: 'uppercase', textShadow: '0 0 20px rgba(0,255,159,0.4)' }}>Concert Radar</span>
          <div style={{ width: 14, height: 14, background: 'var(--accent)', clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)', animation: 'spinDiamond 3s linear infinite reverse', boxShadow: '0 0 15px rgba(0,255,159,0.6)' }} />
        </div>

        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 52, animation: 'fadeInUp 0.6s ease 0.1s both' }}>
          <h1 style={{
            fontFamily: "'Orbitron', monospace", fontWeight: 900,
            fontSize: 'clamp(1.8rem, 6vw, 3.2rem)', lineHeight: 1.15,
            marginBottom: 20, letterSpacing: '0.05em',
            color: glitch ? 'transparent' : 'var(--text)',
            textShadow: glitch ? 'none' : '0 0 30px rgba(255,255,255,0.1)',
            position: 'relative',
          }}>
            {glitch ? (
              <>
                <span style={{ position: 'absolute', inset: 0, color: 'var(--accent2)', transform: 'translateX(-3px)', opacity: 0.8 }}>NEVER MISS A SHOW</span>
                <span style={{ position: 'absolute', inset: 0, color: 'var(--accent4)', transform: 'translateX(3px)', opacity: 0.8 }}>NEVER MISS A SHOW</span>
              </>
            ) : null}
            NEVER MISS A SHOW
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 20 }}>
            <div style={{ height: 1, width: 40, background: 'linear-gradient(90deg, transparent, var(--accent))' }} />
            <span style={{ fontFamily: "'Orbitron', monospace", fontSize: 11, color: 'var(--accent)', letterSpacing: '0.15em' }}>FROM ARTISTS YOU LOVE</span>
            <div style={{ height: 1, width: 40, background: 'linear-gradient(90deg, var(--accent), transparent)' }} />
          </div>
          <p style={{ fontSize: 15, color: 'var(--muted)', maxWidth: 480, margin: '0 auto', lineHeight: 1.7 }}>
            Monitors your Spotify artists across websites, news & social feeds. Get alerted before tickets hit Ticketmaster.
          </p>
        </div>

        {/* Steps */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 2, marginBottom: 44, animation: 'fadeInUp 0.6s ease 0.2s both' }}>
          {steps.map(s => (
            <div key={s.num} style={{
              background: 'var(--surface)', border: '1px solid var(--border2)',
              padding: '1.5rem', position: 'relative', overflow: 'hidden',
              clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))',
            }}>
              <div style={{ fontFamily: "'VT323', monospace", fontSize: 36, color: s.color, lineHeight: 1, marginBottom: 10, textShadow: `0 0 10px ${s.color}` }}>{s.icon}</div>
              <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 9, color: 'var(--muted2)', letterSpacing: '0.15em', marginBottom: 8 }}>STEP {s.num}</div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text)' }}>{s.title}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>{s.desc}</div>
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${s.color}, transparent)`, opacity: 0.5 }} />
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ textAlign: 'center', animation: 'fadeInUp 0.6s ease 0.3s both' }}>
          <a href={api.getLoginUrl()} style={{
            display: 'inline-flex', alignItems: 'center', gap: 12,
            background: 'var(--accent)', color: '#050508',
            padding: '14px 36px', fontSize: 12, fontWeight: 700,
            fontFamily: "'Orbitron', monospace", letterSpacing: '0.12em',
            textTransform: 'uppercase', textDecoration: 'none',
            clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))',
            boxShadow: '0 0 30px rgba(0,255,159,0.4)', transition: 'all 0.2s',
          }}
            onMouseOver={e => { e.currentTarget.style.boxShadow = '0 0 50px rgba(0,255,159,0.7)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseOut={e => { e.currentTarget.style.boxShadow = '0 0 30px rgba(0,255,159,0.4)'; e.currentTarget.style.transform = 'none'; }}
          >
            <span style={{ fontSize: 16 }}>◈</span>
            Connect with Spotify
          </a>
          <p style={{ marginTop: 14, fontSize: 11, color: 'var(--muted2)', fontFamily: "'Orbitron', monospace", letterSpacing: '0.1em' }}>
            FREE · NO CREDIT CARD · SHAREABLE
          </p>
        </div>

        {/* Share callout */}
        <div style={{
          marginTop: 44, padding: '16px 20px',
          background: 'var(--surface)', border: '1px solid var(--border2)',
          clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))',
          display: 'flex', alignItems: 'center', gap: 14,
          animation: 'fadeInUp 0.6s ease 0.4s both'
        }}>
          <div style={{ fontFamily: "'VT323', monospace", fontSize: 28, color: 'var(--accent4)' }}>◎</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3, color: 'var(--text)' }}>Built to share</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Each friend connects their own Spotify. Everyone gets personalised alerts for their own artists & location.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

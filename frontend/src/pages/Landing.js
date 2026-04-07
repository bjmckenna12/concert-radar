import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../utils/api';

const steps = [
  { num: '01', icon: '🎵', title: 'Connect Spotify', desc: 'We read your followed artists — nothing else.' },
  { num: '02', icon: '📡', title: 'We monitor sources', desc: 'Artist sites, Google News, social feeds — checked every few hours.' },
  { num: '03', icon: '🔔', title: 'Get alerted early', desc: 'Email before tickets even hit Ticketmaster.' },
];

export default function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate('/dashboard');
  }, [user, loading, navigate]);

  if (loading) return null;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem' }}>
      <div style={{ maxWidth: 680, width: '100%', animation: 'fadeIn 0.5s ease' }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', marginBottom: 32 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', animation: 'pulse 2s infinite' }} />
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, letterSpacing: '0.15em', color: 'var(--accent)', textTransform: 'uppercase' }}>Concert Radar</span>
        </div>

        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 'clamp(2.2rem, 7vw, 3.8rem)', lineHeight: 1.1, marginBottom: 16 }}>
            Never miss a show<br />from <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>artists you love</em>
          </h1>
          <p style={{ fontSize: 16, color: 'var(--muted)', maxWidth: 460, margin: '0 auto', lineHeight: 1.7 }}>
            Monitors your Spotify artists across their websites, social feeds & news —
            alerts you before tickets hit Ticketmaster.
          </p>
        </div>

        {/* Steps */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 1, background: 'var(--border)', borderRadius: 16,
          overflow: 'hidden', marginBottom: 40
        }}>
          {steps.map(s => (
            <div key={s.num} style={{ background: 'var(--surface)', padding: '1.5rem' }}>
              <div style={{ fontSize: 22, marginBottom: 10 }}>{s.icon}</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--muted2)', letterSpacing: '0.1em', marginBottom: 6 }}>
                Step {s.num}
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{s.title}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>{s.desc}</div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ textAlign: 'center' }}>
          <a href={api.getLoginUrl()} style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            background: 'var(--accent)', color: '#000', padding: '14px 32px',
            borderRadius: 10, fontSize: 15, fontWeight: 700, textDecoration: 'none',
            transition: 'all 0.2s',
          }}
            onMouseOver={e => e.currentTarget.style.background = '#1ed760'}
            onMouseOut={e => e.currentTarget.style.background = 'var(--accent)'}
          >
            <span style={{ fontSize: 18 }}>🎵</span>
            Connect with Spotify
          </a>
          <p style={{ marginTop: 14, fontSize: 12, color: 'var(--muted2)' }}>
            Free · No credit card · Share with friends
          </p>
        </div>

        {/* Share callout */}
        <div style={{
          marginTop: 48, padding: '16px 20px', background: 'var(--surface)',
          border: '1px solid var(--border)', borderRadius: 12,
          display: 'flex', alignItems: 'center', gap: 14
        }}>
          <div style={{ fontSize: 24 }}>👥</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 3 }}>Share with friends</div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>
              Each person connects their own Spotify. Everyone gets personalised alerts for their own artists & location.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

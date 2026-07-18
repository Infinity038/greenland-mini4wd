'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FEATURE_FLAGS } from '@/lib/featureFlags';
import SupabaseAuthLoginScreen from './SupabaseAuthLoginScreen';

const F = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
const FB = { fontFamily: "'DM Sans', sans-serif" } as const;

const ADMIN_PASSWORD = 'mini4wd2026';

export default function AdminLoginPage() {
  // All hooks below are declared unconditionally, exactly as before this
  // milestone, so the Rules of Hooks are unaffected by the feature-flag
  // branch — see the early `return` right before the legacy JSX, not here.
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async () => {
    setError('');
    if (!password) { setError('Password is required.'); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 800)); // simulate auth
    if (password === ADMIN_PASSWORD) {
      if (remember && typeof window !== 'undefined') {
        localStorage.setItem('adminSession', JSON.stringify({ expires: Date.now() + 8 * 60 * 60 * 1000 }));
      }
      router.push('/admin');
    } else {
      setError('Incorrect password. Access denied.');
    }
    setLoading(false);
  };

  // Feature-flagged Supabase Auth login (docs/OWNER-BOOTSTRAP-AND-AUTH-ROLLOUT.md).
  // Defaults to false everywhere — while off, every line above and below
  // this branch (the legacy hardcoded-password screen and its hooks) is
  // completely unchanged. All hooks are declared unconditionally above this
  // point, so this early return does not violate the Rules of Hooks.
  if (FEATURE_FLAGS.supabaseAuthEnabled) {
    return <SupabaseAuthLoginScreen />;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#050505', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, position: 'relative', overflow: 'hidden' }}>

      {/* Background grid */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(220,38,38,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(220,38,38,0.03) 1px, transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />

      {/* Glow */}
      <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 300, background: 'radial-gradient(ellipse, rgba(220,38,38,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, background: '#DC2626', borderRadius: 14, ...F, fontWeight: 900, fontSize: 22, color: '#fff', marginBottom: 16, boxShadow: '0 0 32px rgba(220,38,38,0.3)' }}>4W</div>
          <div style={{ ...F, fontWeight: 900, fontSize: 26, color: '#F5F5F5', letterSpacing: 2, marginBottom: 4 }}>ADMIN ACCESS</div>
          <div style={{ ...FB, fontSize: 13, color: '#6B7280' }}>Arctic Hustle Mini 4WD Control Center</div>
        </div>

        {/* Card */}
        <div style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '36px 32px', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>

          {/* Email */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ ...F, fontSize: 11, letterSpacing: 3, color: '#B8C1CC', display: 'block', marginBottom: 8 }}>EMAIL (OPTIONAL)</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@greenlandmini4wd.com"
              style={{ width: '100%', background: '#050505', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '13px 16px', color: '#F5F5F5', ...FB, fontSize: 14, outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
              onFocus={e => e.target.style.borderColor = 'rgba(220,38,38,0.5)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ ...F, fontSize: 11, letterSpacing: 3, color: '#B8C1CC', display: 'block', marginBottom: 8 }}>PASSWORD</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="Enter admin password"
                style={{ width: '100%', background: '#050505', border: `1px solid ${error ? 'rgba(220,38,38,0.6)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 10, padding: '13px 48px 13px 16px', color: '#F5F5F5', ...FB, fontSize: 14, outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                onFocus={e => { if (!error) e.target.style.borderColor = 'rgba(220,38,38,0.5)'; }}
                onBlur={e => { if (!error) e.target.style.borderColor = 'rgba(255,255,255,0.08)'; }}
              />
              <button
                onClick={() => setShowPw(!showPw)}
                style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer', fontSize: 16, padding: 2 }}
              >
                {showPw ? '🙈' : '👁️'}
              </button>
            </div>
            {error && (
              <div style={{ ...FB, fontSize: 12, color: '#DC2626', marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>⚠</span> {error}
              </div>
            )}
          </div>

          {/* Remember me */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
            <input
              type="checkbox"
              id="remember"
              checked={remember}
              onChange={e => setRemember(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: '#DC2626', cursor: 'pointer' }}
            />
            <label htmlFor="remember" style={{ ...FB, fontSize: 13, color: '#B8C1CC', cursor: 'pointer' }}>Remember this device</label>
          </div>

          {/* Login button */}
          <button
            onClick={handleLogin}
            disabled={loading}
            style={{ width: '100%', background: loading ? 'rgba(220,38,38,0.5)' : '#DC2626', color: '#fff', border: 'none', borderRadius: 10, padding: '14px 24px', ...F, fontWeight: 900, fontSize: 18, letterSpacing: 3, cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#B91C1C'; }}
            onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#DC2626'; }}
          >
            {loading ? (
              <>
                <span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                AUTHENTICATING...
              </>
            ) : 'ACCESS DASHBOARD →'}
          </button>

          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>

        {/* Security note */}
        <div style={{ textAlign: 'center', marginTop: 24, ...FB, fontSize: 12, color: '#4B5563', lineHeight: 1.6 }}>
          🔒 Restricted access. Unauthorized entry is prohibited.<br />
          This panel manages live member data and orders.
        </div>
      </div>
    </div>
  );
}
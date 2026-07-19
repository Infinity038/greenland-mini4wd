'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabaseAuth/browserClient';
import { resolveStaffSession } from '@/lib/supabaseAuth/resolveStaffSession';
import { resolveSafeNextPath } from '@/lib/supabaseAuth/safeNextPath';

const F = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
const FB = { fontFamily: "'DM Sans', sans-serif" } as const;

type Phase = 'checking' | 'form' | 'signing_in' | 'redirecting';

function nextPath() {
  if (typeof window === 'undefined') return '/admin';
  return resolveSafeNextPath(new URLSearchParams(window.location.search).get('next'));
}

export default function AdminLoginPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('checking');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const client = createSupabaseBrowserClient();
      const session = await resolveStaffSession(client);
      if (cancelled) return;
      if (session.status === 'staff') {
        setPhase('redirecting');
        router.replace(nextPath());
      } else {
        if (session.status === 'authenticated_no_staff_role') {
          await client.auth.signOut();
          setError('This account is not authorized for admin access.');
        } else if (session.status === 'expired') {
          setError('Your session expired. Sign in again.');
        }
        setPhase('form');
      }
    })();
    return () => { cancelled = true; };
  }, [router]);

  async function handleLogin() {
    if (!email.trim() || !password) {
      setError('Email and password are required.');
      return;
    }

    setError('');
    setPhase('signing_in');
    const client = createSupabaseBrowserClient();
    const { error: signInError } = await client.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (signInError) {
      setError('Invalid email or password.');
      setPhase('form');
      return;
    }

    const session = await resolveStaffSession(client);
    if (session.status !== 'staff') {
      await client.auth.signOut();
      setError('This account is not authorized for admin access.');
      setPhase('form');
      return;
    }

    setPhase('redirecting');
    router.replace(nextPath());
    router.refresh();
  }

  const busy = phase === 'checking' || phase === 'signing_in' || phase === 'redirecting';

  return (
    <div style={{ minHeight: '100vh', background: '#050505', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(220,38,38,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(220,38,38,0.03) 1px, transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />
      <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, background: '#DC2626', borderRadius: 14, ...F, fontWeight: 900, fontSize: 22, color: '#fff', marginBottom: 16, boxShadow: '0 0 32px rgba(220,38,38,0.3)' }}>4W</div>
          <div style={{ ...F, fontWeight: 900, fontSize: 26, color: '#F5F5F5', letterSpacing: 2, marginBottom: 4 }}>ADMIN ACCESS</div>
          <div style={{ ...FB, fontSize: 13, color: '#6B7280' }}>Secure staff sign-in</div>
        </div>

        <div style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '36px 32px', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
          {phase === 'checking' || phase === 'redirecting' ? (
            <div style={{ ...FB, textAlign: 'center', color: '#B8C1CC', fontSize: 14 }}>{phase === 'checking' ? 'Checking session…' : 'Redirecting…'}</div>
          ) : (
            <>
              <label style={{ ...F, fontSize: 11, letterSpacing: 3, color: '#B8C1CC', display: 'block', marginBottom: 8 }}>EMAIL</label>
              <input type="email" value={email} onChange={event => { setEmail(event.target.value); setError(''); }} autoComplete="username" placeholder="alltfarmer@gmail.com" disabled={busy}
                style={{ width: '100%', background: '#050505', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '13px 16px', color: '#F5F5F5', ...FB, fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 16 }} />

              <label style={{ ...F, fontSize: 11, letterSpacing: 3, color: '#B8C1CC', display: 'block', marginBottom: 8 }}>PASSWORD</label>
              <div style={{ position: 'relative', marginBottom: error ? 8 : 20 }}>
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={event => { setPassword(event.target.value); setError(''); }} onKeyDown={event => event.key === 'Enter' && handleLogin()} autoComplete="current-password" placeholder="Enter password" disabled={busy}
                  style={{ width: '100%', background: '#050505', border: `1px solid ${error ? 'rgba(220,38,38,0.6)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 10, padding: '13px 48px 13px 16px', color: '#F5F5F5', ...FB, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                <button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer', fontSize: 16 }}>{showPassword ? '🙈' : '👁️'}</button>
              </div>

              {error && <div role="alert" style={{ ...FB, fontSize: 12, color: '#DC2626', marginBottom: 16 }}>⚠ {error}</div>}
              <button onClick={handleLogin} disabled={busy} style={{ width: '100%', background: busy ? 'rgba(220,38,38,0.5)' : '#DC2626', color: '#fff', border: 'none', borderRadius: 10, padding: '14px 24px', ...F, fontWeight: 900, fontSize: 18, letterSpacing: 3, cursor: busy ? 'not-allowed' : 'pointer' }}>
                {phase === 'signing_in' ? 'SIGNING IN…' : 'SIGN IN →'}
              </button>
            </>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: 24, ...FB, fontSize: 12, color: '#4B5563', lineHeight: 1.6 }}>🔒 Access requires an active Supabase account and an assigned staff role.</div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabaseAuth/browserClient';

const OWNER_EMAIL = 'alltfarmer@gmail.com';
const F = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
const FB = { fontFamily: "'DM Sans', sans-serif" } as const;

type Phase = 'checking' | 'form' | 'submitting' | 'email_sent' | 'bootstrapping' | 'done';

export default function AdminOwnerSetupPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('checking');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  async function bootstrapCurrentUser() {
    setPhase('bootstrapping');
    const client = createSupabaseBrowserClient();
    const { data, error: bootstrapError } = await client.rpc('bootstrap_owner_admin');

    if (bootstrapError) {
      setError(bootstrapError.message || 'Owner authorization could not be completed.');
      setPhase('form');
      return;
    }

    if (!data) {
      setError('Owner authorization was not granted.');
      setPhase('form');
      return;
    }

    setPhase('done');
    router.replace('/admin');
    router.refresh();
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const client = createSupabaseBrowserClient();
      const { data } = await client.auth.getUser();
      if (cancelled) return;
      if (data.user) await bootstrapCurrentUser();
      else setPhase('form');
    })();
    return () => { cancelled = true; };
    // The bootstrap function is intentionally invoked only once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createOwnerAccount() {
    setError('');
    if (password.length < 12) {
      setError('Use at least 12 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }

    setPhase('submitting');
    const client = createSupabaseBrowserClient();
    const confirmationUrl = `${window.location.origin}/auth/confirm?next=/admin/setup`;
    const { data, error: signupError } = await client.auth.signUp({
      email: OWNER_EMAIL,
      password,
      options: {
        emailRedirectTo: confirmationUrl,
        data: { bootstrap_owner: true },
      },
    });

    if (signupError) {
      setError(signupError.message || 'Account setup failed.');
      setPhase('form');
      return;
    }

    if (data.session) {
      await bootstrapCurrentUser();
      return;
    }

    setPhase('email_sent');
  }

  const busy = phase === 'checking' || phase === 'submitting' || phase === 'bootstrapping' || phase === 'done';

  return (
    <div style={{ minHeight: '100vh', background: '#050505', color: '#F5F5F5', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 440, background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '32px 28px', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
        <div style={{ textAlign: 'center', marginBottom: 26 }}>
          <div style={{ width: 54, height: 54, margin: '0 auto 14px', background: '#DC2626', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', ...F, fontWeight: 900, fontSize: 21 }}>4W</div>
          <div style={{ ...F, fontWeight: 900, fontSize: 24, letterSpacing: 2 }}>OWNER SETUP</div>
          <div style={{ ...FB, fontSize: 12, color: '#6B7280', marginTop: 5 }}>One-time secure administrator activation</div>
        </div>

        {phase === 'email_sent' ? (
          <div role="status" style={{ ...FB, fontSize: 14, lineHeight: 1.7, textAlign: 'center', color: '#B8C1CC' }}>
            <div style={{ fontSize: 34, marginBottom: 12 }}>✉️</div>
            A confirmation link was sent to <strong style={{ color: '#F5F5F5' }}>{OWNER_EMAIL}</strong>.
            Open it on this device to finish setup and receive the administrator role.
          </div>
        ) : busy ? (
          <div role="status" style={{ ...FB, textAlign: 'center', color: '#B8C1CC', fontSize: 14 }}>
            {phase === 'checking' ? 'Checking account…' : phase === 'bootstrapping' ? 'Activating administrator access…' : phase === 'done' ? 'Opening dashboard…' : 'Creating secure account…'}
          </div>
        ) : (
          <>
            <label style={{ ...F, fontSize: 11, letterSpacing: 3, color: '#B8C1CC', display: 'block', marginBottom: 7 }}>OWNER EMAIL</label>
            <input value={OWNER_EMAIL} readOnly style={{ width: '100%', boxSizing: 'border-box', background: '#050505', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 9, padding: '12px 14px', color: '#9CA3AF', ...FB, fontSize: 14, marginBottom: 16 }} />

            <label style={{ ...F, fontSize: 11, letterSpacing: 3, color: '#B8C1CC', display: 'block', marginBottom: 7 }}>NEW PASSWORD</label>
            <div style={{ position: 'relative', marginBottom: 14 }}>
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={event => setPassword(event.target.value)} autoComplete="new-password" placeholder="At least 12 characters" style={{ width: '100%', boxSizing: 'border-box', background: '#050505', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 9, padding: '12px 46px 12px 14px', color: '#F5F5F5', ...FB, fontSize: 14 }} />
              <button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer' }}>{showPassword ? '🙈' : '👁️'}</button>
            </div>

            <label style={{ ...F, fontSize: 11, letterSpacing: 3, color: '#B8C1CC', display: 'block', marginBottom: 7 }}>CONFIRM PASSWORD</label>
            <input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} onKeyDown={event => event.key === 'Enter' && createOwnerAccount()} autoComplete="new-password" placeholder="Repeat password" style={{ width: '100%', boxSizing: 'border-box', background: '#050505', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 9, padding: '12px 14px', color: '#F5F5F5', ...FB, fontSize: 14, marginBottom: error ? 9 : 18 }} />

            {error && <div role="alert" style={{ ...FB, color: '#DC2626', fontSize: 12, lineHeight: 1.5, marginBottom: 15 }}>⚠ {error}</div>}
            <button onClick={createOwnerAccount} style={{ width: '100%', background: '#DC2626', color: '#fff', border: 'none', borderRadius: 10, padding: '13px 20px', ...F, fontWeight: 900, letterSpacing: 2, fontSize: 16, cursor: 'pointer' }}>CREATE OWNER ACCOUNT →</button>
          </>
        )}
      </div>
    </div>
  );
}

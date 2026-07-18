'use client';

// Feature-flagged Supabase Auth admin login screen
// (NEXT_PUBLIC_SUPABASE_AUTH_ENABLED — lib/featureFlags.ts). Only rendered
// by app/admin/login/page.tsx when that flag is explicitly 'true'; the
// legacy hardcoded-password screen in that file is completely unchanged and
// remains the default. See docs/OWNER-BOOTSTRAP-AND-AUTH-ROLLOUT.md for the
// manual bootstrap process this screen depends on (staff_roles is not
// migrated live yet — see resolveStaffSession.ts for how that fails safely
// in the meantime).
//
// Reads `?next=` from window.location.search directly (never Next's
// useSearchParams()) specifically to avoid requiring a Suspense boundary
// around this already-client-only screen — resolveSafeNextPath() is only
// ever called from an effect/handler, never during render, so `window` is
// always defined by the time it runs.
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabaseAuth/browserClient';
import { resolveStaffSession } from '@/lib/supabaseAuth/resolveStaffSession';
import { type StaffSession } from '@/lib/supabaseAuth/roles';
import { resolveSafeNextPath } from '@/lib/supabaseAuth/safeNextPath';

const F = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
const FB = { fontFamily: "'DM Sans', sans-serif" } as const;

type ScreenState =
  | { phase: 'checking' }
  | { phase: 'form' }
  | { phase: 'signing_in' }
  | { phase: 'redirecting' }
  | { phase: 'error'; message: string }
  | { phase: 'denied'; message: string };

function currentSafeNextPath(): string {
  if (typeof window === 'undefined') return resolveSafeNextPath(null);
  return resolveSafeNextPath(new URLSearchParams(window.location.search).get('next'));
}

export default function SupabaseAuthLoginScreen() {
  const router = useRouter();
  const [state, setState] = useState<ScreenState>({ phase: 'checking' });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const client = createSupabaseBrowserClient();
      const session = await resolveStaffSession(client);
      if (cancelled) return;
      applySessionResult(session);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applySessionResult(session: StaffSession) {
    switch (session.status) {
      case 'staff':
        // Already-authorized staff never sees a "signed in" panel here —
        // redirect straight to /admin (or the validated ?next= target)
        // with router.replace so the login screen doesn't stay in browser
        // history behind the dashboard.
        setState({ phase: 'redirecting' });
        router.replace(currentSafeNextPath());
        return;
      case 'expired':
        setState({ phase: 'error', message: 'Your session has expired. Please sign in again.' });
        return;
      case 'authenticated_no_staff_role':
        setState({ phase: 'denied', message: 'This account is not authorized for admin access.' });
        return;
      case 'unauthenticated':
        setState({ phase: 'form' });
        return;
    }
  }

  async function handleSignIn() {
    if (!email || !password) {
      setState({ phase: 'error', message: 'Email and password are required.' });
      return;
    }
    setState({ phase: 'signing_in' });
    const client = createSupabaseBrowserClient();
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) {
      setState({ phase: 'error', message: 'Invalid email or password.' });
      return;
    }
    const session = await resolveStaffSession(client);
    if (session.status !== 'staff') {
      // Deny a valid racer account with no staff role — sign this login
      // attempt back out rather than leaving an authenticated-but-
      // unauthorized session sitting on the admin login screen.
      await client.auth.signOut();
    }
    applySessionResult(session);
  }

  const wrap = {
    minHeight: '100vh',
    background: '#050505',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  } as const;
  const card = {
    width: '100%',
    maxWidth: 420,
    background: '#071426',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 20,
    padding: '36px 32px',
  } as const;
  const title = { ...F, fontWeight: 900, fontSize: 22, color: '#F5F5F5', letterSpacing: 2, marginBottom: 4 } as const;
  const subtitle = { ...FB, fontSize: 12, color: '#6B7280', marginBottom: 24 } as const;
  const input = {
    width: '100%',
    background: '#050505',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 10,
    padding: '13px 16px',
    color: '#F5F5F5',
    ...FB,
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box' as const,
    marginBottom: 14,
  };
  const button = {
    width: '100%',
    background: '#DC2626',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    padding: '13px 24px',
    ...F,
    fontWeight: 900,
    fontSize: 16,
    letterSpacing: 2,
    cursor: 'pointer',
  } as const;
  const errorBox = { ...FB, fontSize: 13, color: '#DC2626', marginBottom: 14 } as const;

  if (state.phase === 'checking' || state.phase === 'redirecting') {
    return (
      <div style={wrap}>
        <div style={card}>
          <div style={title}>ADMIN ACCESS</div>
          <div style={subtitle}>{state.phase === 'redirecting' ? 'Redirecting…' : 'Checking session…'}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={wrap}>
      <div style={card}>
        <div style={title}>ADMIN ACCESS</div>
        <div style={subtitle}>Supabase Auth sign-in (feature-flagged)</div>
        {(state.phase === 'error' || state.phase === 'denied') && (
          <div style={errorBox} role="alert">{state.message}</div>
        )}
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="Email"
          aria-label="Email"
          disabled={state.phase === 'signing_in'}
          style={input}
        />
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSignIn()}
          placeholder="Password"
          aria-label="Password"
          disabled={state.phase === 'signing_in'}
          style={input}
        />
        <button style={button} onClick={handleSignIn} disabled={state.phase === 'signing_in'}>
          {state.phase === 'signing_in' ? 'SIGNING IN…' : 'SIGN IN →'}
        </button>
      </div>
    </div>
  );
}

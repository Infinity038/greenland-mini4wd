'use client';

// Shown when the Supabase-Auth-gated /admin path (page.tsx) resolves a
// valid, authenticated Supabase Auth session that is NOT a staff account —
// e.g. a normal racer. Deliberately not a redirect to /admin/login: the
// visitor is already correctly signed in as themselves, just not
// authorized for this area, so sending them back to a login form would be
// confusing and wrong. Offers Sign Out (to let them sign back in as a
// different, staff-holding account) rather than silently trapping them.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabaseAuth/browserClient';

const F = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
const FB = { fontFamily: "'DM Sans', sans-serif" } as const;

export default function AccessDeniedScreen() {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    const client = createSupabaseBrowserClient();
    await client.auth.signOut();
    router.push('/admin/login');
  }

  return (
    <div style={{ minHeight: '100vh', background: '#050505', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 420, background: '#071426', border: '1px solid rgba(220,38,38,0.25)', borderRadius: 20, padding: '32px 28px', textAlign: 'center' }}>
        <div style={{ ...F, fontWeight: 900, fontSize: 22, color: '#DC2626', letterSpacing: 2, marginBottom: 10 }}>ACCESS DENIED</div>
        <div role="alert" style={{ ...FB, fontSize: 13, color: '#B8C1CC', marginBottom: 24, lineHeight: 1.6 }}>
          This account is not authorized for admin access. Ask an administrator to grant a staff role, or sign in with a different account.
        </div>
        <button onClick={handleSignOut} disabled={signingOut} style={{ width: '100%', background: '#DC2626', color: '#fff', border: 'none', borderRadius: 10, padding: '13px 24px', ...F, fontWeight: 900, fontSize: 15, letterSpacing: 2, cursor: signingOut ? 'not-allowed' : 'pointer', opacity: signingOut ? 0.6 : 1 }}>
          {signingOut ? 'SIGNING OUT…' : 'SIGN OUT'}
        </button>
      </div>
    </div>
  );
}

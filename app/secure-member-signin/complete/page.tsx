import { createSupabaseServerClient } from '@/lib/supabaseAuth/serverClient';
import { resolveSafeMemberNextPath, resolveSafeStaffNextPath } from '@/lib/supabaseAuth/safeNextPath';
import Link from 'next/link';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Verify club member | Greenland Mini4WD', robots: { index: false, follow: false } };

/**
 * Runs right after a verified sign-in. It tries to link the verified email to ONE existing club membership (a restricted
 * SECURITY DEFINER function; nothing about the member or the email comes from the browser). Linking is optional: invited
 * non-members have no membership to link and continue normally. This page never reveals whether a private area exists.
 */
export default async function CompleteVerifiedMemberLink({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next: rawNext } = await searchParams;
  const client = await createSupabaseServerClient();
  const { data: { user }, error } = await client.auth.getUser();
  const explicit = resolveSafeMemberNextPath(rawNext) ?? resolveSafeStaffNextPath(rawNext);
  let signedIn = false, linked = false, invited = false;
  if (!error && user?.email_confirmed_at) {
    signedIn = true;
    const result = await client.rpc('claim_existing_member_after_verified_email');
    linked = !result.error && typeof result.data === 'string';
    const access = await client.rpc('pp_access_allowed');   // invited players and operators go to the Prediction Pit; everyone else keeps the club profile
    invited = !access.error && access.data === true;
  }
  const next = explicit ?? (invited ? '/prediction-pit' : '/profile');
  return <main style={{minHeight:'100vh',background:'#050505',color:'#f5f5f5',padding:'70px 20px',fontFamily:'DM Sans, sans-serif'}}>
    <section style={{maxWidth:600,margin:'auto',background:'#071426',padding:30,border:'1px solid #405065',borderRadius:15}}>
      <h1 style={{fontFamily:'Barlow Condensed, sans-serif'}}>{signedIn ? 'You are signed in' : 'Sign-in was not completed'}</h1>
      <p role="status" data-testid="complete-status" style={{lineHeight:1.65,color:signedIn?'#86efac':'#fcd34d'}}>
        {signedIn
          ? (linked ? 'Your verified email is linked to your Greenland Mini4WD membership.' : 'Your email is verified.')
          : 'We could not verify this sign-in. Please request a new code.'}
      </p>
      {signedIn
        ? <p><Link href={next} data-testid="complete-continue" style={{display:'inline-block',padding:'12px 18px',borderRadius:8,background:'#facc15',color:'#050505',fontWeight:800,textDecoration:'none'}}>Continue</Link></p>
        : <p><Link href={`/secure-member-signin?next=${encodeURIComponent(next)}`} style={{color:'#facc15'}}>Try again</Link></p>}
      <p><Link href="/" style={{color:'#b8c1cc'}}>Back to website</Link></p>
    </section>
  </main>;
}

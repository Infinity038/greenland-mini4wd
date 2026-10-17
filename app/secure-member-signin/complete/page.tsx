import { createSupabaseServerClient } from '@/lib/supabaseAuth/serverClient';
import Link from 'next/link';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Verify club member | Greenland Mini4WD', robots: { index: false, follow: false } };

export default async function CompleteVerifiedMemberLink() {
  const client = await createSupabaseServerClient();
  const { data: { user }, error } = await client.auth.getUser();
  let linked = false;
  if (!error && user?.email_confirmed_at) {
    // Only a reviewed, staged SECURITY DEFINER function can link an existing
    // record. Email/member ID supplied by the browser is never trusted.
    const result = await client.rpc('claim_existing_member_after_verified_email');
    linked = !result.error && typeof result.data === 'string';
  }
  return <main style={{minHeight:'100vh',background:'#050505',color:'#f5f5f5',padding:'70px 20px',fontFamily:'DM Sans, sans-serif'}}>
    <section style={{maxWidth:600,margin:'auto',background:'#071426',padding:30,border:'1px solid #405065',borderRadius:15}}>
      <h1 style={{fontFamily:'Barlow Condensed, sans-serif'}}>Member verification</h1>
      <p role="status" style={{lineHeight:1.65,color:linked?'#86efac':'#fcd34d'}}>
        {linked?'Your verified sign-in has been linked to an existing club membership. The organizer still controls separate invitation-only access.':'Account linking is not yet available, or this verified email does not match exactly one existing club membership. Please contact the organizer. No member data has been changed by this page.'}
      </p>
      <p style={{color:'#b8c1cc'}}>The existing live profile and legacy login will remain unchanged until the migration and RLS cutover are tested and approved.</p>
      <Link href="/" style={{color:'#facc15'}}>Back to website</Link>
    </section>
  </main>;
}

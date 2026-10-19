import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import { createSupabaseServerClient } from '@/lib/supabaseAuth/serverClient';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Private Prediction Pit | Greenland Mini4WD', robots: { index: false, follow: false } };

// Do not trust gm4wd_registered/localStorage for access. Fail closed if database
// functions/auth are not deployed. All future /api endpoints also require server checks.
export default async function PrivatePredictionPitPage() {
  const client = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError || !user) notFound();
  const { data: allowed, error: accessError } = await client.rpc('prediction_pit_allowed');
  if (accessError || allowed !== true) notFound();
  return <>
    <Navbar />
    <main style={{minHeight:'100vh',background:'#050b15',color:'#f5f5f5',padding:'110px 20px 60px'}}>
      <div style={{maxWidth:760,margin:'0 auto',padding:28,border:'1px solid #2b4154',background:'#071426',borderRadius:18}}>
        <p style={{fontSize:12,letterSpacing:3,color:'#facc15'}}>INVITATION-ONLY · 4W VIRTUAL COINS</p>
        <h1 style={{fontFamily:'Barlow Condensed, sans-serif',fontSize:44,fontWeight:900}}>🏁 PRIVATE PREDICTION PIT</h1>
        <p style={{color:'#b8c1cc',lineHeight:1.7,marginTop:15}}>Your verified account is approved for this private area. The online wallet, Mini4WD gameplay, and settlements remain disabled while the security and backend integration is under review.</p>
        <Link href="/prediction-pit/mcl" style={{display:'block',border:'1px solid #477cb0',borderRadius:14,padding:19,background:'linear-gradient(135deg,#0e2f55,#0a1830)',color:'#fff',marginTop:24}}>
          <strong style={{display:'block',fontSize:22,color:'#ffd35b'}}>🏆 MARBLE CHAMPIONSHIP LEAGUE</strong>
          <span style={{display:'block',color:'#c1d9ee',marginTop:9,fontSize:13,lineHeight:1.6}}>Explore the isolated, read-only 24-marble league concept: ten matchdays, six-marble race lineups, standings and three proposed prediction categories.</span>
          <span style={{display:'block',color:'#7ad7ff',fontWeight:700,marginTop:13}}>OPEN DESIGN PREVIEW →</span>
        </Link>
        <p style={{color:'#facc15',lineHeight:1.6,marginTop:18}}>No automatic starting coins. No purchasing, cash-out of real money, monetary prizes or connection to official Mini4WD fees and race prizes.</p>
      </div>
    </main>
  </>;
}

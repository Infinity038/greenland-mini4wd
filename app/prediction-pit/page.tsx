import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
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
    <main style={{minHeight:'100vh',background:'#050505',color:'#f5f5f5',padding:'110px 20px 60px'}}>
      <div style={{maxWidth:760,margin:'0 auto',padding:28,border:'1px solid #2b4154',background:'#071426',borderRadius:18}}>
        <p style={{fontSize:12,letterSpacing:3,color:'#facc15'}}>INVITATION-ONLY · 4W VIRTUAL COINS</p>
        <h1 style={{fontFamily:'Barlow Condensed, sans-serif',fontSize:44,fontWeight:900}}>🏁 PRIVATE PREDICTION PIT</h1>
        <p style={{color:'#b8c1cc',lineHeight:1.7}}>Your verified account is approved for this private area. Online wallet, scheduled heats, cars, predictions and private rankings are undergoing integration and are not enabled yet.</p>
        <p style={{color:'#facc15'}}>No automatic starting coins. No monetary exchange, prizes of value or connection to official race prizes.</p>
      </div>
    </main>
  </>;
}

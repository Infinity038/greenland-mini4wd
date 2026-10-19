import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Navbar from '@/components/layout/Navbar';
import { createSupabaseServerClient } from '@/lib/supabaseAuth/serverClient';
import MCLDashboard from './MCLDashboard';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Marble Championship League | Private Prediction Pit',
  robots: { index: false, follow: false },
};

/** Independent server gate: the parent route's page does not protect children. */
export default async function PrivateMarbleChampionshipPage() {
  const client = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError || !user) notFound();
  const { data: allowed, error: accessError } = await client.rpc('prediction_pit_allowed');
  if (accessError || allowed !== true) notFound();

  return <>
    <Navbar />
    <main style={{paddingTop:60,background:'#040c18',minHeight:'100vh'}}>
      <MCLDashboard />
    </main>
  </>;
}

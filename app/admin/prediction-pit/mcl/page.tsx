import { redirect, notFound } from 'next/navigation';
import { requireStaffSession } from '@/lib/supabaseAuth/requireStaffSession';
import { createMarbles, generateRegularSeason } from '@/lib/mcl/league';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'MCL Operator Preview | Private Prediction Pit', robots: {index:false,follow:false} };
const palette = {background:'#08182b',border:'1px solid #31516d',borderRadius:14,padding:18} as const;

/** Read-only host review. No mutations or claims that scheduling is activated. */
export default async function MCLOperatorPreview() {
  const session = await requireStaffSession(['admin']);
  if (session.status === 'unauthenticated' || session.status === 'expired') redirect('/admin/login');
  if (session.status !== 'staff') notFound();
  const marbles = createMarbles();
  const races = generateRegularSeason(marbles);
  return <main style={{minHeight:'100vh',padding:'30px 16px',background:'#050c19',color:'#eef6ff'}}>
    <div style={{maxWidth:900,margin:'auto',display:'grid',gap:16}}>
      <a href="/admin/prediction-pit" style={{color:'#7ccaff'}}>← Prediction Pit Access</a>
      <header style={palette}>
        <p style={{fontSize:11,letterSpacing:2,color:'#ffd25e'}}>ADMIN ONLY · DESIGN REVIEW</p>
        <h1 style={{fontFamily:'Barlow Condensed,sans-serif',fontSize:38,fontWeight:900,margin:'8px 0'}}>MCL OPERATOR CONTROL</h1>
        <p style={{color:'#adc7df',fontSize:13,lineHeight:1.6}}>Non-transactional preview. The production race scheduler, server-enforced lock, video links, result submission, wallet settlement and future-season persistence are NOT enabled.</p>
      </header>
      <section style={palette}>
        <h2 style={{fontSize:21,fontWeight:900}}>Season 01 · Suggested event schedule</h2>
        <p style={{color:'#aec7dc',fontSize:13,margin:'9px 0'}}>Opening: 20 October 2026 at 13:00 Asia/Manila (05:00 UTC). Each matchday has four six-marble races, 15 minutes apart. These are proposed values, not saved operator settings.</p>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
            <thead><tr style={{color:'#79cfff',textAlign:'left'}}><th style={{padding:8}}>Race</th><th style={{padding:8}}>Scheduled (UTC)</th><th style={{padding:8}}>Lineup / lane</th></tr></thead>
            <tbody>{races.slice(0,4).map(r=><tr key={r.id} style={{borderTop:'1px solid #26425c'}}><td style={{padding:8}}>{r.id}</td><td style={{padding:8}}>{r.scheduledAt.replace('T',' ').slice(0,16)}</td><td style={{padding:8}}>{r.lineup.map(id=>id+' (L'+r.lanes[id]+')').join(' · ')}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
      <section style={palette}>
        <h2 style={{fontSize:21,fontWeight:900}}>Future operator workflow</h2>
        <ol style={{paddingLeft:22,color:'#c4d7ec',fontSize:13,lineHeight:2.1}}>
          <li>Publish season roster, two upcoming season configurations and scheduled race timestamps.</li>
          <li>Open eligible virtual prediction markets; no default wallet coin grant.</li>
          <li>Automatically reject entries, cancellation and cash-out at race start on the server, or manually lock earlier.</li>
          <li>Publish a verified YouTube or Facebook Live link for spectators.</li>
          <li>Enter all six unique finish positions and review before confirmation.</li>
          <li>Confirm once: settle race market atomically, award 6–1 standings points, update personal tickets and reopen eligible markets.</li>
        </ol>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:8,marginTop:14}}>
          {['Lock All Bets','Publish Livestream','Enter Results','Confirm Settlement'].map(label=><button disabled key={label} title="Backend integration not enabled" style={{padding:12,color:'#7c95ad',background:'#182c40',border:'1px solid #35516b',borderRadius:8,cursor:'not-allowed'}}>{label} · Disabled</button>)}
        </div>
      </section>
      <section style={palette}>
        <h2 style={{fontSize:21,fontWeight:900}}>Activation blockers</h2>
        <p style={{color:'#e8bc71',fontSize:13,lineHeight:1.8}}>Requires the existing PR #17 member Auth / RLS remediation and verified backup, the private Prediction Pit allowlist release gate, dedicated RLS-protected 4W ledger and market RPCs, atomic/idempotent settlement, authorisation tests and owner approval. No production migration or deployment follows from this preview.</p>
      </section>
    </div>
  </main>;
}

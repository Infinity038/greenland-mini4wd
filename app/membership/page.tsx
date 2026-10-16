import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
export const metadata = { title:'Membership & Club Pass | Greenland Mini 4WD Club', description:'Free racer registration, legacy access and the separate future Club Pass.' };
const txt={fontFamily:"'DM Sans', sans-serif",color:'#B8C1CC',lineHeight:1.8} as const;
const title={fontFamily:"'Barlow Condensed', sans-serif",fontWeight:900,color:'#F5F5F5'} as const;
export default function MembershipPage(){ return <><Navbar/><main style={{minHeight:'100vh',background:'#050505',padding:'110px 20px 80px'}}><div style={{maxWidth:900,margin:'0 auto'}}>
<p style={{...title,fontSize:12,color:'#DC2626',letterSpacing:4}}>RACER ACCESS</p><h1 style={{...title,fontSize:'clamp(38px,7vw,66px)',margin:'12px 0'}}>JOIN FREE. RACE TOGETHER.</h1>
<p style={{...txt,fontSize:16}}>Registration, legacy spending-based access and future paid Club Passes are distinct. A free racer account is not a paid pass and does not automatically include a complimentary car.</p>
<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(245px,1fr))',gap:14,margin:'26px 0'}}>
<section style={{padding:22,borderRadius:14,background:'#071426',border:'1px solid #334155'}}><h2 style={{...title,fontSize:28}}>Free Racer Account</h2><p style={txt}>Create your racer profile, register cars and follow competitions. Permanent account registration remains free.</p><a href="/register" style={{color:'#FACC15',fontWeight:800}}>REGISTER FREE →</a></section>
<section style={{padding:22,borderRadius:14,background:'#071426',border:'1px solid #334155'}}><h2 style={{...title,fontSize:28}}>Existing Earned Days</h2><p style={txt}>The current programme awards one access day per 20 DKK of qualifying spend during the transition. Earned history and existing bonus-ticket entitlements remain in place. A future policy change will be announced before it starts.</p></section>
<section style={{padding:22,borderRadius:14,background:'#071426',border:'1px solid #334155'}}><h2 style={{...title,fontSize:28}}>Future Paid Club Pass</h2><p style={txt}>Optional one-, two- and three-month access passes are in preparation. The proposed introductory giveaway will be limited to designated lowest-cost standard beginner kits (Shelf 1), once per eligible new customer. B-MAX builds are sold separately at the published retail price.</p><p style={{...txt,color:'#FACC15'}}>Not on sale yet — no payments or promotional-car claims are accepted from this page.</p></section>
</div>
<p style={txt}>Routine practice is planned as walk-in with fair turn-taking and a staff-controlled starting point. Competition tickets remain separate from the Club Pass unless a specific event says otherwise. Confirm actual opening dates in the events calendar.</p>
<a href="/events" style={{color:'#FACC15',fontWeight:800}}>SEE CONFIRMED EVENTS →</a>
</div></main><Footer/></>;}

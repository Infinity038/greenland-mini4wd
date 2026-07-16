// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { isRegistered, getMemberData } from '@/lib/member';
import { isMemberActive } from '@/lib/loyalty';
import { supabase } from '@/lib/supabase';
import { FEATURE_FLAGS } from '@/lib/featureFlags';

const F  = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
const FB = { fontFamily: "'DM Sans', sans-serif" } as const;

const RACE_CLASSES = [
  { id: 'boxstock',      label: 'Box Stock',      color: '#22C55E', icon: '📦', short: 'Pure stock — box contents only.', desc: 'Contents inside the box are fixed. What comes in the box is what you use — no modifications allowed.' },
  { id: 'open_boxstock', label: 'Open Box Stock', color: '#3B82F6', icon: '🔓', short: 'Box stock with limited cosmetic replacements.', desc: 'Same as Box Stock, but mag/cowl/chassis color replacements allowed. Cannot change type — only color.' },
  { id: 'bmax',          label: 'B-Max',          color: '#F97316', icon: '⚡', short: 'Carbon + slide damper gimmicks.', desc: 'Carbon allowed, gimmicks allowed. Slide damper systems permitted. Competitive tuning for experienced builders.' },
  { id: 'open',          label: 'Open Class',     color: '#DC2626', icon: '🔥', short: 'Unlimited builds — anything goes.', desc: 'No restrictions on mods, motors, or parts. Most competitive class on track.' },
];

// Never show a raw email as a public-facing display name (privacy) — falls back
// to a generic label instead. Also used to clean up any legacy entries where
// member_name was accidentally stored as an email address.
function safeName(name: string | null | undefined, fallback = 'Racer'): string {
  if (!name || typeof name !== 'string') return fallback;
  return name.includes('@') ? fallback : name;
}

function PrizeCalculator() {
  const [paid, setPaid]   = useState(20);
  const [bonus, setBonus] = useState(0);
  const [price, setPrice] = useState(150);
  const total   = paid * price;
  const pool    = Math.round(total * 0.70);
  const org     = Math.round(total * 0.30);
  const inp = { background:'#0D1B2A', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, padding:'12px 16px', color:'#F5F5F5', fontSize:20, fontWeight:700, width:'100%', outline:'none', fontFamily:"'Barlow Condensed', sans-serif", boxSizing:'border-box' };
  return (
    <div style={{ background:'#071426', border:'1px solid rgba(220,38,38,0.25)', borderRadius:16, padding:'32px 28px' }}>
      <div style={{ ...F, fontSize:11, letterSpacing:5, color:'#DC2626', marginBottom:6 }}>LIVE CALCULATOR</div>
      <h3 style={{ ...F, fontWeight:900, fontSize:28, color:'#F5F5F5', margin:'0 0 24px' }}>PRIZE POOL ESTIMATOR</h3>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:16, marginBottom:28 }}>
        {[{l:'TICKET PRICE (DKK)',v:price,s:setPrice,min:50,max:500},{l:'PAID ENTRIES',v:paid,s:setPaid,min:2,max:100},{l:'BONUS TICKETS',v:bonus,s:setBonus,min:0,max:20}].map(f=>(
          <div key={f.l}><div style={{...F,fontSize:11,letterSpacing:3,color:'#B8C1CC',marginBottom:8}}>{f.l}</div><input style={inp} type="number" min={f.min} max={f.max} value={f.v} onChange={e=>f.s(Number(e.target.value))}/></div>
        ))}
      </div>
      <div style={{ background:'#050505', borderRadius:12, padding:20, marginBottom:16 }}>
        {[{l:'Total entries',v:paid+bonus,c:'#F5F5F5'},{l:'Paid revenue',v:`${total.toLocaleString()} DKK`,c:'#F5F5F5'},{l:'Organizer (30%)',v:`${org.toLocaleString()} DKK`,c:'#B8C1CC'}].map(r=>(
          <div key={r.l} style={{display:'flex',justifyContent:'space-between',marginBottom:8}}><span style={{...FB,color:'#B8C1CC',fontSize:14}}>{r.l}</span><span style={{...F,fontWeight:700,color:r.c,fontSize:16}}>{r.v}</span></div>
        ))}
        <div style={{height:1,background:'rgba(255,255,255,0.08)',margin:'12px 0'}}/>
        <div style={{display:'flex',justifyContent:'space-between'}}><span style={{...F,fontSize:16,letterSpacing:2,color:'#FACC15'}}>PRIZE POOL (70%)</span><span style={{...F,fontWeight:900,fontSize:24,color:'#FACC15'}}>{pool.toLocaleString()} DKK</span></div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
        {[{p:'🥇 1ST',pct:'65%',v:Math.round(pool*.65),c:'#FACC15'},{p:'🥈 2ND',pct:'25%',v:Math.round(pool*.25),c:'#B8C1CC'},{p:'🥉 3RD',pct:'10%',v:Math.round(pool*.10),c:'#CD7F32'}].map(r=>(
          <div key={r.p} style={{background:'#050505',borderRadius:10,padding:'16px 12px',textAlign:'center',border:`1px solid ${r.c}22`}}>
            <div style={{...F,fontSize:13,color:r.c,marginBottom:4}}>{r.p}</div>
            <div style={{...F,fontWeight:900,fontSize:22,color:r.c}}>{r.v.toLocaleString()}</div>
            <div style={{...FB,fontSize:11,color:'#6B7280'}}>DKK · {r.pct}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TournamentPage() {
  const [loggedIn, setLoggedIn]         = useState(false);
  const [member, setMember]             = useState(null);
  const [tournaments, setTournaments]   = useState([]);
  const [allEntries, setAllEntries]     = useState([]);
  const [carImages, setCarImages]       = useState<Record<string, string>>({});
  const [myCars, setMyCars]             = useState([]);
  const [myTickets, setMyTickets]       = useState([]);
  const [myEntries, setMyEntries]       = useState([]);
  const [memberActive, setMemberActive] = useState(true);
  const [loading, setLoading]           = useState(true);

  // Race entry modal
  const [regModal, setRegModal]         = useState(false);
  const [regTournament, setRegTournament] = useState(null);
  const [regCar, setRegCar]             = useState('');
  const [regCategory, setRegCategory]   = useState('');
  const [regSaving, setRegSaving]       = useState(false);
  const [regError, setRegError]         = useState('');
  const [regSuccess, setRegSuccess]     = useState('');

  // Entrants modal (per tournament)
  const [entrantsModal, setEntrantsModal] = useState(false);
  const [entrantsTournament, setEntrantsTournament] = useState(null);

  // Fighter card modal
  const [fighter, setFighter]           = useState(null);
  const [fighterCars, setFighterCars]   = useState([]);

  // Pulls the photo for every car referenced by the given entries (one batched
  // query) so entrant rows / fighter cards can show the actual car, not just text.
  async function loadCarImages(entries: any[]) {
    const ids = Array.from(new Set(entries.map((e: any) => e.car_id).filter(Boolean)));
    if (ids.length === 0) { setCarImages({}); return; }
    const { data } = await supabase.from('cars').select('id,image_url').in('id', ids);
    const map: Record<string, string> = {};
    (data || []).forEach((c: any) => { if (c.image_url) map[c.id] = c.image_url; });
    setCarImages(map);
  }

  useEffect(() => {
    const reg = isRegistered();
    setLoggedIn(reg);
    const local = getMemberData();
    if (local) setMember(local);
    async function load() {
      const { data: tData } = await supabase.from('tournaments').select('*').in('status',['upcoming','ongoing']).order('date',{ascending:true});
      setTournaments(tData || []);
      const { data: eData } = await supabase.from('race_entries').select('*').order('created_at',{ascending:true});
      setAllEntries(eData || []);
      loadCarImages(eData || []);
      if (local?.email) {
        const { data: cData } = await supabase.from('cars').select('*').eq('member_email',local.email).eq('status','approved');
        setMyCars(cData || []);
        const { data: tkData } = await supabase.from('race_tickets').select('*').eq('member_email',local.email).eq('payment_status','payment_confirmed');
        setMyTickets(tkData || []);
        const { data: meData } = await supabase.from('race_entries').select('*').eq('member_email',local.email);
        setMyEntries(meData || []);
        const { data: memberRow } = await supabase.from('members').select('membership_expires_at').eq('email',local.email).single();
        setMemberActive(isMemberActive(memberRow));
      }
      setLoading(false);
    }
    load();
  }, []);

  // Expired members can still race, but only on tickets they paid real money for —
  // bonus/punch-card tickets are excluded once membership lapses.
  const eligibleTickets  = memberActive ? myTickets : myTickets.filter(t=>t.ticket_type !== 'bonus');
  const myTotalTickets   = eligibleTickets.reduce((s,t)=>s+(Number(t.quantity)||1),0);
  const usedTickets      = myEntries.length;  // each entry consumes 1 ticket
  const availableTickets = Math.max(0, myTotalTickets - usedTickets);
  const myEntriesFor    = (tid) => myEntries.filter(e=>e.tournament_id===tid);
  const allEntriesFor   = (tid) => allEntries.filter(e=>e.tournament_id===tid);

  const openRegModal = (t) => { setRegTournament(t); setRegCar(''); setRegCategory(''); setRegError(''); setRegSuccess(''); setRegModal(true); };
  const openEntrantsModal = (t) => { setEntrantsModal(true); setEntrantsTournament(t); };

  const openFighter = async (e) => {
    setFighter(e);
    setFighterCars([]);
    if (e.member_email) {
      const { data } = await supabase.from('cars').select('*').eq('member_email', e.member_email).eq('status', 'approved');
      setFighterCars(data || []);
    }
  };

  const submitEntry = async () => {
    if (!regCar || !regCategory) { setRegError('Select a car and category.'); return; }
    if (availableTickets <= 0) { setRegError('No available tickets. Buy more first.'); return; }
    const car = myCars.find(c=>c.id===regCar);
    if (!car) return;
    const dup = myEntries.find(e=>e.tournament_id===regTournament.id && e.car_id===regCar && e.race_category===regCategory);
    if (dup) { setRegError('This car is already entered in this category.'); return; }
    setRegSaving(true); setRegError('');
    const usedIds = myEntries.map(e=>e.ticket_id).filter(Boolean);
    const availTicket = eligibleTickets.find(t=>!usedIds.includes(t.id));
    // Public-facing name only — never falls back to the member's email (privacy).
    const memberDisplayName = member.name || `${member.first_name || ''} ${member.last_name || ''}`.trim() || 'Racer';
    const { error } = await supabase.from('race_entries').insert({
      tournament_id: regTournament.id, member_email: member.email,
      member_name: memberDisplayName, car_id: regCar,
      car_name: car.name, chassis: car.chassis, race_category: regCategory,
      ticket_id: availTicket?.id || null, status: 'confirmed',
    });
    if (error) { setRegError('Failed. Please try again.'); setRegSaving(false); return; }
    const { data: me } = await supabase.from('race_entries').select('*').eq('member_email',member.email);
    setMyEntries(me||[]);
    const { data: ae } = await supabase.from('race_entries').select('*').order('created_at',{ascending:true});
    setAllEntries(ae||[]);
    loadCarImages(ae||[]);
    setRegSuccess(`✅ ${car.name} entered in ${RACE_CLASSES.find(c=>c.id===regCategory)?.label}!`);
    setRegSaving(false);
    setTimeout(()=>{ setRegModal(false); setRegSuccess(''); },1800);
  };

  const withdrawEntry = async (entryId) => {
    if (!confirm('Withdraw this entry?')) return;
    await supabase.from('race_entries').delete().eq('id',entryId);
    const { data: me } = await supabase.from('race_entries').select('*').eq('member_email',member?.email);
    setMyEntries(me||[]);
    const { data: ae } = await supabase.from('race_entries').select('*').order('created_at',{ascending:true});
    setAllEntries(ae||[]);
    loadCarImages(ae||[]);
  };

  return (
    <>
      <Navbar />
      <main style={{ background:'#050505', color:'#F5F5F5', paddingTop:60 }}>

        {/* Hero */}
        <section style={{ background:'linear-gradient(180deg,#071426 0%,#050505 100%)', borderBottom:'1px solid rgba(220,38,38,0.2)', padding:'64px 24px 56px' }}>
          <div style={{ maxWidth:900, margin:'0 auto', textAlign:'center' }}>
            <div style={{ ...F, fontSize:11, letterSpacing:5, color:'#DC2626', marginBottom:12 }}>WEEKLY RACE EVENT</div>
            <h1 style={{ ...F, fontWeight:900, fontSize:'clamp(48px,10vw,96px)', lineHeight:0.9, margin:'0 0 20px' }}>BOX STOCK<br /><span style={{ color:'#DC2626' }}>TOURNAMENT</span></h1>
            <p style={{ ...FB, fontSize:16, color:'#B8C1CC', maxWidth:560, margin:'0 auto 32px', lineHeight:1.7 }}>Pure stock. Pure skill. Every racer on the same level — the only advantage is your driving.</p>
            <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
              {loggedIn ? (
                <><a href="/tickets" style={{ background:'#DC2626', color:'#fff', padding:'14px 32px', borderRadius:10, ...F, fontWeight:900, fontSize:17, letterSpacing:2, textDecoration:'none' }}>{FEATURE_FLAGS.onlineRaceTicketsEnabled ? '🎟️ BUY TICKETS →' : '🏁 RSVP FOR RACE DAY →'}</a>
                <a href="/shop" style={{ background:'transparent', color:'#F5F5F5', padding:'14px 32px', borderRadius:10, ...F, fontWeight:700, fontSize:17, letterSpacing:2, textDecoration:'none', border:'1px solid rgba(255,255,255,0.15)' }}>GET YOUR CAR</a></>
              ) : (
                <><a href="/register" style={{ background:'#DC2626', color:'#fff', padding:'14px 32px', borderRadius:10, ...F, fontWeight:900, fontSize:17, letterSpacing:2, textDecoration:'none' }}>REGISTER FREE FIRST →</a>
                <a href="/tickets" style={{ background:'transparent', color:'#F5F5F5', padding:'14px 32px', borderRadius:10, ...F, fontWeight:700, fontSize:17, letterSpacing:2, textDecoration:'none', border:'1px solid rgba(255,255,255,0.15)' }}>{FEATURE_FLAGS.onlineRaceTicketsEnabled ? 'VIEW TICKETS' : 'VIEW RACE DAY INFO'}</a></>
              )}
            </div>
          </div>
        </section>

        <div style={{ maxWidth:1000, margin:'0 auto', padding:'60px 24px' }}>

          {/* Upcoming Races */}
          <section style={{ marginBottom:64 }}>
            <div style={{ ...F, fontSize:11, letterSpacing:5, color:'#DC2626', marginBottom:8 }}>SCHEDULE</div>
            <h2 style={{ ...F, fontWeight:900, fontSize:'clamp(32px,6vw,52px)', margin:'0 0 24px' }}>UPCOMING RACES</h2>

            {loading ? (
              <div style={{ ...FB, color:'#B8C1CC', fontSize:14, padding:'40px 0' }}>Loading schedule...</div>
            ) : tournaments.length === 0 ? (
              <div style={{ background:'#071426', border:'1px solid rgba(255,255,255,0.08)', borderRadius:14, padding:'40px 28px', textAlign:'center' }}>
                <div style={{ fontSize:40, marginBottom:12 }}>🏁</div>
                <div style={{ ...F, fontWeight:900, fontSize:22, color:'#F5F5F5', marginBottom:8 }}>NEXT RACE BEING SCHEDULED</div>
                <div style={{ ...FB, fontSize:14, color:'#B8C1CC', maxWidth:400, margin:'0 auto 20px' }}>Race dates announced on Facebook and Instagram.</div>
                <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
                  <a href="https://www.facebook.com/share/g/18gBxyY1Wd/?mibextid=wwXIfr" target="_blank" rel="noreferrer" style={{ background:'#1877F2', color:'#fff', padding:'10px 20px', borderRadius:6, ...F, fontWeight:700, fontSize:13, letterSpacing:1, textDecoration:'none' }}>FACEBOOK →</a>
                  <a href="https://www.instagram.com/thearctichustle" target="_blank" rel="noreferrer" style={{ background:'linear-gradient(135deg,#E1306C,#833AB4)', color:'#fff', padding:'10px 20px', borderRadius:6, ...F, fontWeight:700, fontSize:13, letterSpacing:1, textDecoration:'none' }}>INSTAGRAM →</a>
                </div>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                {tournaments.map((t) => {
                  const isLive   = t.status === 'ongoing';
                  const raceDate = t.date ? new Date(t.date) : null;
                  const myCount  = myEntriesFor(t.id).length;
                  const total    = allEntriesFor(t.id).length;
                  const cats: string[] = t.race_categories || [];

                  return (
                    <div key={t.id} style={{ background: isLive ? 'linear-gradient(135deg,#071426,#0a1f0a)' : '#071426', border:`1.5px solid ${isLive ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.08)'}`, borderRadius:14, overflow:'hidden' }}>
                      {isLive && <div style={{ height:3, background:'#22C55E' }}/>}
                      {t.image_url && (
                        <div style={{ height: 160, overflow: 'hidden' }}>
                          <img src={t.image_url} alt={t.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      )}
                      <div style={{ padding:'20px 24px' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12, flexWrap:'wrap' }}>
                          <div style={{ flex:1 }}>
                            {/* Badges */}
                            <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:8 }}>
                              <span style={{ ...F, fontSize:10, letterSpacing:2, padding:'2px 10px', borderRadius:20, background: isLive ? 'rgba(34,197,94,0.15)' : 'rgba(59,130,246,0.15)', color: isLive ? '#22C55E' : '#3B82F6' }}>
                                {isLive ? '🔴 LIVE NOW' : '🗓️ UPCOMING'}
                              </span>
                              {cats.map(cat => {
                                const cc = RACE_CLASSES.find(c => c.label === cat);
                                return (
                                  <span key={cat} style={{ ...F, fontSize:9, letterSpacing:1, padding:'2px 8px', borderRadius:20, background:(cc?.color||'#6B7280')+'22', color:cc?.color||'#B8C1CC', border:`1px solid ${cc?.color||'#6B7280'}44` }}>{cc ? cc.icon+' ' : ''}{cat.toUpperCase()}</span>
                                );
                              })}
                            </div>
                            <div style={{ ...F, fontWeight:900, fontSize:24, color:'#F5F5F5', marginBottom:4 }}>{t.name}</div>
                            <div style={{ ...FB, fontSize:13, color:'#B8C1CC', display:'flex', flexWrap:'wrap', gap:12, marginBottom:8 }}>
                              {raceDate && <span>📅 {raceDate.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'long',year:'numeric'})}</span>}
                              {t.location && <span>📍 {t.location}</span>}
                            </div>

                            {/* My confirmed entries for this race */}
                            {loggedIn && myCount > 0 && (
                              <div style={{ display:'flex', flexDirection:'column', gap:5, marginTop:8 }}>
                                {myEntriesFor(t.id).map(entry => {
                                  const cls = RACE_CLASSES.find(c=>c.id===entry.race_category);
                                  return (
                                    <div key={entry.id} style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(34,197,94,0.08)', border:'1px solid rgba(34,197,94,0.2)', borderRadius:8, padding:'7px 12px' }}>
                                      <span style={{ ...F, fontSize:12, color:'#22C55E' }}>✅ {entry.car_name}</span>
                                      <span style={{ ...F, fontSize:10, color:'#B8C1CC', letterSpacing:1 }}>→ {cls?.label || entry.race_category}</span>
                                      <button onClick={()=>withdrawEntry(entry.id)} style={{ marginLeft:'auto', background:'none', border:'none', color:'#DC2626', ...FB, fontSize:11, cursor:'pointer' }}>✕ Withdraw</button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {/* Right side */}
                          <div style={{ textAlign:'right', flexShrink:0 }}>
                            {t.ticket_price_dkk && <div style={{ ...F, fontWeight:900, fontSize:28, color:'#FACC15' }}>{t.ticket_price_dkk} DKK</div>}
                            <div style={{ ...FB, fontSize:11, color:'#B8C1CC', marginBottom:8 }}>
                              {t.ticket_type === 'season' ? '⚠️ Min 2 racers to proceed' : '⚠️ Min 5 per category or pushed to next week'}
                            </div>
                            <div style={{ display:'flex', flexDirection:'column', gap:8, alignItems:'flex-end' }}>
                              {/* View Entrants button */}
                              <button onClick={()=>openEntrantsModal(t)}
                                style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:8, padding:'8px 16px', ...F, fontWeight:700, fontSize:12, letterSpacing:1, color:'#B8C1CC', cursor:'pointer' }}>
                                👥 {total} ENTRANT{total !== 1 ? 'S' : ''} →
                              </button>
                              {!FEATURE_FLAGS.onlineRaceTicketsEnabled ? (
                                // Race entry is in-person only — no online ticket gating.
                                // The public site only offers a free attendance RSVP here.
                                loggedIn ? (
                                  <a href="/tickets" style={{ display:'inline-block', background:'#DC2626', color:'#fff', borderRadius:8, padding:'10px 20px', ...F, fontWeight:900, fontSize:13, letterSpacing:1, textDecoration:'none' }}>
                                    RSVP →
                                  </a>
                                ) : (
                                  <a href="/register" style={{ display:'inline-block', background:'#DC2626', color:'#fff', borderRadius:8, padding:'10px 20px', ...F, fontWeight:900, fontSize:13, letterSpacing:1, textDecoration:'none' }}>
                                    REGISTER →
                                  </a>
                                )
                              ) : loggedIn ? (
                                (() => {
                                  // Legacy ticket-gated entry — discontinued, preserved only
                                  // as an emergency rollback behind onlineRaceTicketsEnabled.
                                  // Match tickets to tournament type
                                  const tType = t.ticket_type || 'weekly';
                                  const matchingTickets = myTickets.filter(tk =>
                                    tType === 'season' ? tk.ticket_type === 'season' :
                                    tk.ticket_type === 'weekly' || tk.ticket_type === 'weekly_earlybird'
                                  );
                                  const matchingUsed = myEntries.filter(e => e.tournament_id === t.id).length;
                                  const matchingAvail = matchingTickets.reduce((s,tk)=>s+(Number(tk.quantity)||1),0) - matchingUsed;
                                  if (matchingAvail > 0) return (
                                    <button onClick={()=>openRegModal(t)} style={{ background:'#DC2626', color:'#fff', border:'none', borderRadius:8, padding:'10px 20px', ...F, fontWeight:900, fontSize:13, letterSpacing:1, cursor:'pointer' }}>
                                      ENTER RACE →
                                    </button>
                                  );
                                  if (myTotalTickets > 0 && matchingAvail <= 0) return (
                                    <div style={{ textAlign:'right' }}>
                                      <a href="/tickets" style={{ display:'inline-block', background:'rgba(220,38,38,0.15)', color:'#DC2626', border:'1px solid rgba(220,38,38,0.3)', borderRadius:8, padding:'8px 14px', ...F, fontWeight:700, fontSize:11, letterSpacing:1, textDecoration:'none' }}>
                                        {tType === 'season' ? 'NEED SEASON TICKET' : 'NEED WEEKLY TICKET'}
                                      </a>
                                    </div>
                                  );
                                  return (
                                    <a href="/tickets" style={{ display:'inline-block', background:'rgba(220,38,38,0.15)', color:'#DC2626', border:'1px solid rgba(220,38,38,0.3)', borderRadius:8, padding:'10px 20px', ...F, fontWeight:700, fontSize:12, letterSpacing:1, textDecoration:'none' }}>
                                      BUY TICKET FIRST
                                    </a>
                                  );
                                })()
                              ) : (
                                <a href="/register" style={{ display:'inline-block', background:'#DC2626', color:'#fff', borderRadius:8, padding:'10px 20px', ...F, fontWeight:900, fontSize:13, letterSpacing:1, textDecoration:'none' }}>
                                  REGISTER →
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Race Classes */}
          <section style={{ marginBottom:64 }}>
            <div style={{ ...F, fontSize:11, letterSpacing:5, color:'#DC2626', marginBottom:8 }}>CLASSES</div>
            <h2 style={{ ...F, fontWeight:900, fontSize:'clamp(32px,6vw,52px)', margin:'0 0 24px' }}>RACE CATEGORIES</h2>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:16 }}>
              {RACE_CLASSES.map(cls => (
                <div key={cls.id} style={{ background:'#071426', border:`1px solid ${cls.color}33`, borderRadius:14, padding:'24px 20px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                    <span style={{ fontSize:24 }}>{cls.icon}</span>
                    <span style={{ ...F, fontWeight:900, fontSize:20, color:cls.color }}>{cls.label}</span>
                  </div>
                  <div style={{ ...FB, fontSize:14, color:'#B8C1CC', lineHeight:1.6 }}>{cls.desc}</div>
                </div>
              ))}
            </div>
          </section>

          {/* General Rules */}
          <section style={{ marginBottom:64 }}>
            <div style={{ ...F, fontSize:11, letterSpacing:5, color:'#DC2626', marginBottom:8 }}>GENERAL RULES</div>
            <h2 style={{ ...F, fontWeight:900, fontSize:'clamp(32px,6vw,52px)', margin:'0 0 32px' }}>HOW RACING WORKS</h2>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:16 }}>
              {[
                { icon:'🏁', title:'Pay In Person', desc:'Race entry is paid in person at check-in — 150 DKK weekly / 500 DKK big event. Each entry covers 1 car in 1 race category.' },
                { icon:'🏁', title:'Qualification Format', desc:'2 timed runs per entry. Best run counts. Top qualifiers advance to single-elimination finals.' },
                { icon:'⚡', title:'Single Elimination Finals', desc:'Head-to-head racing. Win or go home. No second chances.' },
                { icon:'🔄', title:'Multi-Category Entry', desc:"Same car can enter multiple categories in one race day, but not the same category twice. One racer can enter multiple cars into the same category." },
                { icon:'🔋', title:'Alkaline AA Only', desc:'Standard Alkaline AA batteries only. No NiMH, lithium, or rechargeable batteries.' },
                { icon:'👤', title:'Racer Profile Required', desc:'Tournament entry requires a registered Racer Profile and an approved car with a Club Car ID.' },
              ].map(r => (
                <div key={r.title} style={{ background:'#071426', border:'1px solid rgba(255,255,255,0.06)', borderRadius:14, padding:'24px 20px' }}>
                  <div style={{ fontSize:28, marginBottom:12 }}>{r.icon}</div>
                  <div style={{ ...F, fontWeight:800, fontSize:18, color:'#F5F5F5', marginBottom:8 }}>{r.title}</div>
                  <div style={{ ...FB, fontSize:14, color:'#B8C1CC', lineHeight:1.6 }}>{r.desc}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Prize Pool */}
          <section style={{ marginBottom:64 }}>
            <div style={{ ...F, fontSize:11, letterSpacing:5, color:'#DC2626', marginBottom:8 }}>70/30 SPLIT</div>
            <h2 style={{ ...F, fontWeight:900, fontSize:'clamp(32px,6vw,52px)', margin:'0 0 8px' }}>PRIZE POOL</h2>
            <p style={{ ...FB, fontSize:15, color:'#B8C1CC', margin:'0 0 32px' }}>70% of confirmed in-person race-entry fees goes to the prize pool. Second Life payments don't contribute.</p>
            <PrizeCalculator />
          </section>

          {/* Rentals */}
          <section style={{ marginBottom:64 }}>
            <div style={{ ...F, fontSize:11, letterSpacing:5, color:'#DC2626', marginBottom:8 }}>RENTALS</div>
            <h2 style={{ ...F, fontWeight:900, fontSize:'clamp(32px,6vw,52px)', margin:'0 0 32px' }}>HOUSE CARS & BATTERIES</h2>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:16 }}>
              <div style={{ background:'#071426', border:'1px solid rgba(250,204,21,0.2)', borderRadius:14, padding:'24px 20px' }}>
                <div style={{ fontSize:28, marginBottom:12 }}>🚗</div>
                <div style={{ ...F, fontWeight:800, fontSize:18, color:'#FACC15', marginBottom:4 }}>House Car Rental</div>
                <div style={{ ...F, fontWeight:900, fontSize:32, color:'#FACC15', marginBottom:8 }}>69 kr/hr</div>
                <div style={{ ...FB, fontSize:14, color:'#B8C1CC', lineHeight:1.6 }}>Batteries included. Try before you buy.</div>
              </div>
              <div style={{ background:'#0a0a0a', border:'1px solid rgba(255,255,255,0.05)', borderRadius:14, padding:'24px 20px', opacity:0.5 }}>
                <div style={{ fontSize:28, marginBottom:12, filter:'grayscale(1)' }}>🔋</div>
                <div style={{ ...F, fontWeight:800, fontSize:18, color:'#6B7280', marginBottom:4 }}>Battery Rental Only</div>
                <div style={{ ...F, fontWeight:900, fontSize:20, color:'#6B7280', marginBottom:8, letterSpacing:1 }}>COMING SOON</div>
                <div style={{ ...FB, fontSize:14, color:'#4B5563', lineHeight:1.6 }}>For testing your own car. Not yet available.</div>
              </div>
            </div>
          </section>

          {/* CTA */}
          <section style={{ background:'#071426', border:'1px solid rgba(220,38,38,0.2)', borderRadius:16, padding:'40px 32px', textAlign:'center' }}>
            <div style={{ ...F, fontSize:11, letterSpacing:5, color:'#DC2626', marginBottom:12 }}>READY TO RACE?</div>
            <h2 style={{ ...F, fontWeight:900, fontSize:'clamp(32px,7vw,56px)', margin:'0 0 16px' }}>JOIN THE CLUB</h2>
            <p style={{ ...FB, fontSize:15, color:'#B8C1CC', maxWidth:480, margin:'0 auto 28px', lineHeight:1.7 }}>Register free, get your car approved, RSVP, and pay in person to race in Nuuk.</p>
            <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
              {loggedIn ? (
                <><a href="/tickets" style={{ background:'#DC2626', color:'#fff', padding:'14px 32px', borderRadius:10, ...F, fontWeight:900, fontSize:17, letterSpacing:2, textDecoration:'none' }}>{FEATURE_FLAGS.onlineRaceTicketsEnabled ? '🎟️ BUY TICKETS →' : '🏁 RSVP FOR RACE DAY →'}</a>
                <a href="/profile?tab=garage" style={{ background:'transparent', color:'#F5F5F5', padding:'14px 32px', borderRadius:10, ...F, fontWeight:700, fontSize:17, letterSpacing:2, textDecoration:'none', border:'1px solid rgba(255,255,255,0.15)' }}>MY GARAGE</a></>
              ) : (
                <><a href="/register" style={{ background:'#DC2626', color:'#fff', padding:'14px 32px', borderRadius:10, ...F, fontWeight:900, fontSize:17, letterSpacing:2, textDecoration:'none' }}>REGISTER FREE →</a>
                <a href="/tickets" style={{ background:'transparent', color:'#F5F5F5', padding:'14px 32px', borderRadius:10, ...F, fontWeight:700, fontSize:17, letterSpacing:2, textDecoration:'none', border:'1px solid rgba(255,255,255,0.15)' }}>{FEATURE_FLAGS.onlineRaceTicketsEnabled ? 'VIEW TICKETS' : 'VIEW RACE DAY INFO'}</a></>
              )}
            </div>
          </section>

        </div>
      </main>
      <Footer />

      {/* ── ENTRANTS MODAL (per tournament) ── */}
      {entrantsModal && entrantsTournament && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.88)', zIndex:1000, display:'flex', alignItems:'flex-end', justifyContent:'center' }} onClick={e=>{ if(e.target===e.currentTarget) setEntrantsModal(false); }}>
          <div style={{ background:'#071426', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'16px 16px 0 0', width:'100%', maxWidth:540, maxHeight:'80vh', overflow:'hidden', display:'flex', flexDirection:'column' }}>
            {/* Header */}
            <div style={{ padding:'24px 24px 16px', borderBottom:'1px solid rgba(255,255,255,0.06)', flexShrink:0 }}>
              <div style={{ ...F, fontSize:10, letterSpacing:4, color:'#DC2626', marginBottom:4 }}>CONFIRMED ENTRANTS</div>
              <div style={{ ...F, fontWeight:900, fontSize:22, color:'#F5F5F5', marginBottom:2 }}>{entrantsTournament.name}</div>
              <div style={{ ...FB, fontSize:13, color:'#B8C1CC' }}>
                {entrantsTournament.date && new Date(entrantsTournament.date).toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'long'})}
                {entrantsTournament.location && ` · ${entrantsTournament.location}`}
              </div>
            </div>
            {/* Entrant list */}
            <div style={{ overflowY:'auto', flex:1, padding:'12px 16px 24px' }}>
              {allEntriesFor(entrantsTournament.id).length === 0 ? (
                <div style={{ textAlign:'center', padding:'40px 20px', ...FB, color:'#6B7280' }}>
                  <div style={{ fontSize:32, marginBottom:8 }}>🏁</div>
                  No entrants yet. Be the first to enter!
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {allEntriesFor(entrantsTournament.id).map((e, i) => {
                    const cls    = RACE_CLASSES.find(c=>c.id===e.race_category);
                    const isTop3 = i < 3;
                    const crown  = i===0 ? '👑' : i===1 ? '🥈' : '🥉';
                    const carImg = carImages[e.car_id];
                    return (
                      <button key={e.id} onClick={()=>{ openFighter(e); setEntrantsModal(false); }}
                        style={{ background: isTop3 ? 'rgba(250,204,21,0.05)' : 'rgba(255,255,255,0.03)', border:`1px solid ${isTop3 ? 'rgba(250,204,21,0.15)' : 'rgba(255,255,255,0.06)'}`, borderRadius:10, padding:'12px 14px', display:'flex', alignItems:'center', gap:10, cursor:'pointer', textAlign:'left', width:'100%' }}>
                        <div style={{ width:26, height:26, borderRadius:'50%', background: isTop3 ? '#FACC15' : '#1a1a2e', display:'flex', alignItems:'center', justifyContent:'center', ...F, fontWeight:900, fontSize:12, color: isTop3 ? '#111' : '#B8C1CC', flexShrink:0 }}>
                          {isTop3 ? crown : i+1}
                        </div>
                        <div style={{ width:38, height:38, borderRadius:8, background:'#050505', border:'1px solid rgba(255,255,255,0.08)', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                          {carImg ? <img src={carImg} alt={e.car_name} style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : <span style={{ fontSize:16 }}>🏎️</span>}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ ...F, fontWeight:700, fontSize:15, color:'#F5F5F5', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{safeName(e.member_name)}</div>
                          <div style={{ ...FB, fontSize:11, color:'#B8C1CC', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>🏎️ {e.car_name} · {e.chassis}</div>
                        </div>
                        {cls && <span style={{ ...F, fontSize:9, letterSpacing:1, padding:'3px 9px', borderRadius:20, background:cls.color+'22', color:cls.color, border:`1px solid ${cls.color}44`, flexShrink:0 }}>{cls.icon} {cls.label.toUpperCase()}</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div style={{ padding:'12px 16px 28px', borderTop:'1px solid rgba(255,255,255,0.06)', flexShrink:0 }}>
              <button onClick={()=>setEntrantsModal(false)} style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, padding:13, ...F, fontWeight:700, fontSize:15, color:'#F5F5F5', cursor:'pointer', letterSpacing:1 }}>CLOSE</button>
            </div>
          </div>
        </div>
      )}

      {/* ── RACE ENTRY MODAL ── */}
      {regModal && regTournament && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.88)', zIndex:1000, display:'flex', alignItems:'flex-end', justifyContent:'center' }} onClick={e=>{ if(e.target===e.currentTarget) setRegModal(false); }}>
          <div style={{ background:'#071426', border:'1px solid rgba(220,38,38,0.3)', borderRadius:'16px 16px 0 0', width:'100%', maxWidth:540, padding:'32px 24px 40px', maxHeight:'90vh', overflowY:'auto' }}>
            <div style={{ ...F, fontSize:11, letterSpacing:4, color:'#DC2626', marginBottom:6 }}>ENTER RACE</div>
            <div style={{ ...F, fontWeight:900, fontSize:24, color:'#F5F5F5', marginBottom:4 }}>{regTournament.name}</div>
            <div style={{ ...FB, fontSize:13, color:'#B8C1CC', marginBottom:24 }}>
              You have <strong style={{ color:'#22C55E' }}>{availableTickets}</strong> available ticket{availableTickets!==1?'s':''}
            </div>

            {/* Car select */}
            <div style={{ marginBottom:16 }}>
              <label style={{ ...F, fontSize:11, letterSpacing:3, color:'#B8C1CC', display:'block', marginBottom:8 }}>SELECT YOUR CAR</label>
              {myCars.length === 0 ? (
                <div style={{ background:'rgba(220,38,38,0.08)', border:'1px solid rgba(220,38,38,0.2)', borderRadius:10, padding:16, ...FB, fontSize:13, color:'#DC2626' }}>
                  ⚠️ No approved cars. <a href="/profile?tab=garage" style={{ color:'#FACC15' }}>Register a car first →</a>
                </div>
              ) : myCars.map(car => (
                <button key={car.id} onClick={()=>setRegCar(car.id)}
                  style={{ background: regCar===car.id ? 'rgba(220,38,38,0.15)' : 'rgba(255,255,255,0.03)', border:`1.5px solid ${regCar===car.id?'#DC2626':'rgba(255,255,255,0.08)'}`, borderRadius:10, padding:'12px 16px', display:'flex', alignItems:'center', gap:12, cursor:'pointer', textAlign:'left', width:'100%', marginBottom:8 }}>
                  <div style={{ width:36, height:36, borderRadius:8, background:'#050505', border:'1px solid rgba(255,255,255,0.08)', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    {car.image_url ? <img src={car.image_url} alt={car.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : <span style={{ fontSize:18 }}>🏎️</span>}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ ...F, fontWeight:700, fontSize:16, color:'#F5F5F5', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{car.name}</div>
                    <div style={{ ...FB, fontSize:12, color:'#B8C1CC' }}>{car.chassis} · {car.series||'No series'}</div>
                  </div>
                  {regCar===car.id && <span style={{ color:'#DC2626', fontSize:18, flexShrink:0 }}>✓</span>}
                </button>
              ))}
            </div>

            {/* Category select — only categories tagged on THIS tournament */}
            <div style={{ marginBottom:24 }}>
              <label style={{ ...F, fontSize:11, letterSpacing:3, color:'#B8C1CC', display:'block', marginBottom:8 }}>SELECT RACE CATEGORY</label>
              {(() => {
                const tournamentCats: string[] = regTournament.race_categories || [];
                const availableClasses = tournamentCats.length > 0
                  ? RACE_CLASSES.filter(cls => tournamentCats.includes(cls.label))
                  : RACE_CLASSES; // fallback: show all if tournament has no tags set
                return availableClasses;
              })().map(cls => {
                const already = myEntries.some(e=>e.tournament_id===regTournament.id && e.car_id===regCar && e.race_category===cls.id);
                return (
                  <button key={cls.id} onClick={()=>!already && setRegCategory(cls.id)} disabled={already}
                    style={{ background: regCategory===cls.id ? `${cls.color}22` : 'rgba(255,255,255,0.03)', border:`1.5px solid ${regCategory===cls.id?cls.color:'rgba(255,255,255,0.08)'}`, borderRadius:10, padding:'12px 16px', display:'flex', alignItems:'center', gap:12, cursor:already?'not-allowed':'pointer', textAlign:'left', width:'100%', marginBottom:8, opacity:already?0.4:1 }}>
                    <span style={{ fontSize:20 }}>{cls.icon}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ ...F, fontWeight:700, fontSize:16, color:cls.color }}>{cls.label}</div>
                      <div style={{ ...FB, fontSize:11, color:'#B8C1CC' }}>{cls.short}</div>
                    </div>
                    {already && <span style={{ ...F, fontSize:10, color:'#6B7280', letterSpacing:1 }}>ENTERED</span>}
                    {regCategory===cls.id && <span style={{ color:cls.color, fontSize:18 }}>✓</span>}
                  </button>
                );
              })}
            </div>

            {regError && <div style={{ background:'rgba(220,38,38,0.1)', border:'1px solid rgba(220,38,38,0.3)', borderRadius:8, padding:'12px 16px', ...FB, fontSize:13, color:'#DC2626', marginBottom:16 }}>{regError}</div>}
            {regSuccess && <div style={{ background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.3)', borderRadius:8, padding:'12px 16px', ...FB, fontSize:13, color:'#22C55E', marginBottom:16 }}>{regSuccess}</div>}

            <div style={{ display:'flex', gap:10 }}>
              <button onClick={submitEntry} disabled={regSaving||!regCar||!regCategory||myCars.length===0}
                style={{ flex:1, background:'#DC2626', color:'#fff', border:'none', borderRadius:10, padding:14, ...F, fontWeight:900, fontSize:16, letterSpacing:2, cursor:'pointer', opacity:regSaving||!regCar||!regCategory?0.5:1 }}>
                {regSaving ? 'ENTERING...' : 'CONFIRM ENTRY →'}
              </button>
              <button onClick={()=>setRegModal(false)} style={{ background:'none', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, padding:'14px 20px', ...FB, color:'#B8C1CC', fontSize:14, cursor:'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── FIGHTER CARD MODAL ── */}
      {fighter && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.92)', zIndex:1100, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={e=>{ if(e.target===e.currentTarget) setFighter(null); }}>
          <div style={{ background:'#071426', border:'1px solid rgba(220,38,38,0.3)', borderRadius:16, width:'100%', maxWidth:400, overflow:'hidden' }}>
            <div style={{ height:4, background: RACE_CLASSES.find(c=>c.id===fighter.race_category)?.color||'#DC2626' }}/>
            <div style={{ padding:'28px 24px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:20 }}>
                <div style={{ width:64, height:64, borderRadius:'50%', background:'#DC2626', display:'flex', alignItems:'center', justifyContent:'center', ...F, fontWeight:900, fontSize:28, color:'#fff', flexShrink:0 }}>
                  {safeName(fighter.member_name)[0].toUpperCase()}
                </div>
                <div style={{ minWidth:0 }}>
                  <div style={{ ...F, fontWeight:900, fontSize:26, color:'#F5F5F5', lineHeight:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{safeName(fighter.member_name)}</div>
                  <div style={{ ...FB, fontSize:13, color:'#B8C1CC', marginTop:4 }}>Confirmed Entrant</div>
                </div>
              </div>

              {carImages[fighter.car_id] && (
                <div style={{ marginBottom:18, borderRadius:10, overflow:'hidden', border:'1px solid rgba(255,255,255,0.08)', background:'#050505' }}>
                  <img src={carImages[fighter.car_id]} alt={fighter.car_name} style={{ width:'100%', maxHeight:170, objectFit:'contain', display:'block' }} />
                </div>
              )}

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:20 }}>
                {[
                  { label:'CAR',      val:fighter.car_name||'—',   color:'#F5F5F5' },
                  { label:'CHASSIS',  val:fighter.chassis||'—',    color:'#FACC15' },
                  { label:'CATEGORY', val:RACE_CLASSES.find(c=>c.id===fighter.race_category)?.label||fighter.race_category, color:RACE_CLASSES.find(c=>c.id===fighter.race_category)?.color||'#DC2626' },
                  { label:'STATUS',   val:'✅ CONFIRMED',            color:'#22C55E' },
                ].map(s=>(
                  <div key={s.label} style={{ background:'rgba(255,255,255,0.04)', borderRadius:8, padding:'12px 14px' }}>
                    <div style={{ ...F, fontSize:10, letterSpacing:3, color:'#6B7280', marginBottom:4 }}>{s.label}</div>
                    <div style={{ ...F, fontWeight:700, fontSize:16, color:s.color }}>{s.val}</div>
                  </div>
                ))}
              </div>
              {/* Cars */}
              {fighterCars.length > 0 && (
                <div style={{ marginBottom:16 }}>
                  <div style={{ ...F, fontSize:10, letterSpacing:3, color:'#6B7280', marginBottom:8 }}>GARAGE CARS</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    {fighterCars.map(car => (
                      <div key={car.id} style={{ background:'rgba(255,255,255,0.04)', borderRadius:8, padding:'10px 14px', display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ width:30, height:30, borderRadius:6, background:'#050505', border:'1px solid rgba(255,255,255,0.06)', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                          {car.image_url ? <img src={car.image_url} alt={car.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : <span style={{ fontSize:16 }}>🏎️</span>}
                        </div>
                        <div style={{ minWidth:0 }}>
                          <div style={{ ...F, fontWeight:700, fontSize:14, color:'#F5F5F5', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{car.name}</div>
                          <div style={{ ...FB, fontSize:11, color:'#B8C1CC' }}>{car.chassis}{car.series ? ` · ${car.series}` : ''}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ ...FB, fontSize:12, color:'#6B7280', textAlign:'center', marginBottom:16 }}>Win records appear after first race</div>
              <button onClick={()=>{ setFighter(null); setEntrantsModal(true); }} style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, padding:12, ...F, fontWeight:700, fontSize:15, color:'#F5F5F5', cursor:'pointer', letterSpacing:1 }}>
                ← BACK TO ENTRANTS
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
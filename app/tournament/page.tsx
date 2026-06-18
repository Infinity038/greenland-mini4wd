// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { isRegistered, getMemberData } from '@/lib/member';
import { supabase } from '@/lib/supabase';

const F  = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
const FB = { fontFamily: "'DM Sans', sans-serif" } as const;

const RACE_CLASSES = [
  {
    id: 'boxstock',
    label: 'Box Stock',
    color: '#22C55E',
    icon: '📦',
    short: 'Pure stock — box contents only.',
    desc: 'Contents inside the box are fixed. Starter pack or advance pack upgrades are not included. What comes in the box is what you use — no modifications allowed.',
  },
  {
    id: 'open_boxstock',
    label: 'Open Box Stock',
    color: '#3B82F6',
    icon: '🔓',
    short: 'Box stock with limited cosmetic replacements.',
    desc: 'Same as Box Stock, but with limited replacement options. Allowed: mag color, cowl color, chassis color. Replacement permitted only for appearance or damage repair. You cannot change the type — only the color. Example: spiral mags cannot be replaced with spoke mags. Soft tires cannot be replaced with hard tires.',
  },
  {
    id: 'bmax',
    label: 'B-Max',
    color: '#F97316',
    icon: '⚡',
    short: 'Advanced builds with slide damper gimmicks.',
    desc: 'Carbon allowed, gimmicks allowed. Slide damper systems permitted. Competitive tuning category for experienced builders.',
  },
  {
    id: 'open',
    label: 'Open Class',
    color: '#DC2626',
    icon: '🔥',
    short: 'Unlimited builds — anything goes.',
    desc: 'No restrictions on modifications, motors, or parts. Full performance tuning allowed. The most competitive class on the track.',
  },
];

function PrizeCalculator() {
  const [paidTickets, setPaidTickets]   = useState(20);
  const [bonusTickets, setBonusTickets] = useState(0);
  const [ticketPrice, setTicketPrice]   = useState(150);

  const totalPaid    = paidTickets * ticketPrice;
  const prizePool    = Math.round(totalPaid * 0.70);
  const organizer    = Math.round(totalPaid * 0.30);
  const first        = Math.round(prizePool * 0.65);
  const second       = Math.round(prizePool * 0.25);
  const third        = Math.round(prizePool * 0.10);
  const totalEntries = paidTickets + bonusTickets;

  const inp = {
    background: '#0D1B2A', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8, padding: '12px 16px', color: '#F5F5F5',
    fontSize: 20, fontWeight: 700, width: '100%', outline: 'none',
    fontFamily: "'Barlow Condensed', sans-serif", boxSizing: 'border-box',
  };

  return (
    <div style={{ background: '#071426', border: '1px solid rgba(220,38,38,0.25)', borderRadius: 16, padding: '32px 28px' }}>
      <div style={{ ...F, fontSize: 11, letterSpacing: 5, color: '#DC2626', marginBottom: 6 }}>LIVE CALCULATOR</div>
      <h3 style={{ ...F, fontWeight: 900, fontSize: 28, color: '#F5F5F5', margin: '0 0 24px' }}>PRIZE POOL ESTIMATOR</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'TICKET PRICE (DKK)', key: 'price', val: ticketPrice, set: setTicketPrice, min: 50, max: 500 },
          { label: 'PAID ENTRIES',       key: 'paid',  val: paidTickets,  set: setPaidTickets,  min: 2,  max: 100 },
          { label: 'BONUS TICKETS',      key: 'bonus', val: bonusTickets, set: setBonusTickets, min: 0,  max: 20 },
        ].map(f => (
          <div key={f.key}>
            <div style={{ ...F, fontSize: 11, letterSpacing: 3, color: '#B8C1CC', marginBottom: 8 }}>{f.label}</div>
            <input style={inp} type="number" min={f.min} max={f.max} value={f.val} onChange={e => f.set(Number(e.target.value))} />
            {f.key === 'bonus' && <div style={{ ...FB, fontSize: 11, color: '#6B7280', marginTop: 4 }}>Bonus tickets don't add to prize pool</div>}
          </div>
        ))}
      </div>
      <div style={{ background: '#050505', borderRadius: 12, padding: 20, marginBottom: 16 }}>
        {[
          { label: 'Total entries',         val: totalEntries,             color: '#F5F5F5' },
          { label: 'Paid ticket revenue',   val: `${totalPaid.toLocaleString()} DKK`, color: '#F5F5F5' },
          { label: 'Organizer fund (30%)',  val: `${organizer.toLocaleString()} DKK`, color: '#B8C1CC' },
        ].map(r => (
          <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ ...FB, color: '#B8C1CC', fontSize: 14 }}>{r.label}</span>
            <span style={{ ...F, fontWeight: 700, color: r.color, fontSize: 16 }}>{r.val}</span>
          </div>
        ))}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '12px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ ...F, fontSize: 16, letterSpacing: 2, color: '#FACC15' }}>PRIZE POOL (70%)</span>
          <span style={{ ...F, fontWeight: 900, fontSize: 24, color: '#FACC15' }}>{prizePool.toLocaleString()} DKK</span>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {[
          { place: '🥇 1ST', pct: '65%', val: first,  color: '#FACC15' },
          { place: '🥈 2ND', pct: '25%', val: second, color: '#B8C1CC' },
          { place: '🥉 3RD', pct: '10%', val: third,  color: '#CD7F32' },
        ].map(r => (
          <div key={r.place} style={{ background: '#050505', borderRadius: 10, padding: '16px 12px', textAlign: 'center', border: `1px solid ${r.color}22` }}>
            <div style={{ ...F, fontSize: 13, color: r.color, marginBottom: 4 }}>{r.place}</div>
            <div style={{ ...F, fontWeight: 900, fontSize: 22, color: r.color }}>{r.val.toLocaleString()}</div>
            <div style={{ ...FB, fontSize: 11, color: '#6B7280' }}>DKK · {r.pct}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TournamentPage() {
  const [loggedIn, setLoggedIn]               = useState(false);
  const [member, setMember]                   = useState(null);
  const [tournaments, setTournaments]         = useState([]);
  const [allEntries, setAllEntries]           = useState([]);
  const [myCars, setMyCars]                   = useState([]);
  const [myTickets, setMyTickets]             = useState([]);
  const [myEntries, setMyEntries]             = useState([]);
  const [loading, setLoading]                 = useState(true);

  // Registration modal state
  const [regModal, setRegModal]               = useState(false);
  const [regTournament, setRegTournament]     = useState(null);
  const [regCar, setRegCar]                   = useState('');
  const [regCategory, setRegCategory]         = useState('');
  const [regTicket, setRegTicket]             = useState('');
  const [regSaving, setRegSaving]             = useState(false);
  const [regError, setRegError]               = useState('');
  const [regSuccess, setRegSuccess]           = useState('');

  // Fighter card modal state
  const [fighter, setFighter]                 = useState(null);

  useEffect(() => {
    const registered = isRegistered();
    setLoggedIn(registered);
    const local = getMemberData();
    if (local) setMember(local);

    async function load() {
      const { data: tData } = await supabase
        .from('tournaments')
        .select('*')
        .in('status', ['upcoming', 'ongoing'])
        .order('date', { ascending: true });
      setTournaments(tData || []);

      const { data: eData } = await supabase
        .from('race_entries')
        .select('*')
        .order('created_at', { ascending: true });
      setAllEntries(eData || []);

      if (local?.email) {
        const { data: carsData } = await supabase
          .from('cars')
          .select('*')
          .eq('member_email', local.email)
          .eq('status', 'approved');
        setMyCars(carsData || []);

        const { data: ticketsData } = await supabase
          .from('race_tickets')
          .select('*')
          .eq('member_email', local.email)
          .eq('payment_status', 'payment_confirmed');
        setMyTickets(ticketsData || []);

        const { data: myEntriesData } = await supabase
          .from('race_entries')
          .select('*')
          .eq('member_email', local.email);
        setMyEntries(myEntriesData || []);
      }
      setLoading(false);
    }
    load();
  }, []);

  const myTotalTickets = myTickets.reduce((sum, t) => sum + (Number(t.quantity) || 1), 0);

  // Count how many entries the member already has for a given tournament
  const myEntriesForTournament = (tid) =>
    myEntries.filter(e => e.tournament_id === tid);

  // Used ticket count: total entries already submitted
  const usedTickets = myEntries.length;
  const availableTickets = myTotalTickets - usedTickets;

  const openRegModal = (tournament) => {
    setRegTournament(tournament);
    setRegCar('');
    setRegCategory('');
    setRegTicket('');
    setRegError('');
    setRegSuccess('');
    setRegModal(true);
  };

  const submitEntry = async () => {
    if (!regCar || !regCategory) { setRegError('Please select a car and category.'); return; }
    if (availableTickets <= 0) { setRegError('No available tickets. Buy more tickets first.'); return; }

    const car = myCars.find(c => c.id === regCar);
    if (!car) { setRegError('Car not found.'); return; }

    // Check: same car can't enter same category twice in same tournament
    const duplicate = myEntries.find(e =>
      e.tournament_id === regTournament.id &&
      e.car_id === regCar &&
      e.race_category === regCategory
    );
    if (duplicate) { setRegError('This car is already entered in this category for this tournament.'); return; }

    setRegSaving(true);
    setRegError('');

    // Use oldest available confirmed ticket
    const usedTicketIds = myEntries.map(e => e.ticket_id).filter(Boolean);
    const availTicket = myTickets.find(t => !usedTicketIds.includes(t.id));

    const { error } = await supabase.from('race_entries').insert({
      tournament_id: regTournament.id,
      member_email: member.email,
      member_name: (member as any).name || member.email,
      car_id: regCar,
      car_name: car.name,
      chassis: car.chassis,
      race_category: regCategory,
      ticket_id: availTicket?.id || null,
      status: 'confirmed',
    });

    if (error) {
      setRegError('Failed to register. Please try again.');
      setRegSaving(false);
      return;
    }

    // Refresh entries
    const { data: newEntries } = await supabase.from('race_entries').select('*').eq('member_email', member.email);
    setMyEntries(newEntries || []);
    const { data: allE } = await supabase.from('race_entries').select('*').order('created_at', { ascending: true });
    setAllEntries(allE || []);

    setRegSuccess(`✅ ${car.name} entered in ${RACE_CLASSES.find(c => c.id === regCategory)?.label}!`);
    setRegSaving(false);
    setTimeout(() => { setRegModal(false); setRegSuccess(''); }, 2000);
  };

  const withdrawEntry = async (entryId) => {
    if (!confirm('Withdraw this entry? Your ticket will be returned.')) return;
    await supabase.from('race_entries').delete().eq('id', entryId);
    const { data: newEntries } = await supabase.from('race_entries').select('*').eq('member_email', member?.email);
    setMyEntries(newEntries || []);
    const { data: allE } = await supabase.from('race_entries').select('*').order('created_at', { ascending: true });
    setAllEntries(allE || []);
  };

  const recognitions = [
    { icon: '⚡', title: 'Fastest Clean Run',       desc: 'Fastest single qualifying lap without a DNF.' },
    { icon: '👥', title: 'Crowd Favorite Moment',   desc: 'Most exciting moment voted by the community.' },
    { icon: '🏎️', title: 'Best Lap Time',           desc: 'Fastest single lap recorded during the event.' },
    { icon: '🔥', title: 'Fastest Car of the Week', desc: 'Top speed across all heat runs.' },
  ];

  return (
    <>
      <Navbar />
      <main style={{ background: '#050505', color: '#F5F5F5', paddingTop: 60 }}>

        {/* Hero */}
        <section style={{ background: 'linear-gradient(180deg, #071426 0%, #050505 100%)', borderBottom: '1px solid rgba(220,38,38,0.2)', padding: '64px 24px 56px' }}>
          <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
            <div style={{ ...F, fontSize: 11, letterSpacing: 5, color: '#DC2626', marginBottom: 12 }}>WEEKLY RACE EVENT</div>
            <h1 style={{ ...F, fontWeight: 900, fontSize: 'clamp(48px, 10vw, 96px)', lineHeight: 0.9, margin: '0 0 20px' }}>
              BOX STOCK<br /><span style={{ color: '#DC2626' }}>TOURNAMENT</span>
            </h1>
            <p style={{ ...FB, fontSize: 16, color: '#B8C1CC', maxWidth: 560, margin: '0 auto 32px', lineHeight: 1.7 }}>
              Pure stock. Pure skill. Every racer on the same level — the only advantage is your driving.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              {loggedIn ? (
                <>
                  <a href="/tickets" style={{ background: '#DC2626', color: '#fff', padding: '14px 32px', borderRadius: 10, ...F, fontWeight: 900, fontSize: 17, letterSpacing: 2, textDecoration: 'none' }}>🎟️ BUY TICKETS →</a>
                  <a href="/shop" style={{ background: 'transparent', color: '#F5F5F5', padding: '14px 32px', borderRadius: 10, ...F, fontWeight: 700, fontSize: 17, letterSpacing: 2, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.15)' }}>GET YOUR CAR</a>
                </>
              ) : (
                <>
                  <a href="/register" style={{ background: '#DC2626', color: '#fff', padding: '14px 32px', borderRadius: 10, ...F, fontWeight: 900, fontSize: 17, letterSpacing: 2, textDecoration: 'none' }}>REGISTER FREE FIRST →</a>
                  <a href="/tickets" style={{ background: 'transparent', color: '#F5F5F5', padding: '14px 32px', borderRadius: 10, ...F, fontWeight: 700, fontSize: 17, letterSpacing: 2, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.15)' }}>VIEW TICKETS</a>
                </>
              )}
            </div>
          </div>
        </section>

        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '60px 24px' }}>

          {/* Upcoming Tournaments */}
          <section style={{ marginBottom: 64 }}>
            <div style={{ ...F, fontSize: 11, letterSpacing: 5, color: '#DC2626', marginBottom: 8 }}>SCHEDULE</div>
            <h2 style={{ ...F, fontWeight: 900, fontSize: 'clamp(32px, 6vw, 52px)', margin: '0 0 24px' }}>UPCOMING RACES</h2>

            {loading ? (
              <div style={{ ...FB, color: '#B8C1CC', fontSize: 14, padding: '40px 0' }}>Loading schedule...</div>
            ) : tournaments.length === 0 ? (
              <div style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '40px 28px', textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🏁</div>
                <div style={{ ...F, fontWeight: 900, fontSize: 22, color: '#F5F5F5', marginBottom: 8 }}>NEXT RACE BEING SCHEDULED</div>
                <div style={{ ...FB, fontSize: 14, color: '#B8C1CC', maxWidth: 400, margin: '0 auto 20px' }}>
                  Race dates are announced on our Facebook and Instagram. Join to stay updated.
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <a href="https://www.facebook.com/share/g/18gBxyY1Wd/?mibextid=wwXIfr" target="_blank" rel="noreferrer" style={{ background: '#1877F2', color: '#fff', padding: '10px 20px', borderRadius: 6, ...F, fontWeight: 700, fontSize: 13, letterSpacing: 1, textDecoration: 'none' }}>FACEBOOK GROUP →</a>
                  <a href="https://www.instagram.com/thearctichustle" target="_blank" rel="noreferrer" style={{ background: 'linear-gradient(135deg, #E1306C, #833AB4)', color: '#fff', padding: '10px 20px', borderRadius: 6, ...F, fontWeight: 700, fontSize: 13, letterSpacing: 1, textDecoration: 'none' }}>INSTAGRAM →</a>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {tournaments.map((t) => {
                  const isLive      = t.status === 'ongoing';
                  const raceDate    = t.date ? new Date(t.date) : null;
                  const myCount     = myEntriesForTournament(t.id).length;
                  const totalCount  = allEntries.filter(e => e.tournament_id === t.id).length;

                  return (
                    <div key={t.id} style={{ background: isLive ? 'linear-gradient(135deg, #071426, #0a1f0a)' : '#071426', border: `1.5px solid ${isLive ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 14, overflow: 'hidden' }}>
                      {isLive && <div style={{ height: 3, background: '#22C55E' }} />}
                      <div style={{ padding: '20px 24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                              <span style={{ ...F, fontSize: 10, letterSpacing: 2, padding: '2px 10px', borderRadius: 20, background: isLive ? 'rgba(34,197,94,0.15)' : 'rgba(59,130,246,0.15)', color: isLive ? '#22C55E' : '#3B82F6' }}>
                                {isLive ? '🔴 LIVE NOW' : '🗓️ UPCOMING'}
                              </span>
                              {totalCount > 0 && (
                                <span style={{ ...F, fontSize: 10, letterSpacing: 1, padding: '2px 10px', borderRadius: 20, background: 'rgba(250,204,21,0.1)', color: '#FACC15' }}>
                                  {totalCount} ENTRANT{totalCount !== 1 ? 'S' : ''}
                                </span>
                              )}
                            </div>
                            <div style={{ ...F, fontWeight: 900, fontSize: 24, color: '#F5F5F5', marginBottom: 4 }}>{t.name}</div>
                            <div style={{ ...FB, fontSize: 13, color: '#B8C1CC', display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                              {raceDate && <span>📅 {raceDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}</span>}
                              {t.location && <span>📍 {t.location}</span>}
                            </div>
                            {/* My entries for this tournament */}
                            {loggedIn && myCount > 0 && (
                              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {myEntriesForTournament(t.id).map(entry => (
                                  <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8, padding: '8px 12px' }}>
                                    <span style={{ ...F, fontSize: 12, color: '#22C55E' }}>✅ {entry.car_name}</span>
                                    <span style={{ ...F, fontSize: 10, color: '#B8C1CC', letterSpacing: 1 }}>→ {RACE_CLASSES.find(c => c.id === entry.race_category)?.label || entry.race_category}</span>
                                    <button onClick={() => withdrawEntry(entry.id)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#DC2626', ...FB, fontSize: 11, cursor: 'pointer', padding: '2px 6px' }}>✕ Withdraw</button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            {t.ticket_price_dkk && <div style={{ ...F, fontWeight: 900, fontSize: 28, color: '#FACC15' }}>{t.ticket_price_dkk} DKK</div>}
                            {t.max_participants && <div style={{ ...FB, fontSize: 11, color: '#6B7280', marginBottom: 8 }}>Max {t.max_participants} racers</div>}
                            {loggedIn ? (
                              availableTickets > 0 ? (
                                <button onClick={() => openRegModal(t)} style={{ background: '#DC2626', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', ...F, fontWeight: 900, fontSize: 13, letterSpacing: 1, cursor: 'pointer' }}>
                                  ENTER RACE →
                                </button>
                              ) : (
                                <a href="/tickets" style={{ display: 'inline-block', background: 'rgba(220,38,38,0.15)', color: '#DC2626', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 8, padding: '10px 20px', ...F, fontWeight: 700, fontSize: 12, letterSpacing: 1, textDecoration: 'none' }}>
                                  BUY TICKET FIRST
                                </a>
                              )
                            ) : (
                              <a href="/register" style={{ display: 'inline-block', background: '#DC2626', color: '#fff', borderRadius: 8, padding: '10px 20px', ...F, fontWeight: 900, fontSize: 13, letterSpacing: 1, textDecoration: 'none' }}>
                                REGISTER →
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Confirmed Entrants */}
          {allEntries.length > 0 && (
            <section style={{ marginBottom: 64 }}>
              <div style={{ ...F, fontSize: 11, letterSpacing: 5, color: '#DC2626', marginBottom: 8 }}>WHO'S RACING</div>
              <h2 style={{ ...F, fontWeight: 900, fontSize: 'clamp(32px, 6vw, 52px)', margin: '0 0 24px' }}>CONFIRMED ENTRANTS</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {allEntries.map((e, i) => {
                  const cls = RACE_CLASSES.find(c => c.id === e.race_category);
                  const isTop3 = i < 3;
                  const crown = i === 0 ? '👑' : i === 1 ? '🥈' : '🥉';
                  return (
                    <button key={e.id} onClick={() => setFighter(e)}
                      style={{ background: '#071426', border: `1px solid ${isTop3 ? 'rgba(250,204,21,0.2)' : 'rgba(255,255,255,0.06)'}`, borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: isTop3 ? '#FACC15' : '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center', ...F, fontWeight: 900, fontSize: 14, color: isTop3 ? '#111' : '#B8C1CC', flexShrink: 0 }}>
                        {isTop3 ? crown : i + 1}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ ...F, fontWeight: 700, fontSize: 17, color: '#F5F5F5' }}>{e.member_name || e.member_email?.split('@')[0]}</div>
                        <div style={{ ...FB, fontSize: 12, color: '#B8C1CC' }}>🏎️ {e.car_name} · {e.chassis}</div>
                      </div>
                      {cls && (
                        <span style={{ ...F, fontSize: 10, letterSpacing: 1, padding: '3px 10px', borderRadius: 20, background: cls.color + '22', color: cls.color, border: `1px solid ${cls.color}44`, flexShrink: 0 }}>
                          {cls.label.toUpperCase()}
                        </span>
                      )}
                      <span style={{ ...FB, fontSize: 11, color: '#6B7280' }}>→</span>
                    </button>
                  );
                })}
              </div>
              <div style={{ ...FB, fontSize: 12, color: '#6B7280', marginTop: 12, textAlign: 'center' }}>Tap a racer to view their fighter card</div>
            </section>
          )}

          {/* Race Classes */}
          <section style={{ marginBottom: 64 }}>
            <div style={{ ...F, fontSize: 11, letterSpacing: 5, color: '#DC2626', marginBottom: 8 }}>CLASSES</div>
            <h2 style={{ ...F, fontWeight: 900, fontSize: 'clamp(32px, 6vw, 52px)', margin: '0 0 24px' }}>RACE CATEGORIES</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {RACE_CLASSES.map(cls => (
                <div key={cls.id} style={{ background: '#071426', border: `1px solid ${cls.color}33`, borderRadius: 14, padding: '24px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <span style={{ fontSize: 24 }}>{cls.icon}</span>
                    <span style={{ ...F, fontWeight: 900, fontSize: 20, color: cls.color }}>{cls.label}</span>
                  </div>
                  <div style={{ ...FB, fontSize: 14, color: '#B8C1CC', lineHeight: 1.6 }}>{cls.desc}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Race Rules */}
          <section style={{ marginBottom: 64 }}>
            <div style={{ ...F, fontSize: 11, letterSpacing: 5, color: '#DC2626', marginBottom: 8 }}>GENERAL RULES</div>
            <h2 style={{ ...F, fontWeight: 900, fontSize: 'clamp(32px, 6vw, 52px)', margin: '0 0 32px' }}>HOW RACING WORKS</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {[
                { icon: '🎟️', title: '1 Ticket = 1 Entry',       desc: 'Each ticket lets you enter 1 car into 1 race category. Use multiple tickets to enter more cars or categories.' },
                { icon: '🏁', title: 'Qualification Format',     desc: '2 timed runs per entry. Best run counts. Top qualifiers advance to single-elimination finals.' },
                { icon: '⚡', title: 'Single Elimination Finals', desc: 'Head-to-head racing. Win or go home. No second chances.' },
                { icon: '🔄', title: 'Multi-Category Entry',     desc: 'One car can enter multiple different categories in the same race day. Cannot enter the same category twice.' },
                { icon: '🔋', title: 'Alkaline AA Only',         desc: 'Standard Alkaline AA batteries only. No NiMH, lithium, or rechargeable batteries permitted.' },
                { icon: '👤', title: 'Official Members Only',    desc: 'Tournament entry requires Official Member status. Complete a qualifying purchase to unlock.' },
              ].map(r => (
                <div key={r.title} style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '24px 20px' }}>
                  <div style={{ fontSize: 28, marginBottom: 12 }}>{r.icon}</div>
                  <div style={{ ...F, fontWeight: 800, fontSize: 18, color: '#F5F5F5', marginBottom: 8 }}>{r.title}</div>
                  <div style={{ ...FB, fontSize: 14, color: '#B8C1CC', lineHeight: 1.6 }}>{r.desc}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Prize Pool */}
          <section style={{ marginBottom: 64 }}>
            <div style={{ ...F, fontSize: 11, letterSpacing: 5, color: '#DC2626', marginBottom: 8 }}>70/30 SPLIT</div>
            <h2 style={{ ...F, fontWeight: 900, fontSize: 'clamp(32px, 6vw, 52px)', margin: '0 0 8px' }}>PRIZE POOL</h2>
            <p style={{ ...FB, fontSize: 15, color: '#B8C1CC', margin: '0 0 32px' }}>70% of paid ticket sales goes directly to the prize pool. Bonus tickets do not contribute.</p>
            <PrizeCalculator />
          </section>

          {/* Rentals */}
          <section style={{ marginBottom: 64 }}>
            <div style={{ ...F, fontSize: 11, letterSpacing: 5, color: '#DC2626', marginBottom: 8 }}>RENTALS</div>
            <h2 style={{ ...F, fontWeight: 900, fontSize: 'clamp(32px, 6vw, 52px)', margin: '0 0 32px' }}>HOUSE CARS & BATTERIES</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              <div style={{ background: '#071426', border: '1px solid rgba(250,204,21,0.2)', borderRadius: 14, padding: '24px 20px' }}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>🚗</div>
                <div style={{ ...F, fontWeight: 800, fontSize: 18, color: '#FACC15', marginBottom: 4 }}>House Car Rental</div>
                <div style={{ ...F, fontWeight: 900, fontSize: 32, color: '#FACC15', marginBottom: 8 }}>25 kr/hr</div>
                <div style={{ ...FB, fontSize: 14, color: '#B8C1CC', lineHeight: 1.6 }}>Batteries included. Try before you buy. Great for first-timers and guests.</div>
              </div>
              <div style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '24px 20px' }}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>🔋</div>
                <div style={{ ...F, fontWeight: 800, fontSize: 18, color: '#F5F5F5', marginBottom: 4 }}>Battery Rental Only</div>
                <div style={{ ...F, fontWeight: 900, fontSize: 32, color: '#F5F5F5', marginBottom: 8 }}>15 kr</div>
                <div style={{ ...FB, fontSize: 14, color: '#B8C1CC', lineHeight: 1.6 }}>For testing your own car. Must be returned after session. Non-refundable if kept.</div>
              </div>
            </div>
          </section>

          {/* Recognition */}
          <section style={{ marginBottom: 64 }}>
            <div style={{ ...F, fontSize: 11, letterSpacing: 5, color: '#DC2626', marginBottom: 8 }}>COMMUNITY AWARDS</div>
            <h2 style={{ ...F, fontWeight: 900, fontSize: 'clamp(32px, 6vw, 52px)', margin: '0 0 32px' }}>SPECIAL RECOGNITION</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
              {recognitions.map(r => (
                <div key={r.title} style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '20px 18px' }}>
                  <div style={{ fontSize: 24, marginBottom: 10 }}>{r.icon}</div>
                  <div style={{ ...F, fontWeight: 800, fontSize: 16, color: '#F5F5F5', marginBottom: 6 }}>{r.title}</div>
                  <div style={{ ...FB, fontSize: 13, color: '#B8C1CC', lineHeight: 1.5 }}>{r.desc}</div>
                </div>
              ))}
            </div>
          </section>

          {/* CTA */}
          <section style={{ background: '#071426', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 16, padding: '40px 32px', textAlign: 'center' }}>
            <div style={{ ...F, fontSize: 11, letterSpacing: 5, color: '#DC2626', marginBottom: 12 }}>READY TO RACE?</div>
            <h2 style={{ ...F, fontWeight: 900, fontSize: 'clamp(32px, 7vw, 56px)', margin: '0 0 16px' }}>JOIN THE CLUB</h2>
            <p style={{ ...FB, fontSize: 15, color: '#B8C1CC', maxWidth: 480, margin: '0 auto 28px', lineHeight: 1.7 }}>
              Register free, get your car approved, buy a ticket, and race in Nuuk.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              {loggedIn ? (
                <>
                  <a href="/tickets" style={{ background: '#DC2626', color: '#fff', padding: '14px 32px', borderRadius: 10, ...F, fontWeight: 900, fontSize: 17, letterSpacing: 2, textDecoration: 'none' }}>🎟️ BUY TICKETS →</a>
                  <a href="/profile?tab=garage" style={{ background: 'transparent', color: '#F5F5F5', padding: '14px 32px', borderRadius: 10, ...F, fontWeight: 700, fontSize: 17, letterSpacing: 2, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.15)' }}>MY GARAGE</a>
                </>
              ) : (
                <>
                  <a href="/register" style={{ background: '#DC2626', color: '#fff', padding: '14px 32px', borderRadius: 10, ...F, fontWeight: 900, fontSize: 17, letterSpacing: 2, textDecoration: 'none' }}>REGISTER FREE →</a>
                  <a href="/tickets" style={{ background: 'transparent', color: '#F5F5F5', padding: '14px 32px', borderRadius: 10, ...F, fontWeight: 700, fontSize: 17, letterSpacing: 2, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.15)' }}>VIEW TICKETS</a>
                </>
              )}
            </div>
          </section>

        </div>
      </main>
      <Footer />

      {/* ── ENTRY REGISTRATION MODAL ── */}
      {regModal && regTournament && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0 0 0 0' }} onClick={e => { if (e.target === e.currentTarget) setRegModal(false); }}>
          <div style={{ background: '#071426', border: '1px solid rgba(220,38,38,0.3)', borderRadius: '16px 16px 0 0', width: '100%', maxWidth: 540, padding: '32px 24px 40px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ ...F, fontSize: 11, letterSpacing: 4, color: '#DC2626', marginBottom: 6 }}>ENTER RACE</div>
            <div style={{ ...F, fontWeight: 900, fontSize: 24, color: '#F5F5F5', marginBottom: 4 }}>{regTournament.name}</div>
            <div style={{ ...FB, fontSize: 13, color: '#B8C1CC', marginBottom: 24 }}>
              You have <strong style={{ color: '#22C55E' }}>{availableTickets}</strong> available ticket{availableTickets !== 1 ? 's' : ''}
            </div>

            {/* Select Car */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ ...F, fontSize: 11, letterSpacing: 3, color: '#B8C1CC', display: 'block', marginBottom: 8 }}>SELECT YOUR CAR</label>
              {myCars.length === 0 ? (
                <div style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 10, padding: 16, ...FB, fontSize: 13, color: '#DC2626' }}>
                  ⚠️ No approved cars in your garage. <a href="/profile?tab=garage" style={{ color: '#FACC15' }}>Register a car first →</a>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {myCars.map(car => (
                    <button key={car.id} onClick={() => setRegCar(car.id)}
                      style={{ background: regCar === car.id ? 'rgba(220,38,38,0.15)' : 'rgba(255,255,255,0.03)', border: `1.5px solid ${regCar === car.id ? '#DC2626' : 'rgba(255,255,255,0.08)'}`, borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left' }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: '#050505', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🏎️</div>
                      <div>
                        <div style={{ ...F, fontWeight: 700, fontSize: 16, color: '#F5F5F5' }}>{car.name}</div>
                        <div style={{ ...FB, fontSize: 12, color: '#B8C1CC' }}>{car.chassis} · {car.series || 'No series'}</div>
                      </div>
                      {regCar === car.id && <span style={{ marginLeft: 'auto', color: '#DC2626', fontSize: 18 }}>✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Select Category */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ ...F, fontSize: 11, letterSpacing: 3, color: '#B8C1CC', display: 'block', marginBottom: 8 }}>SELECT RACE CATEGORY</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {RACE_CLASSES.map(cls => {
                  const alreadyEntered = myEntries.some(e =>
                    e.tournament_id === regTournament.id &&
                    e.car_id === regCar &&
                    e.race_category === cls.id
                  );
                  return (
                    <button key={cls.id} onClick={() => !alreadyEntered && setRegCategory(cls.id)} disabled={alreadyEntered}
                      style={{ background: regCategory === cls.id ? `${cls.color}22` : 'rgba(255,255,255,0.03)', border: `1.5px solid ${regCategory === cls.id ? cls.color : 'rgba(255,255,255,0.08)'}`, borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: alreadyEntered ? 'not-allowed' : 'pointer', textAlign: 'left', opacity: alreadyEntered ? 0.4 : 1 }}>
                      <span style={{ fontSize: 20 }}>{cls.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ ...F, fontWeight: 700, fontSize: 16, color: cls.color }}>{cls.label}</div>
                        <div style={{ ...FB, fontSize: 11, color: '#B8C1CC' }}>{cls.short}</div>
                      </div>
                      {alreadyEntered && <span style={{ ...F, fontSize: 10, color: '#6B7280', letterSpacing: 1 }}>ENTERED</span>}
                      {regCategory === cls.id && <span style={{ color: cls.color, fontSize: 18 }}>✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {regError && <div style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 8, padding: '12px 16px', ...FB, fontSize: 13, color: '#DC2626', marginBottom: 16 }}>{regError}</div>}
            {regSuccess && <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 8, padding: '12px 16px', ...FB, fontSize: 13, color: '#22C55E', marginBottom: 16 }}>{regSuccess}</div>}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={submitEntry} disabled={regSaving || !regCar || !regCategory || myCars.length === 0}
                style={{ flex: 1, background: '#DC2626', color: '#fff', border: 'none', borderRadius: 10, padding: '14px', ...F, fontWeight: 900, fontSize: 16, letterSpacing: 2, cursor: 'pointer', opacity: regSaving || !regCar || !regCategory ? 0.5 : 1 }}>
                {regSaving ? 'ENTERING...' : 'CONFIRM ENTRY →'}
              </button>
              <button onClick={() => setRegModal(false)} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '14px 20px', ...FB, color: '#B8C1CC', fontSize: 14, cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── FIGHTER CARD MODAL ── */}
      {fighter && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={e => { if (e.target === e.currentTarget) setFighter(null); }}>
          <div style={{ background: '#071426', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 16, width: '100%', maxWidth: 400, overflow: 'hidden' }}>
            {/* Header stripe */}
            <div style={{ height: 4, background: RACE_CLASSES.find(c => c.id === fighter.race_category)?.color || '#DC2626' }} />
            <div style={{ padding: '28px 24px' }}>
              {/* Avatar + name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', ...F, fontWeight: 900, fontSize: 28, color: '#fff', flexShrink: 0 }}>
                  {(fighter.member_name || fighter.member_email || 'R')[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ ...F, fontWeight: 900, fontSize: 26, color: '#F5F5F5', lineHeight: 1 }}>{fighter.member_name || fighter.member_email?.split('@')[0]}</div>
                  <div style={{ ...FB, fontSize: 13, color: '#B8C1CC', marginTop: 4 }}>Confirmed Entrant</div>
                </div>
              </div>

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                {[
                  { label: 'CAR',      val: fighter.car_name || '—',    color: '#F5F5F5' },
                  { label: 'CHASSIS',  val: fighter.chassis  || '—',    color: '#FACC15' },
                  { label: 'CATEGORY', val: RACE_CLASSES.find(c => c.id === fighter.race_category)?.label || fighter.race_category, color: RACE_CLASSES.find(c => c.id === fighter.race_category)?.color || '#DC2626' },
                  { label: 'STATUS',   val: '✅ CONFIRMED',              color: '#22C55E' },
                ].map(s => (
                  <div key={s.label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '12px 14px' }}>
                    <div style={{ ...F, fontSize: 10, letterSpacing: 3, color: '#6B7280', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ ...F, fontWeight: 700, fontSize: 16, color: s.color }}>{s.val}</div>
                  </div>
                ))}
              </div>

              <div style={{ ...FB, fontSize: 12, color: '#6B7280', textAlign: 'center', marginBottom: 16 }}>
                Win records and streaks will appear after first race
              </div>

              <button onClick={() => setFighter(null)} style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '12px', ...F, fontWeight: 700, fontSize: 15, color: '#F5F5F5', cursor: 'pointer', letterSpacing: 1 }}>
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
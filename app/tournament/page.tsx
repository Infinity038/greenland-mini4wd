'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { isRegistered, getMemberData } from '@/lib/member';
import { supabase } from '@/lib/supabase';

const F  = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
const FB = { fontFamily: "'DM Sans', sans-serif" } as const;

function PrizeCalculator() {
  const [paidTickets, setPaidTickets]   = useState(20);
  const [bonusTickets, setBonusTickets] = useState(0);
  const [ticketPrice, setTicketPrice]   = useState(150);

  const totalPaid   = paidTickets * ticketPrice;
  const prizePool   = Math.round(totalPaid * 0.70);
  const organizer   = Math.round(totalPaid * 0.30);
  const first       = Math.round(prizePool * 0.65);
  const second      = Math.round(prizePool * 0.25);
  const third       = Math.round(prizePool * 0.10);
  const totalEntries = paidTickets + bonusTickets;

  const inp: React.CSSProperties = {
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
        <div>
          <div style={{ ...F, fontSize: 11, letterSpacing: 3, color: '#B8C1CC', marginBottom: 8 }}>TICKET PRICE (DKK)</div>
          <input style={inp} type="number" min={50} max={500} value={ticketPrice} onChange={e => setTicketPrice(Number(e.target.value))} />
        </div>
        <div>
          <div style={{ ...F, fontSize: 11, letterSpacing: 3, color: '#B8C1CC', marginBottom: 8 }}>PAID ENTRIES</div>
          <input style={inp} type="number" min={2} max={100} value={paidTickets} onChange={e => setPaidTickets(Number(e.target.value))} />
        </div>
        <div>
          <div style={{ ...F, fontSize: 11, letterSpacing: 3, color: '#B8C1CC', marginBottom: 8 }}>BONUS TICKETS</div>
          <input style={inp} type="number" min={0} max={20} value={bonusTickets} onChange={e => setBonusTickets(Number(e.target.value))} />
          <div style={{ ...FB, fontSize: 11, color: '#6B7280', marginTop: 4 }}>Bonus tickets don't add to prize pool</div>
        </div>
      </div>
      <div style={{ background: '#050505', borderRadius: 12, padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ ...FB, color: '#B8C1CC', fontSize: 14 }}>Total entries</span>
          <span style={{ ...F, fontWeight: 700, color: '#F5F5F5', fontSize: 16 }}>{totalEntries}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ ...FB, color: '#B8C1CC', fontSize: 14 }}>Paid ticket revenue</span>
          <span style={{ ...F, fontWeight: 700, color: '#F5F5F5', fontSize: 16 }}>{totalPaid.toLocaleString()} DKK</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ ...FB, color: '#B8C1CC', fontSize: 14 }}>Organizer fund (30%)</span>
          <span style={{ ...F, fontWeight: 700, color: '#B8C1CC', fontSize: 16 }}>{organizer.toLocaleString()} DKK</span>
        </div>
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
  const [loggedIn, setLoggedIn]         = useState(false);
  const [member, setMember]             = useState<any>(null);
  const [tournaments, setTournaments]   = useState<any[]>([]);
  const [entrants, setEntrants]         = useState<any[]>([]);
  const [myTickets, setMyTickets]       = useState<any[]>([]);
  const [loadingTourneys, setLoadingTourneys] = useState(true);

  useEffect(() => {
    const registered = isRegistered();
    setLoggedIn(registered);
    const local = getMemberData();
    if (local) setMember(local);

    async function load() {
      // Load tournaments
      const { data: tData } = await supabase
        .from('tournaments')
        .select('*')
        .in('status', ['upcoming', 'ongoing'])
        .order('date', { ascending: true });
      setTournaments(tData || []);

      // Load confirmed entrants for public list
      const { data: eData } = await supabase
        .from('race_tickets')
        .select('member_email, member_name, ticket_type, quantity, created_at')
        .eq('payment_status', 'payment_confirmed')
        .order('created_at', { ascending: true });
      setEntrants(eData || []);

      // Load my tickets if logged in
      if (local?.email) {
        const { data: mData } = await supabase
          .from('race_tickets')
          .select('*')
          .eq('member_email', local.email)
          .eq('payment_status', 'payment_confirmed');
        setMyTickets(mData || []);
      }

      setLoadingTourneys(false);
    }
    load();
  }, []);

  const myTotalTickets = myTickets.reduce((sum, t) => sum + (Number(t.quantity) || 1), 0);
  const weeklyEntrants = entrants.filter(e => e.ticket_type === 'weekly' || e.ticket_type === 'weekly_earlybird');
  const seasonEntrants = entrants.filter(e => e.ticket_type === 'season');

  const rules = [
    { icon: '🏎️', title: 'Box Stock Only',         desc: 'Stock motor, stock gears, stock rollers. No performance mods. Any official Tamiya chassis accepted.' },
    { icon: '🔋', title: 'Alkaline AA Batteries',   desc: 'Only standard Alkaline AA batteries. No NiMH, lithium, or rechargeable batteries.' },
    { icon: '🎟️', title: '1 Ticket = 1 Entry',      desc: 'Each ticket = 1 car with 2 qualification lives. Same car cannot be entered twice under one ticket.' },
    { icon: '🏁', title: 'Qualification Format',    desc: '2 timed runs per ticket. Best run counts. Top qualifiers advance to single-elimination finals.' },
    { icon: '⚡', title: 'Single Elimination Finals', desc: 'Head-to-head racing. Win or go home. No second chances in the finals.' },
    { icon: '👤', title: 'Official Members Only',   desc: 'Tournament entry requires Official Club Member status. Complete a qualifying purchase to unlock.' },
  ];

  const recognitions = [
    { icon: '⚡', title: 'Fastest Clean Run',        desc: 'Fastest single qualifying lap without a DNF.' },
    { icon: '👥', title: 'Crowd Favorite Moment',    desc: 'Most exciting moment voted by the community.' },
    { icon: '🏎️', title: 'Best Lap Time',            desc: 'Fastest single lap recorded during the event.' },
    { icon: '🔥', title: 'Fastest Car of the Week',  desc: 'Top speed across all heat runs.' },
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
              Pure stock. Pure skill. Every racer has the same equipment — the only advantage is your driving.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              {loggedIn ? (
                <>
                  <a href="/tickets" style={{ background: '#DC2626', color: '#fff', padding: '14px 32px', borderRadius: 10, ...F, fontWeight: 900, fontSize: 17, letterSpacing: 2, textDecoration: 'none' }}>
                    🎟️ BUY TICKETS →
                  </a>
                  <a href="/shop" style={{ background: 'transparent', color: '#F5F5F5', padding: '14px 32px', borderRadius: 10, ...F, fontWeight: 700, fontSize: 17, letterSpacing: 2, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.15)' }}>
                    GET YOUR CAR
                  </a>
                </>
              ) : (
                <>
                  <a href="/register" style={{ background: '#DC2626', color: '#fff', padding: '14px 32px', borderRadius: 10, ...F, fontWeight: 900, fontSize: 17, letterSpacing: 2, textDecoration: 'none' }}>
                    REGISTER FREE FIRST →
                  </a>
                  <a href="/tickets" style={{ background: 'transparent', color: '#F5F5F5', padding: '14px 32px', borderRadius: 10, ...F, fontWeight: 700, fontSize: 17, letterSpacing: 2, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.15)' }}>
                    VIEW TICKETS
                  </a>
                </>
              )}
            </div>
          </div>
        </section>

        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '60px 24px' }}>

          {/* My Entry Status (logged in only) */}
          {loggedIn && (
            <section style={{ marginBottom: 40 }}>
              <div style={{ background: myTotalTickets > 0 ? 'linear-gradient(135deg, #071426, #0a1f0a)' : '#071426', border: `1.5px solid ${myTotalTickets > 0 ? 'rgba(34,197,94,0.35)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 14, padding: '24px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                <div>
                  <div style={{ ...F, fontSize: 11, letterSpacing: 4, color: myTotalTickets > 0 ? '#22C55E' : '#B8C1CC', marginBottom: 6 }}>YOUR ENTRY STATUS</div>
                  <div style={{ ...F, fontWeight: 900, fontSize: 26, color: '#F5F5F5' }}>
                    {myTotalTickets > 0 ? `✅ ${myTotalTickets} Ticket${myTotalTickets > 1 ? 's' : ''} Confirmed` : '⚠️ No Active Tickets'}
                  </div>
                  <div style={{ ...FB, fontSize: 13, color: '#B8C1CC', marginTop: 4 }}>
                    {myTotalTickets > 0 ? 'You are entered in the next race. Bring your car!' : 'Purchase a ticket to enter the next tournament.'}
                  </div>
                </div>
                <a href="/tickets" style={{ background: '#DC2626', color: '#fff', padding: '12px 24px', borderRadius: 8, ...F, fontWeight: 900, fontSize: 14, letterSpacing: 2, textDecoration: 'none', flexShrink: 0 }}>
                  {myTotalTickets > 0 ? 'BUY MORE →' : 'BUY TICKET →'}
                </a>
              </div>
            </section>
          )}

          {/* Upcoming Tournaments from DB */}
          <section style={{ marginBottom: 64 }}>
            <div style={{ ...F, fontSize: 11, letterSpacing: 5, color: '#DC2626', marginBottom: 8 }}>SCHEDULE</div>
            <h2 style={{ ...F, fontWeight: 900, fontSize: 'clamp(32px, 6vw, 52px)', margin: '0 0 24px' }}>UPCOMING RACES</h2>

            {loadingTourneys ? (
              <div style={{ ...FB, color: '#B8C1CC', fontSize: 14, padding: '40px 0' }}>Loading schedule...</div>
            ) : tournaments.length === 0 ? (
              <div style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '40px 28px', textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🏁</div>
                <div style={{ ...F, fontWeight: 900, fontSize: 22, color: '#F5F5F5', marginBottom: 8 }}>NEXT RACE BEING SCHEDULED</div>
                <div style={{ ...FB, fontSize: 14, color: '#B8C1CC', maxWidth: 400, margin: '0 auto 20px' }}>
                  Race dates are announced on our Facebook and Instagram. Join the community to stay updated.
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <a href="https://www.facebook.com/share/g/18gBxyY1Wd/?mibextid=wwXIfr" target="_blank" rel="noreferrer" style={{ background: '#1877F2', color: '#fff', padding: '10px 20px', borderRadius: 6, ...F, fontWeight: 700, fontSize: 13, letterSpacing: 1, textDecoration: 'none' }}>FACEBOOK GROUP →</a>
                  <a href="https://www.instagram.com/thearctichustle" target="_blank" rel="noreferrer" style={{ background: 'linear-gradient(135deg, #E1306C, #833AB4)', color: '#fff', padding: '10px 20px', borderRadius: 6, ...F, fontWeight: 700, fontSize: 13, letterSpacing: 1, textDecoration: 'none' }}>INSTAGRAM →</a>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {tournaments.map((t: any) => {
                  const cats: string[] = t.race_categories || [];
                  const isLive = t.status === 'ongoing';
                  const raceDate = t.date ? new Date(t.date) : null;
                  return (
                    <div key={t.id} style={{ background: isLive ? 'linear-gradient(135deg, #071426, #0a1f0a)' : '#071426', border: `1.5px solid ${isLive ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 14, padding: '20px 24px' }}>
                      {isLive && <div style={{ height: 2, background: '#22C55E', marginBottom: 12, borderRadius: 1 }} />}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                            <span style={{ ...F, fontSize: 10, letterSpacing: 2, padding: '2px 10px', borderRadius: 20, background: isLive ? 'rgba(34,197,94,0.15)' : 'rgba(59,130,246,0.15)', color: isLive ? '#22C55E' : '#3B82F6' }}>
                              {isLive ? '🔴 LIVE NOW' : '🗓️ UPCOMING'}
                            </span>
                            {cats.map((cat: string) => (
                              <span key={cat} style={{ ...F, fontSize: 9, letterSpacing: 1, padding: '2px 8px', borderRadius: 20, background: 'rgba(255,255,255,0.06)', color: '#B8C1CC' }}>{cat.toUpperCase()}</span>
                            ))}
                          </div>
                          <div style={{ ...F, fontWeight: 900, fontSize: 22, color: '#F5F5F5', marginBottom: 4 }}>{t.name}</div>
                          <div style={{ ...FB, fontSize: 13, color: '#B8C1CC', display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                            {raceDate && <span>📅 {raceDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })} · {raceDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>}
                            {t.location && <span>📍 {t.location}</span>}
                          </div>
                          {t.description && <div style={{ ...FB, fontSize: 13, color: '#6B7280', marginTop: 8 }}>{t.description}</div>}
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          {t.ticket_price_dkk && <div style={{ ...F, fontWeight: 900, fontSize: 28, color: '#FACC15' }}>{t.ticket_price_dkk} DKK</div>}
                          {t.max_participants && <div style={{ ...FB, fontSize: 11, color: '#6B7280', marginBottom: 8 }}>Max {t.max_participants} racers</div>}
                          <a href="/tickets" style={{ display: 'inline-block', background: '#DC2626', color: '#fff', borderRadius: 6, padding: '8px 18px', ...F, fontWeight: 900, fontSize: 12, letterSpacing: 1, textDecoration: 'none' }}>
                            BUY TICKET →
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Entrant List */}
          <section style={{ marginBottom: 64 }}>
            <div style={{ ...F, fontSize: 11, letterSpacing: 5, color: '#DC2626', marginBottom: 8 }}>WHO'S RACING</div>
            <h2 style={{ ...F, fontWeight: 900, fontSize: 'clamp(32px, 6vw, 52px)', margin: '0 0 24px' }}>CONFIRMED ENTRANTS</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {/* Weekly */}
              <div style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 24 }}>
                <div style={{ ...F, fontWeight: 900, fontSize: 18, color: '#F5F5F5', marginBottom: 4 }}>🏁 WEEKLY RACE</div>
                <div style={{ ...FB, fontSize: 12, color: '#B8C1CC', marginBottom: 16 }}>{weeklyEntrants.length} confirmed entrant{weeklyEntrants.length !== 1 ? 's' : ''}</div>
                {weeklyEntrants.length === 0 ? (
                  <div style={{ ...FB, fontSize: 13, color: '#6B7280' }}>No entrants yet. Be the first!</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {weeklyEntrants.map((e: any, i: number) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '10px 12px' }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', ...F, fontWeight: 900, fontSize: 13, color: '#fff', flexShrink: 0 }}>{i + 1}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ ...F, fontWeight: 700, fontSize: 15, color: '#F5F5F5' }}>{e.member_name || e.member_email?.split('@')[0]}</div>
                          <div style={{ ...FB, fontSize: 11, color: '#B8C1CC' }}>{e.ticket_type === 'weekly_earlybird' ? '🐦 Early Bird' : '🏁 Weekly'} · {e.quantity || 1} ticket{(e.quantity || 1) > 1 ? 's' : ''}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {/* Season */}
              <div style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 24 }}>
                <div style={{ ...F, fontWeight: 900, fontSize: 18, color: '#F5F5F5', marginBottom: 4 }}>🏆 SEASON PASS</div>
                <div style={{ ...FB, fontSize: 12, color: '#B8C1CC', marginBottom: 16 }}>{seasonEntrants.length} confirmed entrant{seasonEntrants.length !== 1 ? 's' : ''}</div>
                {seasonEntrants.length === 0 ? (
                  <div style={{ ...FB, fontSize: 13, color: '#6B7280' }}>No season pass holders yet.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {seasonEntrants.map((e: any, i: number) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '10px 12px' }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#FACC15', display: 'flex', alignItems: 'center', justifyContent: 'center', ...F, fontWeight: 900, fontSize: 13, color: '#111', flexShrink: 0 }}>{i + 1}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ ...F, fontWeight: 700, fontSize: 15, color: '#F5F5F5' }}>{e.member_name || e.member_email?.split('@')[0]}</div>
                          <div style={{ ...FB, fontSize: 11, color: '#B8C1CC' }}>🏆 Season · {e.quantity || 1} ticket{(e.quantity || 1) > 1 ? 's' : ''}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Race Rules */}
          <section style={{ marginBottom: 64 }}>
            <div style={{ ...F, fontSize: 11, letterSpacing: 5, color: '#DC2626', marginBottom: 8 }}>BOX STOCK CLASS</div>
            <h2 style={{ ...F, fontWeight: 900, fontSize: 'clamp(32px, 6vw, 52px)', margin: '0 0 32px' }}>RACE RULES</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {rules.map(r => (
                <div key={r.title} style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '24px 20px' }}>
                  <div style={{ fontSize: 28, marginBottom: 12 }}>{r.icon}</div>
                  <div style={{ ...F, fontWeight: 800, fontSize: 18, color: '#F5F5F5', marginBottom: 8 }}>{r.title}</div>
                  <div style={{ ...FB, fontSize: 14, color: '#B8C1CC', lineHeight: 1.6 }}>{r.desc}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Ticket & Loyalty */}
          <section style={{ marginBottom: 64 }}>
            <div style={{ ...F, fontSize: 11, letterSpacing: 5, color: '#DC2626', marginBottom: 8 }}>TICKET SYSTEM</div>
            <h2 style={{ ...F, fontWeight: 900, fontSize: 'clamp(32px, 6vw, 52px)', margin: '0 0 32px' }}>TICKETS & LOYALTY</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {[
                { icon: '🎟️', title: 'Paid Race Ticket',     desc: 'Purchase a ticket to enter a tournament. Each ticket = 1 car entry with 2 qualification runs.' },
                { icon: '🎁', title: 'Loyalty Bonus Ticket', desc: 'Every 10 confirmed paid tickets earns you 1 free bonus ticket. Bonus tickets do not count toward next bonus.' },
                { icon: '👥', title: 'Referral Bonus',       desc: 'Earn 1 bonus ticket when someone you referred completes a qualifying purchase confirmed by admin.' },
                { icon: '⚠️', title: 'Bonus Entry Limit',    desc: 'Max 10% of paid entries per tournament can be bonus tickets. Ensures prize pool integrity.' },
              ].map(t => (
                <div key={t.title} style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '24px 20px' }}>
                  <div style={{ fontSize: 28, marginBottom: 12 }}>{t.icon}</div>
                  <div style={{ ...F, fontWeight: 800, fontSize: 18, color: '#F5F5F5', marginBottom: 8 }}>{t.title}</div>
                  <div style={{ ...FB, fontSize: 14, color: '#B8C1CC', lineHeight: 1.6 }}>{t.desc}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Prize Calculator */}
          <section style={{ marginBottom: 64 }}>
            <div style={{ ...F, fontSize: 11, letterSpacing: 5, color: '#DC2626', marginBottom: 8 }}>70/30 SPLIT</div>
            <h2 style={{ ...F, fontWeight: 900, fontSize: 'clamp(32px, 6vw, 52px)', margin: '0 0 8px' }}>PRIZE POOL</h2>
            <p style={{ ...FB, fontSize: 15, color: '#B8C1CC', margin: '0 0 32px' }}>70% of paid ticket sales goes directly to the prize pool. Bonus tickets do not contribute.</p>
            <PrizeCalculator />
          </section>

          {/* House Car / Batteries */}
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
            <h2 style={{ ...F, fontWeight: 900, fontSize: 'clamp(32px, 6vw, 52px)', margin: '0 0 8px' }}>SPECIAL RECOGNITION</h2>
            <p style={{ ...FB, fontSize: 14, color: '#B8C1CC', margin: '0 0 32px' }}>Social recognition and shoutouts. Physical trophies introduced once capital is recovered.</p>
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
              Register free, get your car, become an Official Member, and race every week in Nuuk.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              {loggedIn ? (
                <>
                  <a href="/tickets" style={{ background: '#DC2626', color: '#fff', padding: '14px 32px', borderRadius: 10, ...F, fontWeight: 900, fontSize: 17, letterSpacing: 2, textDecoration: 'none' }}>🎟️ BUY TICKETS →</a>
                  <a href="/shop" style={{ background: 'transparent', color: '#F5F5F5', padding: '14px 32px', borderRadius: 10, ...F, fontWeight: 700, fontSize: 17, letterSpacing: 2, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.15)' }}>GET YOUR CAR</a>
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
    </>
  );
}
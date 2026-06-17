'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { isRegistered } from '@/lib/member';

const F = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
const FB = { fontFamily: "'DM Sans', sans-serif" } as const;

function PrizeCalculator() {
  const [paidTickets, setPaidTickets] = useState(20);
  const [bonusTickets, setBonusTickets] = useState(0);
  const [ticketPrice, setTicketPrice] = useState(100);

  const totalPaid = paidTickets * ticketPrice;
  const prizePool = Math.round(totalPaid * 0.70);
  const organizer = Math.round(totalPaid * 0.30);
  const first = Math.round(prizePool * 0.65);
  const second = Math.round(prizePool * 0.25);
  const third = Math.round(prizePool * 0.10);
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
          { place: '🥇 1ST', pct: '65%', val: first, color: '#FACC15' },
          { place: '🥈 2ND', pct: '25%', val: second, color: '#B8C1CC' },
          { place: '🥉 3RD', pct: '10%', val: third, color: '#CD7F32' },
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
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => { setLoggedIn(isRegistered()); }, []);

  const rules = [
    { icon: '🏎️', title: 'Box Stock Only', desc: 'Stock motor, stock gears, stock rollers. No performance modifications allowed. Any official Tamiya chassis accepted.' },
    { icon: '🔋', title: 'Alkaline AA Batteries', desc: 'Only standard Alkaline AA batteries permitted. No NiMH, lithium, or rechargeable batteries.' },
    { icon: '🎟️', title: '1 Ticket = 1 Entry', desc: 'Each ticket covers 1 car with 2 qualification lives. Same car cannot be entered twice under one ticket.' },
    { icon: '🏁', title: 'Qualification Format', desc: '2 timed runs per ticket. Best run counts. Top qualifiers advance to single-elimination finals.' },
    { icon: '⚡', title: 'Single Elimination Finals', desc: 'Head-to-head racing. Win or go home. Pure skill, no second chances in the finals.' },
    { icon: '👤', title: 'Official Members Only', desc: 'Tournament entry requires Official Club Member status. Complete a qualifying purchase to unlock.' },
  ];

  const recognitions = [
    { icon: '⚡', title: 'Fastest Clean Run', desc: 'Fastest single qualifying lap without a DNF.' },
    { icon: '👥', title: 'Crowd Favorite Moment', desc: 'Most exciting moment voted by the community.' },
    { icon: '🏎️', title: 'Best Lap Time', desc: 'Fastest single lap recorded during the event.' },
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
              Pure stock. Pure skill. Every racer has the same equipment — the only advantage is your driving.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              {loggedIn ? (
                <a href="/tickets" style={{ background: '#DC2626', color: '#fff', padding: '14px 32px', borderRadius: 10, ...F, fontWeight: 900, fontSize: 17, letterSpacing: 2, textDecoration: 'none' }}>
                  🎟️ BUY TICKETS →
                </a>
              ) : (
                <a href="/register" style={{ background: '#DC2626', color: '#fff', padding: '14px 32px', borderRadius: 10, ...F, fontWeight: 900, fontSize: 17, letterSpacing: 2, textDecoration: 'none' }}>
                  REGISTER FREE FIRST →
                </a>
              )}
              <a href="/shop" style={{ background: 'transparent', color: '#F5F5F5', padding: '14px 32px', borderRadius: 10, ...F, fontWeight: 700, fontSize: 17, letterSpacing: 2, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.15)' }}>
                GET YOUR CAR
              </a>
            </div>
          </div>
        </section>

        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '60px 24px' }}>

          {/* Rules */}
          <section style={{ marginBottom: 64 }}>
            <div style={{ ...F, fontSize: 11, letterSpacing: 5, color: '#DC2626', marginBottom: 8 }}>OFFICIAL RULES</div>
            <h2 style={{ ...F, fontWeight: 900, fontSize: 'clamp(32px, 6vw, 52px)', margin: '0 0 32px' }}>RACE FORMAT</h2>
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
                { icon: '🎟️', title: 'Paid Race Ticket', desc: 'Purchase a ticket to enter a tournament. Each ticket = 1 car entry with 2 qualification runs.' },
                { icon: '🎁', title: 'Loyalty Bonus Ticket', desc: 'Every 10 confirmed paid tickets earns you 1 free bonus ticket. Bonus tickets do not count toward next bonus.' },
                { icon: '👥', title: 'Referral Bonus Ticket', desc: 'Earn 1 bonus ticket when someone you referred completes an admin-confirmed qualifying purchase.' },
                { icon: '⚠️', title: 'Bonus Entry Limit', desc: 'Max 10% of paid entries per tournament can be bonus tickets. Ensures prize pool integrity.' },
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
            <p style={{ ...FB, fontSize: 14, color: '#B8C1CC', margin: '0 0 32px' }}>Social recognition and shoutouts. Physical trophies will be introduced once capital is recovered.</p>
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
                    REGISTER FREE →
                  </a>
                  <a href="/tickets" style={{ background: 'transparent', color: '#F5F5F5', padding: '14px 32px', borderRadius: 10, ...F, fontWeight: 700, fontSize: 17, letterSpacing: 2, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.15)' }}>
                    VIEW TICKETS
                  </a>
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
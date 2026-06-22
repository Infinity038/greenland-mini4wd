// @ts-nocheck
'use client';

import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const F = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
const FB = { fontFamily: "'DM Sans', sans-serif" } as const;

export default function HowToJoin() {
  return (
    <>
      <Navbar />
      <main style={{ background: '#050505', color: '#F5F5F5', paddingTop: 60, paddingBottom: 60 }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 20px' }}>
          <h1 style={{ ...F, fontSize: 40, fontWeight: 900, marginBottom: 12, textAlign: 'center', color: '#DC2626' }}>HOW TO JOIN</h1>
          <p style={{ ...FB, fontSize: 16, color: '#B8C1CC', textAlign: 'center', marginBottom: 60 }}>Get started with The Arctic Hustle and unlock exclusive rewards, racing, and community.</p>

          <section style={{ marginBottom: 60 }}>
            <h2 style={{ ...F, fontSize: 28, fontWeight: 900, marginBottom: 20, color: '#FACC15' }}>1. Register</h2>
            <p style={{ ...FB, fontSize: 15, color: '#B8C1CC', marginBottom: 16, lineHeight: 1.8 }}>
              Create an account on the website. It's free and takes under 2 minutes. You'll immediately get access to your member profile, where you can:
            </p>
            <ul style={{ ...FB, fontSize: 15, color: '#B8C1CC', marginBottom: 24, paddingLeft: 24, lineHeight: 1.8 }}>
              <li>Register and approve your first Mini 4WD car</li>
              <li>View your loyalty points and ranking</li>
              <li>Browse upcoming races and tournaments</li>
              <li>Buy tickets and manage your garage</li>
            </ul>
          </section>

          <section style={{ marginBottom: 60 }}>
            <h2 style={{ ...F, fontSize: 28, fontWeight: 900, marginBottom: 20, color: '#FACC15' }}>2. Become a Member</h2>
            <p style={{ ...FB, fontSize: 15, color: '#B8C1CC', marginBottom: 16, lineHeight: 1.8 }}>
              You automatically become a member by making your first purchase — whether that's a car kit, parts, tickets, or merchandise. There is no fixed membership fee.
            </p>
            <p style={{ ...FB, fontSize: 15, color: '#B8C1CC', marginBottom: 16, lineHeight: 1.8 }}>
              <strong style={{ color: '#F5F5F5' }}>Your membership is active</strong> for one year from your most recent purchase. After 12 months with no activity, your membership expires — but you can reactivate anytime by buying a ticket or product.
            </p>
            <div style={{ background: '#071426', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 12, padding: 20, marginBottom: 24 }}>
              <div style={{ ...F, fontSize: 14, fontWeight: 700, color: '#DC2626', marginBottom: 12 }}>💡 EXAMPLE</div>
              <div style={{ ...FB, fontSize: 14, color: '#B8C1CC', lineHeight: 1.8 }}>
                You buy an AR Chassis kit on January 1st → membership active until January 1st next year. If you buy a race ticket on December 15th, your membership extends for another year from that date.
              </div>
            </div>
          </section>

          <section style={{ marginBottom: 60 }}>
            <h2 style={{ ...F, fontSize: 28, fontWeight: 900, marginBottom: 20, color: '#FACC15' }}>3. Earn Loyalty Points</h2>
            <p style={{ ...FB, fontSize: 15, color: '#B8C1CC', marginBottom: 16, lineHeight: 1.8 }}>
              Every DKK you spend earns you loyalty points. Your earn rate depends on your membership tier:
            </p>
            <div style={{ display: 'grid', gap: 12, marginBottom: 24 }}>
              {[
                { tier: 'Non-Member', rate: '0%', example: 'Spend 500 kr → 0 points' },
                { tier: 'Member', rate: '2%', example: 'Spend 500 kr → 10 points' },
                { tier: 'Pro Racer', rate: '3%', example: 'Spend 500 kr → 15 points' },
                { tier: 'Elite Racer', rate: '4%', example: 'Spend 500 kr → 20 points' },
                { tier: 'Arctic Champion', rate: '5%', example: 'Spend 500 kr → 25 points' },
                { tier: 'Hall of Fame', rate: '8%', example: 'Spend 500 kr → 40 points' },
              ].map((t, i) => (
                <div key={i} style={{ background: '#0D1B2A', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ ...F, fontSize: 14, fontWeight: 700, color: '#F5F5F5' }}>{t.tier}</div>
                    <div style={{ ...F, fontSize: 16, fontWeight: 900, color: '#FACC15' }}>{t.rate}</div>
                  </div>
                  <div style={{ ...FB, fontSize: 13, color: '#B8C1CC' }}>{t.example}</div>
                </div>
              ))}
            </div>
            <p style={{ ...FB, fontSize: 14, color: '#B8C1CC', fontStyle: 'italic' }}>
              💰 Bonus: Every 10 paid race tickets you buy gives you 1 FREE bonus ticket, courtesy of the club!
            </p>
          </section>

          <section style={{ marginBottom: 60 }}>
            <h2 style={{ ...F, fontSize: 28, fontWeight: 900, marginBottom: 20, color: '#FACC15' }}>4. Climb the Rankings</h2>
            <p style={{ ...FB, fontSize: 15, color: '#B8C1CC', marginBottom: 16, lineHeight: 1.8 }}>
              Your rank is based on your racing performance and membership history. There are six tiers:
            </p>
            <div style={{ display: 'grid', gap: 12, marginBottom: 24 }}>
              {[
                { title: 'Rookie Racer', color: '#6B7280', desc: 'Your first year of racing. Build experience.' },
                { title: 'Club Racer', color: '#3B82F6', desc: 'Active member with solid performance.' },
                { title: 'Pro Racer', color: '#8B5CF6', desc: 'Top competitor, proven skill, 3rd place finishes.' },
                { title: 'Elite Racer', color: '#EC4899', desc: 'Elite driver, 2nd place finishes and strong streak.' },
                { title: 'Arctic Champion', color: '#DC2626', desc: 'Season champion — highest honor of the year.' },
                { title: 'Hall of Fame', color: '#FACC15', desc: 'Legendary status — multiple championships or historic wins.' },
              ].map((tier, i) => (
                <div key={i} style={{ background: `${tier.color}15`, border: `1px solid ${tier.color}40`, borderRadius: 8, padding: 16 }}>
                  <div style={{ ...F, fontSize: 14, fontWeight: 700, color: tier.color, marginBottom: 4 }}>{tier.title}</div>
                  <div style={{ ...FB, fontSize: 13, color: '#B8C1CC' }}>{tier.desc}</div>
                </div>
              ))}
            </div>
            <p style={{ ...FB, fontSize: 14, color: '#B8C1CC', marginTop: 20 }}>
              🎯 <strong>Seasonal Tiers reset every year</strong> on our club anniversary. Your lifetime spending and Hall of Fame status never reset.
            </p>
          </section>

          <section style={{ marginBottom: 60 }}>
            <h2 style={{ ...F, fontSize: 28, fontWeight: 900, marginBottom: 20, color: '#FACC15' }}>5. Buy Race Tickets</h2>
            <p style={{ ...FB, fontSize: 15, color: '#B8C1CC', marginBottom: 16, lineHeight: 1.8 }}>
              Tickets are your passport to racing. We offer two types:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
              <div style={{ background: '#071426', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 12, padding: 20 }}>
                <div style={{ ...F, fontSize: 16, fontWeight: 900, color: '#DC2626', marginBottom: 12 }}>WEEKLY TICKET</div>
                <div style={{ ...F, fontSize: 20, fontWeight: 900, color: '#FACC15', marginBottom: 12 }}>150 DKK</div>
                <ul style={{ ...FB, fontSize: 13, color: '#B8C1CC', paddingLeft: 16, lineHeight: 1.8 }}>
                  <li>Enter that week's race only</li>
                  <li>One entry per car</li>
                  <li>Counts toward punch card</li>
                </ul>
              </div>
              <div style={{ background: '#071426', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 12, padding: 20 }}>
                <div style={{ ...F, fontSize: 16, fontWeight: 900, color: '#DC2626', marginBottom: 12 }}>SEASON TICKET</div>
                <div style={{ ...F, fontSize: 20, fontWeight: 900, color: '#FACC15', marginBottom: 12 }}>500 DKK</div>
                <ul style={{ ...FB, fontSize: 13, color: '#B8C1CC', paddingLeft: 16, lineHeight: 1.8 }}>
                  <li>Enter ALL races that season</li>
                  <li>Unlimited entries</li>
                  <li>Best value for racers</li>
                </ul>
              </div>
            </div>
            <div style={{ background: '#071426', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 12, padding: 20 }}>
              <div style={{ ...F, fontSize: 14, fontWeight: 700, color: '#22C55E', marginBottom: 12 }}>⏰ MEMBERSHIP REQUIREMENT</div>
              <div style={{ ...FB, fontSize: 14, color: '#B8C1CC', lineHeight: 1.8 }}>
                <strong style={{ color: '#F5F5F5' }}>Active members can use any ticket type.</strong> If your membership expires, you can still race with a paid ticket (weekly or season), but free bonus tickets become unavailable until you renew.
              </div>
            </div>
          </section>

          <section style={{ marginBottom: 60 }}>
            <h2 style={{ ...F, fontSize: 28, fontWeight: 900, marginBottom: 20, color: '#FACC15' }}>6. Register Your Cars</h2>
            <p style={{ ...FB, fontSize: 15, color: '#B8C1CC', marginBottom: 16, lineHeight: 1.8 }}>
              Build or buy a Mini 4WD and add it to your garage. Your car must be approved by an admin before you can race it.
            </p>
            <p style={{ ...FB, fontSize: 15, color: '#B8C1CC', marginBottom: 16, lineHeight: 1.8 }}>
              <strong style={{ color: '#F5F5F5' }}>Race categories</strong> are: Box Stock, PRO-Stock, Basic, Advanced, B-Max, and Open. Your car's modification level determines which categories it can enter.
            </p>
            <div style={{ background: '#071426', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 12, padding: 20 }}>
              <div style={{ ...F, fontSize: 14, fontWeight: 700, color: '#DC2626', marginBottom: 12 }}>📋 EXAMPLE</div>
              <div style={{ ...FB, fontSize: 14, color: '#B8C1CC', lineHeight: 1.8 }}>
                You build a basic AR kit from the shop. You register it as a "Box Stock" car. At the next race, you can enter it in Box Stock, B-Max, and Open categories — but not in Advanced, PRO-Stock, or Basic.
              </div>
            </div>
          </section>

          <section style={{ marginBottom: 60 }}>
            <h2 style={{ ...F, fontSize: 28, fontWeight: 900, marginBottom: 20, color: '#FACC15' }}>7. Unlock Discounts</h2>
            <p style={{ ...FB, fontSize: 15, color: '#B8C1CC', marginBottom: 16, lineHeight: 1.8 }}>
              Higher tiers unlock time-limited discount codes. Redeem them on shop purchases to save 20% off regular prices.
            </p>
            <p style={{ ...FB, fontSize: 15, color: '#B8C1CC', marginBottom: 24, lineHeight: 1.8 }}>
              Earn your way up the rankings, and the deals come to you. Pro Racers and above get exclusive shopping discounts every season.
            </p>
          </section>

          <section style={{ marginBottom: 60 }}>
            <h2 style={{ ...F, fontSize: 28, fontWeight: 900, marginBottom: 20, color: '#FACC15' }}>FREQUENTLY ASKED</h2>
            <div style={{ display: 'grid', gap: 12 }}>
              {[
                {
                  q: 'Do I have to be a member to race?',
                  a: 'No. You can race without membership if you buy a paid ticket (weekly or season). However, you cannot use free bonus tickets unless your membership is active.',
                },
                {
                  q: 'What if my membership expires?',
                  a: 'You can still buy and race with tickets. To reactivate membership benefits, make any purchase (ticket, car, or product) and your membership extends another year.',
                },
                {
                  q: 'How do I move up in rank?',
                  a: "Rank is based on race performance and history. Win races, build a winning streak, and you'll naturally climb from Rookie to Champion. Hall of Fame is earned through legendary achievements.",
                },
                {
                  q: 'Can I use my punch card (free ticket) after membership expires?',
                  a: 'No. Free bonus tickets are only valid for active members. Paid tickets (weekly / season) work anytime.',
                },
                {
                  q: 'How much do cars cost?',
                  a: 'Kit prices start around 300-400 DKK unbuilt. Built-to-order cars cost 200 DKK more. Check the shop for current pricing and variants.',
                },
              ].map((item, i) => (
                <div key={i} style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: 16 }}>
                  <div style={{ ...F, fontSize: 14, fontWeight: 700, color: '#FACC15', marginBottom: 8 }}>Q: {item.q}</div>
                  <div style={{ ...FB, fontSize: 14, color: '#B8C1CC', lineHeight: 1.8 }}>A: {item.a}</div>
                </div>
              ))}
            </div>
          </section>

          <div style={{ textAlign: 'center', padding: '40px 20px', background: '#071426', border: '2px solid #DC2626', borderRadius: 12 }}>
            <h3 style={{ ...F, fontSize: 24, fontWeight: 900, marginBottom: 12, color: '#F5F5F5' }}>Ready to race?</h3>
            <p style={{ ...FB, fontSize: 15, color: '#B8C1CC', marginBottom: 20 }}>Create an account and buy your first car or ticket to get started.</p>
            <button
              onClick={() => (window.location.href = '/register')}
              style={{ ...F, fontSize: 14, fontWeight: 900, background: '#DC2626', color: '#fff', padding: '12px 32px', border: 'none', borderRadius: 8, cursor: 'pointer' }}
            >
              JOIN NOW
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
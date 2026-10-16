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
      <main className="club-atmosphere" style={{ background: '#050505', color: '#F5F5F5', paddingTop: 60, paddingBottom: 60 }}>
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
            <h2 style={{ ...F, fontSize: 28, fontWeight: 900, marginBottom: 20, color: '#FACC15' }}>2. Registration, legacy access and future Club Pass</h2>
            <p style={{ ...FB, fontSize:15, color:'#B8C1CC',lineHeight:1.8 }}>Account registration is free and permanent. The current spending-based programme (one earned membership day per 20 DKK qualifying spend) remains in effect during the transition. Previously earned dates and ticket benefits will be honoured; no existing balance has been removed. Any future paid Club Pass will be a separate product for track and welcome benefits, not a replacement for your racer identity.</p>
            <p style={{ ...FB, fontSize:14, color:'#FACC15',lineHeight:1.8 }}>New paid Club Passes and the one-time beginner-car offer are not yet on sale. Final prices, availability, redemption conditions, and the migration date for future day accrual will be published before any change takes effect.</p>
            <a href="/membership" style={{ color:'#FACC15', fontWeight:700 }}>Understand membership types →</a>
          </section>

          <section style={{ marginBottom: 60 }}>
            <h2 style={{ ...F, fontSize: 28, fontWeight: 900, marginBottom: 20, color: '#FACC15' }}>3. Fixed Reward Points</h2>
            <p style={{ ...FB, fontSize:15, color:'#B8C1CC',lineHeight:1.8 }}>Reward points are separate from membership days and racing rank. The current fixed programme earns one whole point for every cumulative 100 DKK of eligible confirmed spending. Your actual available rewards are shown in your profile. The existing punch-card bonus ticket programme remains separate.</p>
          </section>

          <section style={{ marginBottom: 60 }}>
            <h2 style={{ ...F, fontSize: 28, fontWeight: 900, marginBottom: 20, color: '#FACC15' }}>4. Climb the Rankings</h2>
            <p style={{ ...FB, fontSize: 15, color: '#B8C1CC', marginBottom: 16, lineHeight: 1.8 }}>
              Your rank is based on your season placement. There are six tiers:
            </p>
            <div style={{ display: 'grid', gap: 12, marginBottom: 24 }}>
              {[
                { title: 'Rookie Racer', color: '#6B7280', desc: "Hasn't placed in a season yet." },
                { title: 'Club Racer', color: '#3B82F6', desc: 'Active member, no season finish yet.' },
                { title: 'Pro Racer', color: '#8B5CF6', desc: 'Finished 3rd overall in a season.' },
                { title: 'Elite Racer', color: '#EC4899', desc: 'Finished 2nd overall in a season.' },
                { title: 'Arctic Champion', color: '#DC2626', desc: '1st place season champion.' },
                { title: 'Hall of Fame', color: '#FACC15', desc: 'Legendary status — never resets.' },
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
                <strong style={{ color: '#F5F5F5' }}>Active members can use any ticket type.</strong> If your membership runs out, you can still race with a paid ticket (weekly or season), but free bonus tickets become unavailable until you spend again and renew.
              </div>
            </div>
          </section>

          <section style={{ marginBottom: 60 }}>
            <h2 style={{ ...F, fontSize: 28, fontWeight: 900, marginBottom: 20, color: '#FACC15' }}>6. Register Your Cars</h2>
            <p style={{ ...FB, fontSize: 15, color: '#B8C1CC', marginBottom: 16, lineHeight: 1.8 }}>
              Build or buy a Mini 4WD and add it to your garage. Your car must be approved by an admin before you can race it.
            </p>
            <p style={{ ...FB, fontSize: 15, color: '#B8C1CC', marginBottom: 16, lineHeight: 1.8 }}>
              <strong style={{ color: '#F5F5F5' }}>Race categories</strong> are: Box Stock, Open Box Stock, B-Max, and Open Class.
            </p>
            <div style={{ background: '#071426', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 12, padding: 20 }}>
              <div style={{ ...F, fontSize: 14, fontWeight: 700, color: '#DC2626', marginBottom: 12 }}>📋 EXAMPLE</div>
              <div style={{ ...FB, fontSize: 14, color: '#B8C1CC', lineHeight: 1.8 }}>
                You build a basic AR kit from the shop with no modifications. Since it meets the strictest requirements, it's eligible for any category — Box Stock, Open Box Stock, B-Max, or Open Class.
              </div>
            </div>
          </section>

          <section style={{ marginBottom: 60 }}>
            <h2 style={{ ...F, fontSize: 28, fontWeight: 900, marginBottom: 20, color: '#FACC15' }}>7. Unlock Discounts</h2>
            <p style={{ ...FB, fontSize: 15, color: '#B8C1CC', marginBottom: 24, lineHeight: 1.8 }}>
              The club occasionally drops exclusive promo codes for higher-ranked members. Keep an eye on our social pages — codes are announced there when available.
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
                  q: 'What if my membership runs out?',
                  a: 'You can still buy and race with tickets. Under the current legacy programme, eligible confirmed spending still earns access days until a published transition date. The forthcoming Club Pass will be separate.',
                },
                {
                  q: 'How do I move up in rank?',
                  a: "Rank is based on season placement. Finish 3rd, 2nd, or 1st in a season and you'll move up to Pro Racer, Elite Racer, or Arctic Champion. Hall of Fame is earned through legendary achievements.",
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
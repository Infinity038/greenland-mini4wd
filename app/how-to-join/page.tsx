// @ts-nocheck
'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { FEATURE_FLAGS } from '@/lib/featureFlags';
import { IN_PERSON_ONLY_NOTICE } from '@/lib/raceEntryPricing';

const F = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
const FB = { fontFamily: "'DM Sans', sans-serif" } as const;

function TournamentPausedNotice() {
  const searchParams = useSearchParams();
  if (searchParams.get('notice') !== 'tournament-paused') return null;
  return (
    <div style={{ background: 'rgba(250,204,21,0.08)', border: '1px solid rgba(250,204,21,0.3)', borderRadius: 10, padding: '14px 18px', marginBottom: 32, ...FB, fontSize: 14, color: '#FACC15', textAlign: 'center' }}>
      ⏸ Open Tournament and race tickets are postponed for now. While you wait, this is how to get started with Box Stock racing and B-MAX.
    </div>
  );
}

export default function HowToJoin() {
  return (
    <>
      <Navbar />
      <main style={{ background: '#050505', color: '#F5F5F5', paddingTop: 60, paddingBottom: 60 }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 20px' }}>
          <Suspense fallback={null}>
            <TournamentPausedNotice />
          </Suspense>
          <h1 style={{ ...F, fontSize: 40, fontWeight: 900, marginBottom: 12, textAlign: 'center', color: '#DC2626' }}>HOW TO JOIN</h1>
          <p style={{ ...FB, fontSize: 16, color: '#B8C1CC', textAlign: 'center', marginBottom: 60 }}>Get started with The Arctic Hustle and unlock exclusive rewards, racing, and community.</p>

          <section style={{ marginBottom: 60 }}>
            <h2 style={{ ...F, fontSize: 28, fontWeight: 900, marginBottom: 20, color: '#FACC15' }}>1. Register</h2>
            <p style={{ ...FB, fontSize: 15, color: '#B8C1CC', marginBottom: 16, lineHeight: 1.8 }}>
              Create an account on the website. It&apos;s free and takes under 2 minutes. You&apos;ll immediately get access to your Racer Profile, where you can:
            </p>
            <ul style={{ ...FB, fontSize: 15, color: '#B8C1CC', marginBottom: 24, paddingLeft: 24, lineHeight: 1.8 }}>
              <li>Register and approve your first Mini 4WD car</li>
              <li>View your Loyalty Points and Championship Points</li>
              <li>Browse upcoming races and tournaments</li>
              <li>Buy tickets and manage your garage</li>
            </ul>
          </section>

          <section style={{ marginBottom: 60 }}>
            <h2 style={{ ...F, fontSize: 28, fontWeight: 900, marginBottom: 20, color: '#FACC15' }}>2. Your Racer Profile is Free</h2>
            <p style={{ ...FB, fontSize: 15, color: '#B8C1CC', marginBottom: 16, lineHeight: 1.8 }}>
              Every registered racer gets a free Racer Profile. <strong style={{ color: '#F5F5F5' }}>It does not expire because of inactivity</strong> — there&apos;s no membership clock to keep running.
            </p>
            <div style={{ background: '#071426', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 12, padding: 20, marginBottom: 24 }}>
              <div style={{ ...F, fontSize: 14, fontWeight: 700, color: '#DC2626', marginBottom: 12 }}>🏁 WHAT&apos;S IN YOUR RACER PROFILE</div>
              <div style={{ ...FB, fontSize: 14, color: '#B8C1CC', lineHeight: 1.8 }}>
                Your registered cars, Loyalty Points balance, Shop Credit balance, Box Stock and B-MAX Championship Points, current leaderboard rank, race history, and awards — each shown separately, never combined into one number.
              </div>
            </div>
            {FEATURE_FLAGS.legacyMembershipUiEnabled && (
              <div style={{ background: 'rgba(107,114,128,0.08)', border: '1px dashed rgba(107,114,128,0.3)', borderRadius: 12, padding: 20, ...FB, fontSize: 13, color: '#6B7280', lineHeight: 1.8 }}>
                <strong style={{ color: '#9CA3AF' }}>Legacy copy (comparison only):</strong> the old system tied membership length to spending — every 20 DKK added 1 day, and membership could expire. This has been discontinued in favor of the free, non-expiring Racer Profile above. Historical membership records are preserved but no longer active.
              </div>
            )}
          </section>

          <section style={{ marginBottom: 60 }}>
            <h2 style={{ ...F, fontSize: 28, fontWeight: 900, marginBottom: 20, color: '#FACC15' }}>3. Earn Loyalty Points</h2>
            <p style={{ ...FB, fontSize: 15, color: '#B8C1CC', marginBottom: 16, lineHeight: 1.8 }}>
              Every 100 DKK you pay earns 1.00 Loyalty Point — the same rate for every racer. Partial spending earns partial points, and points are always shown to two decimal places.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
              {[
                { spend: '25 DKK', points: '0.25 points' },
                { spend: '50 DKK', points: '0.50 points' },
                { spend: '150 DKK', points: '1.50 points' },
                { spend: '299 DKK', points: '2.99 points' },
              ].map((row, i) => (
                <div key={i} style={{ background: '#0D1B2A', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: 16, textAlign: 'center' }}>
                  <div style={{ ...F, fontSize: 15, fontWeight: 900, color: '#F5F5F5' }}>{row.spend}</div>
                  <div style={{ ...FB, fontSize: 13, color: '#FACC15' }}>{row.points}</div>
                </div>
              ))}
            </div>
            <p style={{ ...FB, fontSize: 14, color: '#B8C1CC', fontStyle: 'italic' }}>
              Your Loyalty Points currently have no expiration date. Redeem them for reward milestones any time from your Racer Profile.
            </p>
            {FEATURE_FLAGS.legacyMembershipUiEnabled && (
              <div style={{ background: 'rgba(107,114,128,0.08)', border: '1px dashed rgba(107,114,128,0.3)', borderRadius: 12, padding: 20, marginTop: 20, ...FB, fontSize: 13, color: '#6B7280', lineHeight: 1.8 }}>
                <strong style={{ color: '#9CA3AF' }}>Legacy copy (comparison only):</strong> the old system paid a variable percentage by membership tier (Non-Member 0%, Member 2%, up to Hall of Fame 8%). This has been replaced by the flat rate above so every racer earns the same way.
              </div>
            )}
          </section>

          <section style={{ marginBottom: 60 }}>
            <h2 style={{ ...F, fontSize: 28, fontWeight: 900, marginBottom: 20, color: '#FACC15' }}>4. Compete on the Leaderboard</h2>
            <p style={{ ...FB, fontSize: 15, color: '#B8C1CC', marginBottom: 16, lineHeight: 1.8 }}>
              <strong style={{ color: '#F5F5F5' }}>Leaderboard rank is earned through racing, never through spending.</strong> Loyalty Points and Shop Credit have no effect on your rank. Box Stock and B-MAX each have their own separate Championship standings.
            </p>
            <div style={{ background: '#071426', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 12, padding: 20 }}>
              <div style={{ ...F, fontSize: 14, fontWeight: 700, color: '#3B82F6', marginBottom: 12 }}>🏆 HOW POINTS ARE EARNED</div>
              <div style={{ ...FB, fontSize: 14, color: '#B8C1CC', lineHeight: 1.8 }}>
                1st place: 10 pts · 2nd: 7 pts · 3rd: 5 pts · 4th: 3 pts · qualified participation: 1 pt · fastest official clean run: +1 bonus. An eight-event season counts your best six results.
              </div>
            </div>
          </section>

          <section style={{ marginBottom: 60 }}>
            <h2 style={{ ...F, fontSize: 28, fontWeight: 900, marginBottom: 20, color: '#FACC15' }}>5. Racing at Events</h2>
            <div style={{ background: 'rgba(250,204,21,0.06)', border: '1px solid rgba(250,204,21,0.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, ...FB, fontSize: 14, color: '#F5F5F5', lineHeight: 1.7 }}>
              {IN_PERSON_ONLY_NOTICE}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              <div style={{ background: '#071426', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 12, padding: 20 }}>
                <div style={{ ...F, fontSize: 16, fontWeight: 900, color: '#DC2626', marginBottom: 12 }}>WEEKLY RACE</div>
                <div style={{ ...F, fontSize: 20, fontWeight: 900, color: '#FACC15', marginBottom: 4 }}>150 DKK <span style={{ fontSize: 13, color: '#B8C1CC', fontWeight: 400 }}>first entry</span></div>
                <div style={{ ...F, fontSize: 16, fontWeight: 700, color: '#22C55E' }}>50 DKK <span style={{ fontSize: 13, color: '#B8C1CC', fontWeight: 400 }}>optional second life</span></div>
              </div>
              <div style={{ background: '#071426', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 12, padding: 20 }}>
                <div style={{ ...F, fontSize: 16, fontWeight: 900, color: '#DC2626', marginBottom: 12 }}>BIG EVENT</div>
                <div style={{ ...F, fontSize: 20, fontWeight: 900, color: '#FACC15', marginBottom: 4 }}>500 DKK <span style={{ fontSize: 13, color: '#B8C1CC', fontWeight: 400 }}>first entry</span></div>
                <div style={{ ...F, fontSize: 16, fontWeight: 700, color: '#22C55E' }}>100 DKK <span style={{ fontSize: 13, color: '#B8C1CC', fontWeight: 400 }}>optional second life</span></div>
              </div>
            </div>
            <p style={{ ...FB, fontSize: 15, color: '#B8C1CC', marginBottom: 16, lineHeight: 1.8 }}>
              Race entry includes one registered car, one category, one event, one first life, and race-day warm-up. An optional Second Life must be paid before check-in closes and applies only to the same registered car, category and event — it can&apos;t be transferred, refunded after check-in, or carried to another weekend. You may RSVP on the <a href="/tickets" style={{ color: '#FACC15' }}>Race Day page</a> to help the club estimate attendance. See the full <a href="/loyalty" style={{ color: '#FACC15' }}>Racer Profile &amp; Rewards preview</a> for details.
            </p>
            {FEATURE_FLAGS.legacyDigitalTicketUiEnabled && (
              <div style={{ background: 'rgba(107,114,128,0.08)', border: '1px dashed rgba(107,114,128,0.3)', borderRadius: 12, padding: 20, ...FB, fontSize: 13, color: '#6B7280', lineHeight: 1.8 }}>
                <strong style={{ color: '#9CA3AF' }}>Legacy copy (comparison only):</strong> the old system sold Weekly/Season digital tickets with stored &quot;lives&quot; and a 10-ticket punch card toward a free bonus ticket. This is being replaced by pay-at-the-venue Race Entry/Second Life pricing with no stored digital inventory.
              </div>
            )}
          </section>

          <section style={{ marginBottom: 60 }}>
            <h2 style={{ ...F, fontSize: 28, fontWeight: 900, marginBottom: 20, color: '#FACC15' }}>6. Register Your Cars</h2>
            <p style={{ ...FB, fontSize: 15, color: '#B8C1CC', marginBottom: 16, lineHeight: 1.8 }}>
              Build or buy a Mini 4WD and add it to your garage. Your car must be approved by an admin before you can race it. Once approved, it receives a <strong style={{ color: '#F5F5F5' }}>Club Car ID</strong> (e.g. <code style={{ color: '#FACC15' }}>G4W-BS-0047</code>) identifying the registered chassis — replacing the chassis means registering a new car and receiving a new Club Car ID, though normal legal parts and body changes stay allowed under the category rules.
            </p>
            <p style={{ ...FB, fontSize: 15, color: '#B8C1CC', marginBottom: 16, lineHeight: 1.8 }}>
              <strong style={{ color: '#F5F5F5' }}>Race categories</strong> are: Box Stock, Open Box Stock, B-Max, and Open Class.
            </p>
            <div style={{ background: '#071426', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 12, padding: 20 }}>
              <div style={{ ...F, fontSize: 14, fontWeight: 700, color: '#DC2626', marginBottom: 12 }}>📋 EXAMPLE</div>
              <div style={{ ...FB, fontSize: 14, color: '#B8C1CC', lineHeight: 1.8 }}>
                You build a basic AR kit from the shop with no modifications. Since it meets the strictest requirements, it&apos;s eligible for any category — Box Stock, Open Box Stock, B-Max, or Open Class.
              </div>
            </div>
          </section>

          <section style={{ marginBottom: 60 }}>
            <h2 style={{ ...F, fontSize: 28, fontWeight: 900, marginBottom: 20, color: '#FACC15' }}>7. Unlock Rewards</h2>
            <p style={{ ...FB, fontSize: 15, color: '#B8C1CC', marginBottom: 24, lineHeight: 1.8 }}>
              Reach a Loyalty Points milestone and choose whether to redeem it — rewards are personal, non-transferable, and confirmed through your Racer Profile. See the <a href="/loyalty" style={{ color: '#FACC15' }}>full rewards roadmap</a>.
            </p>
          </section>

          <section style={{ marginBottom: 60 }}>
            <h2 style={{ ...F, fontSize: 28, fontWeight: 900, marginBottom: 20, color: '#FACC15' }}>FREQUENTLY ASKED</h2>
            <div style={{ display: 'grid', gap: 12 }}>
              {[
                {
                  q: 'Do I need to pay anything to get a Racer Profile?',
                  a: 'No. Registration and your Racer Profile are completely free and never expire from inactivity.',
                },
                {
                  q: 'Do Loyalty Points expire?',
                  a: 'No. Your Loyalty Points currently have no expiration date.',
                },
                {
                  q: 'Does spending more money improve my leaderboard rank?',
                  a: 'No. Rank is earned only through racing results — Loyalty Points and Shop Credit never affect it.',
                },
                {
                  q: 'What is Shop Credit and how is it different from Loyalty Points?',
                  a: 'Shop Credit is awarded mainly through race prizes and is separate from Loyalty Points — it can be spent on eligible shop products but not on race entry, second lives, or cash withdrawal.',
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

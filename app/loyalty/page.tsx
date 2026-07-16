'use client';
// Preview page for the upcoming Racer Profile / Loyalty Points / Shop Credit /
// Prize Pool system. Everything on this page uses clearly-labeled EXAMPLE data —
// it is not wired to any live Supabase table, and nothing here writes anything.
// The real backend (loyalty ledger, Shop Credit ledger, QR/PIN redemption
// tokens) is a database-dependent follow-up pending schema review.
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import BalanceCards from '@/components/racer/BalanceCards';
import LoyaltyRoadmap from '@/components/racer/LoyaltyRoadmap';
import PointsActivityList, { type PointsActivityEntry } from '@/components/racer/PointsActivityList';
import { RacerCardFront, RacerCardBack } from '@/components/racer/RacerCardPreview';
import RacerIdentityPanel from '@/components/racer/RacerIdentityPanel';
import { calculatePrizePool, splitPlacementPrize } from '@/lib/prizePool';
import { formatRacerId } from '@/lib/racerId';

const F = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
const FB = { fontFamily: "'DM Sans', sans-serif" } as const;

const EXAMPLE_ACTIVITY: PointsActivityEntry[] = [
  { id: '1', date: '25 Jul 2026', description: 'B-MAX Race Entry', channel: 'In person', amountDkk: 150, pointsDelta: 1.5, status: 'Confirmed', reference: 'AM4WD-260725' },
  { id: '2', date: '25 Jul 2026', description: 'Second Life', channel: 'In person', amountDkk: 50, pointsDelta: 0.5, status: 'Confirmed', reference: 'AM4WD-260725' },
  { id: '3', date: '26 Jul 2026', description: 'Hyper-Dash Motor', channel: 'Online', amountDkk: 199, pointsDelta: 1.99, status: 'Confirmed' },
  { id: '4', date: '27 Jul 2026', description: '50 DKK Loyalty Reward', channel: 'In person', amountDkk: null, pointsDelta: -25, status: 'Redeemed' },
];

const HOW_IT_WORKS: { title: string; body: string }[] = [
  { title: 'How Race Entry works', body: 'Race Entry is paid in person at check-in — 150 DKK for a weekly race, 500 DKK for a big event — and includes one registered car, one category, one event and one first life. You may RSVP online first, but payment happens at the venue.' },
  { title: 'How Second Life works', body: 'An optional Second Life costs 50 DKK (weekly) or 100 DKK (big event), paid in person before check-in closes. It applies only to the same registered car and the same event. It cannot be transferred, refunded after check-in, or carried to another weekend.' },
  { title: 'How the Racer Card works', body: 'Your free Racer Card identifies your Racer Profile. Staff scans the QR code for purchases and loyalty activity. Race lives are controlled using dated physical stamps and a registered car sticker.' },
  { title: 'How Loyalty Points work', body: 'Every 100 DKK you pay earns 1.00 point. Partial spending earns partial points, so a 150 DKK race entry earns 1.50 points. Your points do not expire.' },
  { title: 'How rewards work', body: 'When you reach a reward milestone, you choose whether to redeem it. Rewards are personal and must be confirmed through your Racer Profile.' },
  { title: 'How the Prize Pool works', body: 'Only paid 150 DKK first-life entries build the Prize Pool. 65% goes to the Prize Pool and 35% supports Club Operations. Second-life payments do not increase the Prize Pool.' },
  { title: 'What Club Operations supports', body: 'Club Operations supports venue rental, track maintenance, awards, staffing, cleaning, race equipment, administration, storage and future improvements.' },
  { title: 'How Shop Credit works', body: 'Part of race prizes may be awarded as Shop Credit. Shop Credit is separate from Loyalty Points and can be used on eligible Arctic Mini4WD products and merchandise.' },
  { title: 'How the leaderboard works', body: 'Leaderboard rank is earned through racing performance, not spending. Box Stock and B-MAX have separate seasonal standings.' },
  { title: 'How the Hall of Fame works', body: 'The Hall of Fame preserves season championships, major-event victories, official records and special racing achievements.' },
];

function PreviewBanner() {
  return (
    <div style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 10, padding: '14px 18px', marginBottom: 32, ...FB, fontSize: 13, color: '#FCA5A5', lineHeight: 1.7, textAlign: 'center' }}>
      🔧 <strong style={{ color: '#fff' }}>Preview page.</strong> Everything below uses example data to show what your Racer Profile will look like. Nothing here is connected to your real account yet. Race entry pricing (150/500 DKK) and the in-person-only payment model shown here are already live on the Tickets and Tournament pages — the Loyalty Points/Shop Credit/Racer Card backend shown below is still example data.
    </div>
  );
}

export default function LoyaltyPreviewPage() {
  const examplePrizePool = calculatePrizePool(10);
  const examplePlacementPrize = splitPlacementPrize(400);

  return (
    <>
      <Navbar />
      <main style={{ background: '#050505', color: '#F5F5F5', paddingTop: 60, paddingBottom: 60 }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 20px' }}>
          <div style={{ ...F, fontSize: 11, letterSpacing: 5, color: '#DC2626', marginBottom: 8, textAlign: 'center' }}>ARCTIC MINI4WD</div>
          <h1 style={{ ...F, fontSize: 40, fontWeight: 900, marginBottom: 20, textAlign: 'center', color: '#F5F5F5' }}>RACER PROFILE &amp; REWARDS</h1>
          <PreviewBanner />

          <section style={{ marginBottom: 48 }}>
            <h2 style={{ ...F, fontSize: 22, fontWeight: 900, marginBottom: 16, color: '#FACC15' }}>Racer Identity (example)</h2>
            <RacerIdentityPanel racer={{ displayName: 'J. Racer', racerId: formatRacerId(47), accountStatus: 'Active', photoUrl: null }} />
          </section>

          <section style={{ marginBottom: 48 }}>
            <h2 style={{ ...F, fontSize: 22, fontWeight: 900, marginBottom: 16, color: '#FACC15' }}>Your Balances (example)</h2>
            <BalanceCards
              balances={{
                loyaltyPoints: 42,
                shopCreditDkk: 100,
                championshipPoints: { boxStock: 12, bmax: 37, currentRank: 3 },
              }}
            />
          </section>

          <section style={{ marginBottom: 48 }}>
            <h2 style={{ ...F, fontSize: 22, fontWeight: 900, marginBottom: 16, color: '#FACC15' }}>Loyalty Rewards Roadmap (example)</h2>
            <LoyaltyRoadmap balance={42} />
          </section>

          <section style={{ marginBottom: 48 }}>
            <h2 style={{ ...F, fontSize: 22, fontWeight: 900, marginBottom: 16, color: '#FACC15' }}>Points Activity (example)</h2>
            <PointsActivityList entries={EXAMPLE_ACTIVITY} />
          </section>

          <section style={{ marginBottom: 48 }}>
            <h2 style={{ ...F, fontSize: 22, fontWeight: 900, marginBottom: 16, color: '#FACC15' }}>Free Physical Racer Card (example)</h2>
            <p style={{ ...FB, fontSize: 14, color: '#B8C1CC', marginBottom: 20, lineHeight: 1.7 }}>
              The QR code identifies your Racer Profile only — it never stores money, prepaid tickets, or transferable lives, and never encodes your email, phone number, or a plain database ID.
            </p>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              <RacerCardFront card={{ displayName: 'J. Racer', racerId: 'AM4WD-0042', issueDate: '15 Jul 2026' }} />
              <RacerCardBack stamps={[
                { eventDate: '25 Jul 2026', eventCode: 'AM4WD-260725', category: 'B-MAX', car: 'Ray Spear', life1Stamped: true, life2Stamped: true, staffInitials: 'JC' },
              ]} />
            </div>
          </section>

          <section style={{ marginBottom: 48 }}>
            <h2 style={{ ...F, fontSize: 22, fontWeight: 900, marginBottom: 16, color: '#FACC15' }}>Prize Pool Example</h2>
            <div style={{ background: '#071426', border: '1px solid rgba(220,38,38,0.25)', borderRadius: 14, padding: '24px 20px' }}>
              <div style={{ ...FB, fontSize: 14, color: '#B8C1CC', marginBottom: 16, lineHeight: 1.7 }}>
                10 confirmed paid first-life entries at 150 DKK each — 65% to the Prize Pool, 35% to Club Operations.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ ...F, fontWeight: 900, fontSize: 24, color: '#F5F5F5' }}>{examplePrizePool.totalRevenue}</div>
                  <div style={{ ...FB, fontSize: 11, color: '#6B7280' }}>Total revenue (DKK)</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ ...F, fontWeight: 900, fontSize: 24, color: '#FACC15' }}>{examplePrizePool.prizePool}</div>
                  <div style={{ ...FB, fontSize: 11, color: '#6B7280' }}>Prize Pool (DKK)</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ ...F, fontWeight: 900, fontSize: 24, color: '#3B82F6' }}>{examplePrizePool.clubOperations}</div>
                  <div style={{ ...FB, fontSize: 11, color: '#6B7280' }}>Club Operations (DKK)</div>
                </div>
              </div>
              <div style={{ ...FB, fontSize: 13, color: '#B8C1CC', lineHeight: 1.7 }}>
                A 400 DKK placement prize would pay <strong style={{ color: '#22C55E' }}>{examplePlacementPrize.cashDkk} DKK cash</strong> + <strong style={{ color: '#22C55E' }}>{examplePlacementPrize.shopCreditDkk} DKK Shop Credit</strong>.
              </div>
            </div>
          </section>

          <section>
            <h2 style={{ ...F, fontSize: 22, fontWeight: 900, marginBottom: 16, color: '#FACC15' }}>How It Works</h2>
            <div style={{ display: 'grid', gap: 12 }}>
              {HOW_IT_WORKS.map((item, i) => (
                <div key={i} style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: 16 }}>
                  <div style={{ ...F, fontSize: 14, fontWeight: 700, color: '#FACC15', marginBottom: 8 }}>{item.title}</div>
                  <div style={{ ...FB, fontSize: 14, color: '#B8C1CC', lineHeight: 1.7 }}>{item.body}</div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}

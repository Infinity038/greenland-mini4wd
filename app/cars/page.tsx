'use client';

import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const F = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
const FB = { fontFamily: "'DM Sans', sans-serif" } as const;

const CHASSIS = [
  {
    id: 'AR',
    name: 'AR Chassis',
    full: 'Aero Racing',
    color: '#DC2626',
    badge: 'MOST POPULAR',
    badgeColor: '#22C55E',
    summary: 'Wide, stable, and forgiving. The best all-rounder for beginners and competitive racers alike.',
    pros: ['Wide body = great stability', 'Easy to tune', 'Lots of parts available', 'Great for box stock racing'],
    cons: ['Slightly heavier than narrow chassis', 'Less cornering speed at high tune'],
    ideal: 'Beginners, Box Stock racing, everyday racers',
    difficulty: 1,
  },
  {
    id: 'MA',
    name: 'MA Chassis',
    full: 'Mid All',
    color: '#3B82F6',
    badge: 'BALANCED',
    badgeColor: '#3B82F6',
    summary: 'Mid-motor layout with excellent balance. A favorite among intermediate racers for technical tracks.',
    pros: ['Balanced weight distribution', 'Good for technical/winding tracks', 'Responsive handling'],
    cons: ['Slightly harder to tune than AR', 'Narrower = more sensitive to rough tracks'],
    ideal: 'Intermediate racers, Technical track layouts',
    difficulty: 2,
  },
  {
    id: 'MS',
    name: 'MS Chassis',
    full: 'Mid Ship',
    color: '#A855F7',
    badge: 'HIGH SPEED',
    badgeColor: '#A855F7',
    summary: 'Mid-ship motor gives excellent weight balance and acceleration. Popular in competition.',
    pros: ['Excellent acceleration', 'Good weight balance', 'Competition favorite'],
    cons: ['More complex to maintain', 'Less beginner-friendly'],
    ideal: 'Intermediate to advanced, Speed-focused racing',
    difficulty: 3,
  },
  {
    id: 'FM-A',
    name: 'FM-A Chassis',
    full: 'Front Mid All',
    color: '#F97316',
    badge: 'UNIQUE',
    badgeColor: '#F97316',
    summary: 'Front-motor design creates unique handling. Cornering specialist with a distinct feel.',
    pros: ['Great cornering characteristics', 'Low front-end weight', 'Unique tuning options'],
    cons: ['Very different feel from other chassis', 'Not ideal for beginners'],
    ideal: 'Experienced builders, Cornering-focused tracks',
    difficulty: 4,
  },
  {
    id: 'VS',
    name: 'VS Chassis',
    full: 'Vertical Side',
    color: '#FACC15',
    badge: 'SPECIALIST',
    badgeColor: '#FACC15',
    summary: 'Vertical motor layout gives extremely low center of gravity. Unique speed characteristics on smooth tracks.',
    pros: ['Very low center of gravity', 'Excellent top speed potential', 'Distinctive design'],
    cons: ['Niche tuning required', 'Not as versatile', 'Advanced only'],
    ideal: 'Advanced racers, Smooth high-speed tracks',
    difficulty: 5,
  },
];

function DifficultyDots({ level }: { level: number }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: i <= level ? '#DC2626' : 'rgba(255,255,255,0.1)' }} />
      ))}
    </div>
  );
}

export default function CarsPage() {
  return (
    <>
      <Navbar />
      <main style={{ background: '#050505', color: '#F5F5F5', paddingTop: 60 }}>

        {/* Hero */}
        <section style={{ background: '#071426', borderBottom: '1px solid rgba(220,38,38,0.2)', padding: '56px 24px 48px', textAlign: 'center' }}>
          <div style={{ maxWidth: 700, margin: '0 auto' }}>
            <div style={{ ...F, fontSize: 11, letterSpacing: 5, color: '#DC2626', marginBottom: 12 }}>BEGINNER GUIDE</div>
            <h1 style={{ ...F, fontWeight: 900, fontSize: 'clamp(40px, 10vw, 80px)', color: '#F5F5F5', margin: '0 0 16px', lineHeight: 0.95 }}>MINI 4WD CARS & CHASSIS</h1>
            <p style={{ ...FB, fontSize: 16, color: '#B8C1CC', lineHeight: 1.7, margin: '0 auto', maxWidth: 560 }}>
              Everything you need to know about Tamiya Mini 4WD — what they are, how they work, and which chassis is right for you.
            </p>
          </div>
        </section>

        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '56px 24px' }}>

          {/* What is Mini 4WD */}
          <div style={{ marginBottom: 64 }}>
            <div style={{ ...F, fontSize: 11, letterSpacing: 5, color: '#DC2626', marginBottom: 12 }}>THE BASICS</div>
            <h2 style={{ ...F, fontWeight: 900, fontSize: 'clamp(28px, 6vw, 52px)', color: '#F5F5F5', margin: '0 0 24px' }}>WHAT IS TAMIYA MINI 4WD?</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
              {[
                { icon: '🏎️', title: 'Self-Powered Race Cars', body: 'Mini 4WD cars are small motorized toy cars powered by standard AA batteries. They race on dedicated tracks at high speed with no remote control — just pure engineering.' },
                { icon: '🔧', title: 'Build & Tune', body: 'You assemble them yourself from a kit. The fun is in building, tuning, and improving your car over time. No two cars are exactly the same.' },
                { icon: '🏁', title: 'Competitive Racing', body: 'Tamiya Mini 4WD has a massive global racing scene with official tournaments, speed records, and dedicated communities worldwide.' },
                { icon: '🌍', title: 'Now in Greenland', body: 'Greenland Mini 4WD Club is bringing this hobby to Nuuk — race events, community building, and a place for Filipinos and locals to connect.' },
              ].map(c => (
                <div key={c.title} style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '24px 20px' }}>
                  <div style={{ fontSize: 28, marginBottom: 12 }}>{c.icon}</div>
                  <div style={{ ...F, fontWeight: 700, fontSize: 18, color: '#F5F5F5', marginBottom: 8 }}>{c.title}</div>
                  <p style={{ ...FB, fontSize: 14, color: '#B8C1CC', lineHeight: 1.6, margin: 0 }}>{c.body}</p>
                </div>
              ))}
            </div>
          </div>

          {/* What is Box Stock */}
          <div style={{ background: '#071426', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 16, padding: '32px 28px', marginBottom: 64 }}>
            <div style={{ ...F, fontSize: 11, letterSpacing: 5, color: '#DC2626', marginBottom: 8 }}>OUR RACE FORMAT</div>
            <h2 style={{ ...F, fontWeight: 900, fontSize: 'clamp(24px, 5vw, 40px)', color: '#F5F5F5', margin: '0 0 16px' }}>WHAT IS BOX STOCK RACING?</h2>
            <p style={{ ...FB, fontSize: 15, color: '#B8C1CC', lineHeight: 1.7, marginBottom: 20 }}>
              Box Stock means your car must run exactly as it comes from the box — no modifications allowed. Same motor, same gears, same rollers. The only variable is your car choice and how well you assemble it.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              {[
                { icon: '✅', text: 'Any official Tamiya chassis' },
                { icon: '✅', text: 'Stock motor (unmodified)' },
                { icon: '✅', text: 'Stock gears' },
                { icon: '✅', text: 'Stock rollers' },
                { icon: '✅', text: 'Alkaline AA batteries only' },
                { icon: '❌', text: 'No cutting or drilling' },
                { icon: '❌', text: 'No motor modifications' },
                { icon: '❌', text: 'No rechargeable batteries' },
              ].map(r => (
                <div key={r.text} style={{ ...FB, fontSize: 14, color: r.icon === '✅' ? '#B8C1CC' : '#6B7280', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>{r.icon}</span> {r.text}
                </div>
              ))}
            </div>
          </div>

          {/* Chassis guide */}
          <div style={{ marginBottom: 64 }}>
            <div style={{ ...F, fontSize: 11, letterSpacing: 5, color: '#DC2626', marginBottom: 12 }}>CHASSIS GUIDE</div>
            <h2 style={{ ...F, fontWeight: 900, fontSize: 'clamp(28px, 6vw, 52px)', color: '#F5F5F5', margin: '0 0 8px' }}>CHOOSE YOUR CHASSIS</h2>
            <p style={{ ...FB, fontSize: 15, color: '#B8C1CC', marginBottom: 32 }}>The chassis is the backbone of your Mini 4WD. Each has unique characteristics. For Box Stock racing, any official Tamiya chassis is allowed.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {CHASSIS.map(c => (
                <div key={c.id} style={{ background: '#071426', border: `1px solid ${c.color}22`, borderRadius: 16, padding: 24, borderLeft: `3px solid ${c.color}` }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <span style={{ ...F, fontWeight: 900, fontSize: 28, color: c.color }}>{c.id}</span>
                        <span style={{ ...F, fontSize: 11, letterSpacing: 2, padding: '3px 10px', borderRadius: 20, background: c.badgeColor + '22', color: c.badgeColor, border: `1px solid ${c.badgeColor}44` }}>{c.badge}</span>
                      </div>
                      <div style={{ ...F, fontWeight: 700, fontSize: 18, color: '#F5F5F5', marginBottom: 2 }}>{c.name} <span style={{ color: '#B8C1CC', fontSize: 14, fontWeight: 400 }}>({c.full})</span></div>
                      <p style={{ ...FB, fontSize: 14, color: '#B8C1CC', margin: '8px 0 0', lineHeight: 1.5, maxWidth: 500 }}>{c.summary}</p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ ...F, fontSize: 10, letterSpacing: 3, color: '#B8C1CC', marginBottom: 6 }}>DIFFICULTY</div>
                      <DifficultyDots level={c.difficulty} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <div style={{ ...F, fontSize: 10, letterSpacing: 3, color: '#22C55E', marginBottom: 6 }}>PROS</div>
                      {c.pros.map(p => <div key={p} style={{ ...FB, fontSize: 13, color: '#B8C1CC', display: 'flex', gap: 6, marginBottom: 3 }}><span style={{ color: '#22C55E' }}>+</span>{p}</div>)}
                    </div>
                    <div>
                      <div style={{ ...F, fontSize: 10, letterSpacing: 3, color: '#DC2626', marginBottom: 6 }}>CONS</div>
                      {c.cons.map(p => <div key={p} style={{ ...FB, fontSize: 13, color: '#B8C1CC', display: 'flex', gap: 6, marginBottom: 3 }}><span style={{ color: '#DC2626' }}>−</span>{p}</div>)}
                    </div>
                  </div>
                  <div style={{ marginTop: 12, ...F, fontSize: 12, letterSpacing: 2, color: c.color }}>IDEAL FOR: <span style={{ ...FB, fontSize: 13, color: '#B8C1CC', letterSpacing: 0 }}>{c.ideal}</span></div>
                </div>
              ))}
            </div>
          </div>

          {/* Boxed vs Built */}
          <div style={{ marginBottom: 64 }}>
            <div style={{ ...F, fontSize: 11, letterSpacing: 5, color: '#DC2626', marginBottom: 12 }}>BUYING OPTIONS</div>
            <h2 style={{ ...F, fontWeight: 900, fontSize: 'clamp(24px, 5vw, 44px)', color: '#F5F5F5', margin: '0 0 20px' }}>BOXED KIT vs BUILT/READY</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
              <div style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 28 }}>
                <div style={{ ...F, fontWeight: 900, fontSize: 22, color: '#F5F5F5', marginBottom: 4 }}>🔧 BOXED KIT</div>
                <div style={{ ...F, fontSize: 12, letterSpacing: 2, color: '#B8C1CC', marginBottom: 16 }}>BUILD IT YOURSELF</div>
                <ul style={{ ...FB, fontSize: 14, color: '#B8C1CC', lineHeight: 2, margin: 0, paddingLeft: 0, listStyle: 'none' }}>
                  <li>✅ You assemble the car from scratch</li>
                  <li>✅ Learn how every part works</li>
                  <li>✅ Lower price</li>
                  <li>✅ Great hobby experience</li>
                  <li>⏱️ Takes 1–3 hours to build</li>
                  <li>🔧 Basic tools needed</li>
                </ul>
              </div>
              <div style={{ background: '#071426', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 16, padding: 28, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, #DC2626, transparent)' }} />
                <div style={{ ...F, fontWeight: 900, fontSize: 22, color: '#F5F5F5', marginBottom: 4 }}>⚡ BUILT / READY-TO-RACE</div>
                <div style={{ ...F, fontSize: 12, letterSpacing: 2, color: '#DC2626', marginBottom: 16 }}>ASSEMBLED + TESTED</div>
                <ul style={{ ...FB, fontSize: 14, color: '#B8C1CC', lineHeight: 2, margin: 0, paddingLeft: 0, listStyle: 'none' }}>
                  <li>✅ Fully assembled by our team</li>
                  <li>✅ Tested and race-ready</li>
                  <li>✅ Race the same day you pick it up</li>
                  <li>✅ Perfect if you're new to building</li>
                  <li>💰 Higher price (assembly included)</li>
                  <li>🏁 Best for first race day</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Beginner recommendation */}
          <div style={{ background: 'linear-gradient(135deg, #071426, #0D1B2A)', border: '1px solid rgba(220,38,38,0.25)', borderRadius: 20, padding: '36px 32px', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🤔</div>
            <h2 style={{ ...F, fontWeight: 900, fontSize: 'clamp(24px, 5vw, 40px)', color: '#F5F5F5', margin: '0 0 16px' }}>NOT SURE WHAT TO BUY FIRST?</h2>
            <p style={{ ...FB, fontSize: 15, color: '#B8C1CC', lineHeight: 1.7, maxWidth: 500, margin: '0 auto 28px' }}>
              We recommend starting with an <strong style={{ color: '#F5F5F5' }}>AR Chassis</strong> — either the Ray Spear or Flame Astute. It's the most beginner-friendly, has great parts availability, and is competitive in Box Stock racing.
            </p>
            <p style={{ ...FB, fontSize: 14, color: '#B8C1CC', margin: '0 auto 28px', maxWidth: 460 }}>
              If you've never built a Mini 4WD before, consider the <strong style={{ color: '#DC2626' }}>Built/Ready version</strong> — we'll assemble and test it for you so you can race immediately.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <a href="/shop" style={{ background: '#DC2626', color: '#fff', padding: '14px 32px', borderRadius: 10, ...F, fontWeight: 900, fontSize: 17, letterSpacing: 2, textDecoration: 'none' }}>SHOP NOW →</a>
              <a href="/tickets?tab=rules" style={{ background: 'transparent', color: '#F5F5F5', padding: '14px 32px', borderRadius: 10, ...F, fontWeight: 700, fontSize: 17, letterSpacing: 2, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.15)' }}>SEE RACE RULES</a>
            </div>
          </div>

        </div>
      </main>
      <Footer />
    </>
  );
}
// @ts-nocheck
'use client';

import { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const F = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
const FB = { fontFamily: "'DM Sans', sans-serif" } as const;

const CHASSIS = [
  {
    id: 'AR', name: 'AR Chassis', full: 'Aero Racing', color: '#DC2626',
    badge: 'MOST POPULAR', badgeColor: '#22C55E',
    summary: 'Wide, stable, and forgiving. The best all-rounder for beginners and competitive racers alike.',
    pros: ['Wide body = great stability', 'Easy to tune', 'Lots of parts available', 'Great for box stock racing'],
    cons: ['Slightly heavier than narrow chassis', 'Less cornering speed at high tune'],
    ideal: 'Beginners, Box Stock racing, everyday racers', difficulty: 1,
  },
  {
    id: 'EZ', name: 'EZ Chassis', full: 'Easy', color: '#22C55E',
    badge: 'EASIEST BUILD', badgeColor: '#22C55E',
    summary: "Tamiya's newest beginner-focused chassis, simplified for the fastest, easiest assembly with no special tools needed.",
    pros: ['Simplest assembly of any chassis', 'Great for kids & first-timers', 'Snap-together friendly design'],
    cons: ['Smaller Grade-Up parts ecosystem', 'Less tunable than AR/MA for advanced racing'],
    ideal: 'First-time builders, kids, absolute beginners', difficulty: 1,
  },
  {
    id: 'FM-A', name: 'FM-A Chassis', full: 'Front Mid All', color: '#F97316',
    badge: 'UNIQUE', badgeColor: '#F97316',
    summary: 'Front-motor design creates unique handling. Cornering specialist with a distinct feel.',
    pros: ['Great cornering characteristics', 'Low front-end weight', 'Unique tuning options'],
    cons: ['Very different feel from other chassis', 'Not ideal for beginners'],
    ideal: 'Experienced builders, Cornering-focused tracks', difficulty: 4,
  },
  {
    id: 'MA', name: 'MA Chassis', full: 'Mid All', color: '#3B82F6',
    badge: 'BALANCED', badgeColor: '#3B82F6',
    summary: 'Mid-motor layout with excellent balance. A favorite among intermediate racers for technical tracks.',
    pros: ['Balanced weight distribution', 'Good for technical/winding tracks', 'Responsive handling'],
    cons: ['Slightly harder to tune than AR', 'Narrower = more sensitive to rough tracks'],
    ideal: 'Intermediate racers, Technical track layouts', difficulty: 2,
  },
  {
    id: 'ME', name: 'ME Chassis', full: 'Mid Evolution', color: '#06B6D4',
    badge: 'RIGID', badgeColor: '#06B6D4',
    summary: 'Midship double-shaft layout balancing rigidity and flex for a fluid, stable drive — six rollers standard.',
    pros: ['Great rigidity-to-flex balance', 'Six rollers stock', 'Separately molded bumpers for easy swaps'],
    cons: ['Heavier than entry chassis', 'Smaller parts ecosystem than MA/MS'],
    ideal: 'Stability-focused racers, Technical tracks', difficulty: 2,
  },
  {
    id: 'MS', name: 'MS Chassis', full: 'Mid Ship', color: '#A855F7',
    badge: 'HIGH SPEED', badgeColor: '#A855F7',
    summary: 'Mid-ship motor gives excellent weight balance and acceleration. Popular in competition.',
    pros: ['Excellent acceleration', 'Good weight balance', 'Competition favorite'],
    cons: ['More complex to maintain', 'Less beginner-friendly'],
    ideal: 'Intermediate to advanced, Speed-focused racing', difficulty: 3,
  },
  {
    id: 'S2', name: 'Super II Chassis', full: 'Super-II', color: '#10B981',
    badge: 'CLASSIC', badgeColor: '#10B981',
    summary: 'A reinforced evolution of the Super-1, built for race-day toughness with screw-secured access for fast maintenance.',
    pros: ['Reinforced bumper', 'Screw-secured cover for quick access', 'Excellent durability'],
    cons: ['Narrower tread than modern chassis', 'Fewer Grade-Up parts available'],
    ideal: 'Retro racing, Durability-focused builds', difficulty: 2,
  },
  {
    id: 'Super XX', name: 'Super XX Chassis', full: 'Super XX', color: '#EC4899',
    badge: 'RARE', badgeColor: '#EC4899',
    summary: 'A legendary vintage chassis combining nostalgia with surprising competitiveness. Highly collectable.',
    pros: ['True retro appeal', 'Surprisingly responsive', 'Iconic design'],
    cons: ['Limited parts ecosystem', 'Heavier than modern designs'],
    ideal: 'Collectors, Retro enthusiasts, vintage racing', difficulty: 3,
  },
  {
    id: 'VS', name: 'VS Chassis', full: 'Vanguard Street', color: '#8B5CF6',
    badge: 'MODERN', badgeColor: '#8B5CF6',
    summary: 'Modern street-style chassis with updated geometry and tuning range. Balance of classic looks and contemporary performance.',
    pros: ['Great modern design', 'Solid all-around performer', 'Good parts support'],
    cons: ['Mid-range difficulty build', 'Less niche-specific than specialized chassis'],
    ideal: 'Modern street builds, balanced racers', difficulty: 2,
  },
  {
    id: 'VZ', name: 'VZ Chassis', full: 'Vanguard Zero', color: '#06B6D4',
    badge: 'CUTTING-EDGE', badgeColor: '#06B6D4',
    summary: 'The latest Tamiya design, packed with modern innovations for the contemporary racer. Future-focused engineering.',
    pros: ['Latest Tamiya tech', 'Excellent stock performance', 'Modern parts available'],
    cons: ['Still discovering optimal tuning', 'Newest = least proven'],
    ideal: 'Tech enthusiasts, modern competitive racing', difficulty: 2,
  },
];

export default function CarsPage() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <>
      <Navbar />
      <main style={{ background: '#050505', color: '#F5F5F5', paddingTop: 60, paddingBottom: 60 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 20px' }}>
          <h1 style={{ ...F, fontSize: 32, fontWeight: 900, marginBottom: 40, textAlign: 'center' }}>CHASSIS GUIDE</h1>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 40 }}>
            {CHASSIS.map(c => (
              <div key={c.id} onClick={() => setSelected(selected === c.id ? null : c.id)}
                style={{ background: `linear-gradient(135deg, ${c.color}20, transparent)`, border: `1px solid ${c.color}40`, borderRadius: 12, padding: 20, cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = `${c.color}80`; e.currentTarget.style.boxShadow = `0 0 20px ${c.color}30`; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = `${c.color}40`; e.currentTarget.style.boxShadow = 'none'; }}>
                <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div>
                    <div style={{ ...F, fontSize: 18, fontWeight: 900, color: c.color }}>{c.name}</div>
                    <div style={{ ...FB, fontSize: 12, color: '#B8C1CC' }}>{c.full}</div>
                  </div>
                  <span style={{ ...F, fontSize: 10, fontWeight: 700, background: c.badgeColor, color: '#050505', padding: '4px 8px', borderRadius: 4, whiteSpace: 'nowrap' }}>{c.badge}</span>
                </div>
                <div style={{ ...FB, fontSize: 13, color: '#B8C1CC', marginBottom: 12, lineHeight: 1.6 }}>{c.summary}</div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                  {Array.from({ length: c.difficulty }).map((_, i) => (<div key={i} style={{ width: 8, height: 8, background: c.color, borderRadius: 2 }} />))}
                  {Array.from({ length: 5 - c.difficulty }).map((_, i) => (<div key={`empty-${i}`} style={{ width: 8, height: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 2 }} />))}
                </div>
                {selected === c.id && (
                  <div style={{ marginTop: 16, borderTop: `1px solid ${c.color}40`, paddingTop: 16 }}>
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ ...F, fontSize: 11, fontWeight: 700, color: '#FACC15', marginBottom: 4 }}>✓ PROS</div>
                      <ul style={{ ...FB, fontSize: 12, color: '#B8C1CC', margin: 0, paddingLeft: 20 }}>
                        {c.pros.map((p, i) => (<li key={i} style={{ marginBottom: 4 }}>{p}</li>))}
                      </ul>
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ ...F, fontSize: 11, fontWeight: 700, color: '#DC2626', marginBottom: 4 }}>✗ CONS</div>
                      <ul style={{ ...FB, fontSize: 12, color: '#B8C1CC', margin: 0, paddingLeft: 20 }}>
                        {c.cons.map((con, i) => (<li key={i} style={{ marginBottom: 4 }}>{con}</li>))}
                      </ul>
                    </div>
                    <div>
                      <div style={{ ...F, fontSize: 11, fontWeight: 700, color: '#22C55E', marginBottom: 4 }}>👥 IDEAL FOR</div>
                      <div style={{ ...FB, fontSize: 12, color: '#B8C1CC' }}>{c.ideal}</div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
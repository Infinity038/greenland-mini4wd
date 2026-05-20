'use client';

import { useState } from 'react';
import { RANK_COLORS } from '@/lib/member';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const F = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
const FB = { fontFamily: "'DM Sans', sans-serif" } as const;

type Cat = 'points' | 'wins' | 'fastest' | 'active' | 'referrals' | 'rookie';

const PLAYERS = [
  { name: 'Jovannie M.', rank: 'Legend',     points: 520, wins: 12, fastest_ms: 4820, races: 28, referrals: 5, rookie: false },
  { name: 'Carlo R.',    rank: 'Champion',   points: 310, wins: 7,  fastest_ms: 4950, races: 21, referrals: 3, rookie: false },
  { name: 'Mark A.',     rank: 'Contender',  points: 185, wins: 4,  fastest_ms: 5100, races: 16, referrals: 2, rookie: false },
  { name: 'Renz D.',     rank: 'Tuner',      points: 90,  wins: 2,  fastest_ms: 5250, races: 11, referrals: 1, rookie: false },
  { name: 'Jake P.',     rank: 'Racer',      points: 55,  wins: 1,  fastest_ms: 5380, races: 8,  referrals: 0, rookie: false },
  { name: 'Luis G.',     rank: 'Builder',    points: 22,  wins: 0,  fastest_ms: 5600, races: 4,  referrals: 2, rookie: false },
  { name: 'Erik N.',     rank: 'Rookie',     points: 8,   wins: 0,  fastest_ms: 5900, races: 2,  referrals: 1, rookie: true  },
  { name: 'Nico B.',     rank: 'Rookie',     points: 5,   wins: 0,  fastest_ms: 6100, races: 1,  referrals: 0, rookie: true  },
];

const CATS: { key: Cat; label: string; icon: string }[] = [
  { key: 'points',   label: 'Overall Points',  icon: '🏆' },
  { key: 'wins',     label: 'Most Wins',        icon: '🥇' },
  { key: 'fastest',  label: 'Fastest Lap',      icon: '⚡' },
  { key: 'active',   label: 'Most Active',      icon: '🔥' },
  { key: 'referrals',label: 'Referral Champs',  icon: '📣' },
  { key: 'rookie',   label: 'Rookie Standings', icon: '🌟' },
];

function getSorted(cat: Cat) {
  const base = cat === 'rookie' ? PLAYERS.filter(p => p.rookie) : PLAYERS;
  if (cat === 'wins')      return [...base].sort((a, b) => b.wins - a.wins);
  if (cat === 'fastest')   return [...base].sort((a, b) => a.fastest_ms - b.fastest_ms);
  if (cat === 'active')    return [...base].sort((a, b) => b.races - a.races);
  if (cat === 'referrals') return [...base].sort((a, b) => b.referrals - a.referrals);
  return [...base].sort((a, b) => b.points - a.points);
}

function getStat(p: typeof PLAYERS[0], cat: Cat): string {
  if (cat === 'wins')      return `${p.wins} wins`;
  if (cat === 'fastest')   return `${(p.fastest_ms / 1000).toFixed(3)}s`;
  if (cat === 'active')    return `${p.races} races`;
  if (cat === 'referrals') return `${p.referrals} refs`;
  return `${p.points} pts`;
}

export default function LeaderboardPage() {
  const [cat, setCat] = useState<Cat>('points');
  const sorted = getSorted(cat);
  const top3 = sorted.slice(0, 3);
  const rest = sorted.slice(3);

  // Podium order: 2nd, 1st, 3rd
  const podium = [top3[1], top3[0], top3[2]].filter(Boolean);
  const podiumPos = [2, 1, 3];
  const podiumH = [88, 120, 72];

  return (
    <>
      <Navbar />
      <main style={{ background: '#050505', color: '#F5F5F5', minHeight: '100vh', paddingTop: 60 }}>

        {/* Header */}
        <section style={{ background: '#071426', borderBottom: '1px solid rgba(220,38,38,0.2)', padding: '48px 24px 32px' }}>
          <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <div style={{ ...F, fontSize: 11, letterSpacing: 5, color: '#DC2626', marginBottom: 8 }}>RANKINGS</div>
            <h1 style={{ ...F, fontWeight: 900, fontSize: 'clamp(40px, 10vw, 80px)', color: '#F5F5F5', margin: '0 0 8px', lineHeight: 0.95 }}>LEADERBOARD</h1>
            <p style={{ ...FB, fontSize: 14, color: '#B8C1CC', margin: 0 }}>Demo data — live rankings unlock after first official race event.</p>
          </div>
        </section>

        <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>

          {/* Category tabs — scrollable */}
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 32, WebkitOverflowScrolling: 'touch' as any }}>
            {CATS.map(c => (
              <button
                key={c.key}
                onClick={() => setCat(c.key)}
                style={{ ...F, fontWeight: 700, fontSize: 13, letterSpacing: 1, padding: '10px 16px', border: cat === c.key ? 'none' : '1px solid rgba(255,255,255,0.1)', borderRadius: 10, background: cat === c.key ? '#DC2626' : '#071426', color: cat === c.key ? '#fff' : '#B8C1CC', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
              >
                {c.icon} {c.label}
              </button>
            ))}
          </div>

          {/* Podium */}
          {sorted.length >= 2 && (
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 12, marginBottom: 40 }}>
              {podium.map((player, i) => {
                const pos = podiumPos[i];
                const rc = RANK_COLORS[player.rank as keyof typeof RANK_COLORS] || '#6B7280';
                return (
                  <div key={player.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, maxWidth: 160 }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: rc + '22', border: `2px solid ${rc}`, display: 'flex', alignItems: 'center', justifyContent: 'center', ...F, fontWeight: 900, fontSize: 20, color: rc, marginBottom: 8 }}>
                      {player.name[0]}
                    </div>
                    <div style={{ ...F, fontWeight: 900, fontSize: 15, color: '#F5F5F5', textAlign: 'center', marginBottom: 2 }}>{player.name}</div>
                    <div style={{ ...F, fontSize: 12, color: rc, marginBottom: 4 }}>{player.rank}</div>
                    <div style={{ ...F, fontWeight: 900, fontSize: 18, color: '#FACC15', marginBottom: 8 }}>{getStat(player, cat)}</div>
                    <div style={{ width: '100%', height: podiumH[i], borderRadius: '8px 8px 0 0', background: pos === 1 ? 'rgba(250,204,21,0.15)' : '#071426', border: `1px solid ${pos === 1 ? '#FACC15' : 'rgba(255,255,255,0.08)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
                      {pos === 1 ? '🥇' : pos === 2 ? '🥈' : '🥉'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Full rankings */}
          <div style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden', marginBottom: 32 }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ ...F, fontWeight: 700, fontSize: 13, letterSpacing: 3, color: '#F5F5F5' }}>FULL RANKINGS</span>
              <span style={{ ...FB, fontSize: 13, color: '#B8C1CC' }}>{sorted.length} racers</span>
            </div>
            {sorted.map((player, idx) => {
              const rc = RANK_COLORS[player.rank as keyof typeof RANK_COLORS] || '#6B7280';
              return (
                <div key={player.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: idx < sorted.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                  <div style={{ ...F, fontWeight: 900, fontSize: 18, color: idx < 3 ? '#FACC15' : '#B8C1CC', width: 28, textAlign: 'center' }}>{idx + 1}</div>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: rc + '22', border: `1px solid ${rc}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', ...F, fontWeight: 900, fontSize: 16, color: rc, flexShrink: 0 }}>
                    {player.name[0]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ ...F, fontWeight: 700, fontSize: 17, color: '#F5F5F5' }}>{player.name}</div>
                    <div style={{ ...F, fontSize: 12, color: rc }}>{player.rank}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ ...F, fontWeight: 900, fontSize: 18, color: '#F5F5F5' }}>{getStat(player, cat)}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Rank legend */}
          <div style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 24 }}>
            <div style={{ ...F, fontWeight: 700, fontSize: 13, letterSpacing: 3, color: '#B8C1CC', marginBottom: 16 }}>MEMBER RANK SYSTEM</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10, marginBottom: 16 }}>
              {Object.entries(RANK_COLORS).map(([rank, color]) => (
                <div key={rank} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                  <span style={{ ...F, fontWeight: 700, fontSize: 15, color }}>{rank}</span>
                </div>
              ))}
            </div>
            <p style={{ ...FB, fontSize: 13, color: '#B8C1CC', margin: 0 }}>
              Ranks earned through race participation, wins, fastest laps, attendance, referrals, and improvement over time.
            </p>
          </div>

        </div>
      </main>
      <Footer />
    </>
  );
}
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { RANK_COLORS } from '@/lib/member';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

type LeaderCategory = 'points' | 'wins' | 'fastest' | 'active' | 'referrals' | 'rookie';

const DEMO_PLAYERS = [
  { name: 'Jovannie M.', rank: 'Legend', points: 520, wins: 12, fastest_ms: 4820, races: 28, referrals: 5, is_rookie: false },
  { name: 'Carlo R.', rank: 'Champion', points: 310, wins: 7, fastest_ms: 4950, races: 21, referrals: 3, is_rookie: false },
  { name: 'Mark A.', rank: 'Contender', points: 185, wins: 4, fastest_ms: 5100, races: 16, referrals: 2, is_rookie: false },
  { name: 'Renz D.', rank: 'Tuner', points: 90, wins: 2, fastest_ms: 5250, races: 11, referrals: 1, is_rookie: false },
  { name: 'Jake P.', rank: 'Racer', points: 55, wins: 1, fastest_ms: 5380, races: 8, referrals: 0, is_rookie: false },
  { name: 'Luis G.', rank: 'Builder', points: 22, wins: 0, fastest_ms: 5600, races: 4, referrals: 2, is_rookie: false },
  { name: 'Erik N.', rank: 'Rookie', points: 8, wins: 0, fastest_ms: 5900, races: 2, referrals: 1, is_rookie: true },
  { name: 'Nico B.', rank: 'Rookie', points: 5, wins: 0, fastest_ms: 6100, races: 1, referrals: 0, is_rookie: true },
];

const CATEGORIES: { key: LeaderCategory; label: string; icon: string }[] = [
  { key: 'points', label: 'Overall Points', icon: '🏆' },
  { key: 'wins', label: 'Most Wins', icon: '🥇' },
  { key: 'fastest', label: 'Fastest Lap', icon: '⚡' },
  { key: 'active', label: 'Most Active', icon: '🔥' },
  { key: 'referrals', label: 'Referral Champs', icon: '📣' },
  { key: 'rookie', label: 'Rookie Standings', icon: '🌟' },
];

function formatLap(ms: number) {
  const s = (ms / 1000).toFixed(3);
  return `${s}s`;
}

function getSorted(players: typeof DEMO_PLAYERS, cat: LeaderCategory) {
  const base = cat === 'rookie' ? players.filter(p => p.is_rookie) : players;
  switch (cat) {
    case 'points': return [...base].sort((a, b) => b.points - a.points);
    case 'wins': return [...base].sort((a, b) => b.wins - a.wins);
    case 'fastest': return [...base].sort((a, b) => a.fastest_ms - b.fastest_ms);
    case 'active': return [...base].sort((a, b) => b.races - a.races);
    case 'referrals': return [...base].sort((a, b) => b.referrals - a.referrals);
    case 'rookie': return [...base].sort((a, b) => b.points - a.points);
    default: return base;
  }
}

function getStatDisplay(p: typeof DEMO_PLAYERS[0], cat: LeaderCategory) {
  switch (cat) {
    case 'points': return { value: p.points, unit: 'pts' };
    case 'wins': return { value: p.wins, unit: 'wins' };
    case 'fastest': return { value: formatLap(p.fastest_ms), unit: 'best lap' };
    case 'active': return { value: p.races, unit: 'races' };
    case 'referrals': return { value: p.referrals, unit: 'referrals' };
    case 'rookie': return { value: p.points, unit: 'pts' };
  }
}

export default function LeaderboardPage() {
  const [cat, setCat] = useState<LeaderCategory>('points');
  const sorted = getSorted(DEMO_PLAYERS, cat);
  const top3 = sorted.slice(0, 3);
  const rest = sorted.slice(3);

  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean);
  const podiumHeights = ['h-24', 'h-32', 'h-20'];
  const podiumPositions = [2, 1, 3];

  return (
    <div className="min-h-screen bg-[#050505]">
      <Navbar />

      <div className="pt-24 pb-16 px-4 max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="text-[#DC2626] font-barlaw font-black text-sm uppercase tracking-widest mb-2">Rankings</div>
          <h1 className="text-4xl font-barlaw font-black text-white uppercase">Leaderboard</h1>
          <p className="text-[#B8C1CC] mt-1 text-sm">Demo data — live rankings unlock after first official race event.</p>
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-8">
          {CATEGORIES.map(c => (
            <button
              key={c.key}
              onClick={() => setCat(c.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-barlaw font-bold uppercase tracking-wider whitespace-nowrap transition-colors ${
                cat === c.key
                  ? 'bg-[#DC2626] text-white'
                  : 'bg-[#071426] text-[#B8C1CC] border border-white/10 hover:text-white'
              }`}
            >
              <span>{c.icon}</span> {c.label}
            </button>
          ))}
        </div>

        {/* Podium */}
        {sorted.length >= 3 && (
          <div className="flex items-end justify-center gap-2 mb-10">
            {podiumOrder.map((player, i) => {
              const pos = podiumPositions[i];
              const rankColor = RANK_COLORS[player.rank as keyof typeof RANK_COLORS] || '#6B7280';
              const stat = getStatDisplay(player, cat);
              return (
                <div key={player.name} className="flex flex-col items-center flex-1 max-w-[140px]">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-barlaw font-black mb-2"
                    style={{ backgroundColor: rankColor + '22', color: rankColor, border: `2px solid ${rankColor}` }}>
                    {player.name[0]}
                  </div>
                  <div className="text-white font-barlaw font-black text-sm text-center leading-tight">{player.name}</div>
                  <div className="text-xs text-center mt-0.5" style={{ color: rankColor }}>{player.rank}</div>
                  <div className="text-[#FACC15] font-barlaw font-black text-lg">{stat.value}</div>
                  <div
                    className={`w-full ${podiumHeights[i]} rounded-t-xl mt-2 flex items-center justify-center text-2xl font-barlaw font-black`}
                    style={{
                      backgroundColor: pos === 1 ? '#FACC1522' : '#071426',
                      border: `1px solid ${pos === 1 ? '#FACC15' : 'rgba(255,255,255,0.1)'}`,
                      color: pos === 1 ? '#FACC15' : pos === 2 ? '#D1D5DB' : '#C2773B'
                    }}
                  >
                    {pos === 1 ? '🥇' : pos === 2 ? '🥈' : '🥉'}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Full rankings */}
        <div className="bg-[#071426] rounded-2xl border border-white/10 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <span className="font-barlaw font-black text-white uppercase tracking-wider text-sm">Full Rankings</span>
            <span className="text-xs text-[#B8C1CC]">{sorted.length} racers</span>
          </div>
          {sorted.map((player, idx) => {
            const rankColor = RANK_COLORS[player.rank as keyof typeof RANK_COLORS] || '#6B7280';
            const stat = getStatDisplay(player, cat);
            return (
              <div
                key={player.name}
                className="flex items-center gap-3 px-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors"
              >
                <div className={`w-8 text-center font-barlaw font-black text-lg ${idx < 3 ? 'text-[#FACC15]' : 'text-[#B8C1CC]'}`}>
                  {idx + 1}
                </div>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-barlaw font-black flex-shrink-0"
                  style={{ backgroundColor: rankColor + '22', color: rankColor }}>
                  {player.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-barlaw font-bold text-white truncate">{player.name}</div>
                  <div className="text-xs" style={{ color: rankColor }}>{player.rank}</div>
                </div>
                <div className="text-right">
                  <div className="font-barlaw font-black text-white">{stat.value}</div>
                  <div className="text-xs text-[#B8C1CC]">{stat.unit}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Rank legend */}
        <div className="mt-8 bg-[#071426] rounded-2xl border border-white/10 p-5">
          <h3 className="font-barlaw font-black text-white uppercase tracking-wider mb-4 text-sm">Member Rank System</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(RANK_COLORS).map(([rank, color]) => (
              <div key={rank} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                <span className="text-sm font-bold" style={{ color }}>{rank}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-[#B8C1CC] mt-3">
            Ranks are earned through race participation, wins, fastest laps, attendance, referrals, and improvement over time.
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
}
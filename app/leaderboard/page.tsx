// @ts-nocheck
'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { isRegistered } from '@/lib/member';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const CATEGORIES = ['Box Stock', 'Open Box Stock', 'B-Max', 'Open Class'];

const TIER_COLORS: Record<string, string> = {
  hall_of_fame: '#FFD700',
  season_1st: '#DC2626',
  season_2nd: '#9CA3AF',
  season_3rd: '#CD7C2F',
  member: '#3B82F6',
  non_member: '#4B5563',
};

const TIER_LABELS: Record<string, string> = {
  hall_of_fame: '🏛️ Hall of Fame',
  season_1st: '🏆 Champion',
  season_2nd: '🥈 2nd Place',
  season_3rd: '🥉 3rd Place',
  member: '👥 Member',
  non_member: 'No Membership',
};

const HOF_LABELS: Record<string, string> = {
  fastest_lap: '⚡ Fastest Official Time',
  most_wins: '🏆 Most Wins',
  most_races: '🏁 Most Races',
  most_championships: '👑 Most Championships',
  most_points: '⭐ Top Scorer',
};

export default function LeaderboardPage() {
  const [tab, setTab] = useState<'season' | 'hof'>('season');
  const [standings, setStandings] = useState<any[]>([]);
  const [hof, setHof] = useState<any[]>([]);
  const [seasons, setSeasons] = useState<any[]>([]);
  const [activeSeason, setActiveSeason] = useState<any>(null);
  const [selectedSeason, setSelectedSeason] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>(CATEGORIES[0]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchSeasons();
    fetchHof();
  }, []);

  useEffect(() => {
    if (selectedSeason && selectedCategory) fetchStandings(selectedSeason, selectedCategory);
  }, [selectedSeason, selectedCategory]);

  async function fetchSeasons() {
    const { data } = await supabase.from('seasons').select('*').order('created_at', { ascending: false });
    if (data) {
      setSeasons(data);
      const active = data.find((s: any) => s.is_active);
      if (active) {
        setActiveSeason(active);
        setSelectedSeason(active.id);
      } else if (data.length > 0) {
        setSelectedSeason(data[0].id);
      }
    }
  }

  async function fetchStandings(seasonId: string, category: string) {
    setLoading(true);
    const { data } = await supabase
      .from('season_standings')
      .select('*')
      .eq('season_id', seasonId)
      .eq('race_category', category)
      .order('season_rank', { ascending: true });
    setStandings(data || []);
    setLoading(false);
  }

  async function fetchHof() {
    const { data } = await supabase.from('hall_of_fame').select('*');
    setHof(data || []);
  }

  function timeSince(date: string) {
    const diff = now.getTime() - new Date(date).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days < 1) return 'Today';
    if (days === 1) return '1 day';
    if (days < 30) return `${days} days`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} month${months > 1 ? 's' : ''}`;
    return `${Math.floor(months / 12)} year${Math.floor(months / 12) > 1 ? 's' : ''}`;
  }

  function getRankStyle(rank: number) {
    if (rank === 1) return { color: '#DC2626', fontSize: '20px' };
    if (rank === 2) return { color: '#9CA3AF', fontSize: '18px' };
    if (rank === 3) return { color: '#CD7C2F', fontSize: '18px' };
    return { color: '#6B7280', fontSize: '16px' };
  }

  const s: Record<string, any> = {
    page: { background: '#050505', minHeight: '100vh', color: '#F5F5F5', fontFamily: "'DM Sans', sans-serif", paddingBottom: '60px' },
    hero: { background: 'linear-gradient(135deg, #071426 0%, #0a0a0a 100%)', borderBottom: '1px solid rgba(220,38,38,0.3)', padding: '48px 24px 32px' },
    heroInner: { maxWidth: '900px', margin: '0 auto' },
    eyebrow: { fontSize: '11px', letterSpacing: '4px', color: '#DC2626', textTransform: 'uppercase' as const, marginBottom: '8px', fontFamily: "'Barlow Condensed', sans-serif" },
    title: { fontSize: '42px', fontWeight: 900, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '2px', lineHeight: 1 },
    sub: { color: '#B8C1CC', fontSize: '14px', marginTop: '8px' },
    tabs: { display: 'flex', gap: '8px', marginTop: '28px' },
    tab: (active: boolean) => ({
      padding: '10px 24px', borderRadius: '6px', fontSize: '13px', fontWeight: 600,
      letterSpacing: '1px', textTransform: 'uppercase' as const, cursor: 'pointer', border: 'none',
      background: active ? '#DC2626' : 'rgba(255,255,255,0.05)',
      color: active ? '#fff' : '#B8C1CC',
    }),
    catTabs: { display: 'flex', gap: '6px', marginBottom: '18px', flexWrap: 'wrap' as const },
    catTab: (active: boolean) => ({
      padding: '7px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: 700,
      letterSpacing: '0.5px', cursor: 'pointer', border: active ? '1px solid rgba(220,38,38,0.4)' : '1px solid rgba(255,255,255,0.1)',
      background: active ? 'rgba(220,38,38,0.15)' : 'transparent',
      color: active ? '#DC2626' : '#B8C1CC', whiteSpace: 'nowrap' as const,
    }),
    body: { maxWidth: '900px', margin: '0 auto', padding: '32px 24px' },
    seasonBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap' as const, gap: '12px' },
    select: { background: '#071426', border: '1px solid rgba(255,255,255,0.1)', color: '#F5F5F5', padding: '8px 14px', borderRadius: '6px', fontSize: '13px' },
    activeBadge: { background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.3)', color: '#DC2626', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', letterSpacing: '2px' },
    tableWrap: { overflowX: 'auto' as const, WebkitOverflowScrolling: 'touch' as const },
    table: { width: '100%', borderCollapse: 'collapse' as const, minWidth: '720px' },
    th: { textAlign: 'left' as const, padding: '10px 14px', fontSize: '11px', letterSpacing: '2px', color: '#6B7280', borderBottom: '1px solid rgba(255,255,255,0.06)', textTransform: 'uppercase' as const, whiteSpace: 'nowrap' as const },
    tr: (i: number) => ({ background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }),
    td: { padding: '14px', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '14px', whiteSpace: 'nowrap' as const },
    hofGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' },
    hofCard: { background: '#071426', border: '1px solid rgba(255,215,0,0.15)', borderRadius: '12px', padding: '24px' },
    hofCategory: { fontSize: '11px', letterSpacing: '3px', color: '#FACC15', textTransform: 'uppercase' as const, marginBottom: '12px' },
    hofName: { fontSize: '22px', fontWeight: 700, fontFamily: "'Barlow Condensed', sans-serif", marginBottom: '4px' },
    hofRecord: { fontSize: '28px', fontWeight: 900, color: '#DC2626', fontFamily: "'Barlow Condensed', sans-serif" },
    hofMeta: { fontSize: '12px', color: '#6B7280', marginTop: '8px' },
    hofTimer: { fontSize: '11px', color: '#FACC15', marginTop: '4px' },
    hofPrev: { marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: '11px', color: '#4B5563' },
    empty: { textAlign: 'center' as const, padding: '60px 20px', color: '#4B5563' },
  };

  return (
    <>
      <Navbar />
      <div style={{...s.page, paddingTop: 60}}>
      <div style={s.hero}>
        <div style={s.heroInner}>
          <div style={s.eyebrow}>Greenland Mini 4WD Club</div>
          <div style={s.title}>LEADERBOARD</div>
          <div style={s.sub}>Season standings · Hall of Fame · Live rankings</div>
          <div style={s.tabs}>
            <button style={s.tab(tab === 'season')} onClick={() => setTab('season')}>🏁 Season Board</button>
            <button style={s.tab(tab === 'hof')} onClick={() => setTab('hof')}>🏛️ Hall of Fame</button>
          </div>
        </div>
      </div>

      <div style={s.body}>

        {/* SEASON TAB */}
        {tab === 'season' && (
          <>
            <div style={s.seasonBar}>
              <select style={s.select} value={selectedSeason} onChange={e => setSelectedSeason(e.target.value)}>
                {seasons.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              {activeSeason && selectedSeason === activeSeason.id && (
                <span style={s.activeBadge}>● LIVE SEASON</span>
              )}
            </div>

            <div style={s.catTabs}>
              {CATEGORIES.map(cat => (
                <button key={cat} style={s.catTab(selectedCategory === cat)} onClick={() => setSelectedCategory(cat)}>{cat}</button>
              ))}
            </div>

            {loading ? (
              <div style={s.empty}>Loading standings...</div>
            ) : standings.length === 0 ? (
              <div style={s.empty}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>🏁</div>
                <div>No {selectedCategory} results yet for this season.</div>
                <div style={{ fontSize: '12px', marginTop: '8px', color: '#374151' }}>Results will appear after the first race in this category.</div>
              </div>
            ) : (
              <div style={s.tableWrap}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      <th style={s.th}>Rank</th>
                      <th style={s.th}>Racer</th>
                      <th style={s.th}>Races</th>
                      <th style={s.th}>Wins</th>
                      <th style={s.th}>Podiums</th>
                      <th style={s.th}>Win %</th>
                      <th style={s.th}>Points</th>
                      <th style={s.th}>Best Lap</th>
                      <th style={s.th}>Coins Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((r: any, i: number) => (
                      <tr key={r.member_id} style={s.tr(i)}>
                        <td style={{ ...s.td, ...getRankStyle(r.season_rank), fontWeight: 900, fontFamily: "'Barlow Condensed', sans-serif" }}>
                          {r.season_rank === 1 ? '🏆' : r.season_rank === 2 ? '🥈' : r.season_rank === 3 ? '🥉' : `#${r.season_rank}`}
                        </td>
                        <td style={{ ...s.td, fontWeight: 600 }}>{r.member_name}</td>
                        <td style={{ ...s.td, color: '#B8C1CC' }}>{r.races_attended}</td>
                        <td style={{ ...s.td, color: '#FACC15', fontWeight: 700 }}>{r.total_wins}</td>
                        <td style={{ ...s.td, color: '#B8C1CC' }}>{r.podiums ?? '—'}</td>
                        <td style={{ ...s.td, color: '#B8C1CC' }}>{r.win_pct != null ? `${r.win_pct}%` : '—'}</td>
                        <td style={{ ...s.td, color: '#B8C1CC' }}>{r.total_points ?? 0}</td>
                        <td style={{ ...s.td, color: '#60A5FA' }}>{r.best_lap ? `${r.best_lap}s` : '—'}</td>
                        <td style={s.td}>
                          <span style={{
                            background: r.season_rank === 1 ? 'rgba(220,38,38,0.15)' : r.season_rank === 2 ? 'rgba(156,163,175,0.15)' : r.season_rank === 3 ? 'rgba(205,124,47,0.15)' : 'rgba(59,130,246,0.1)',
                            color: r.season_rank === 1 ? '#DC2626' : r.season_rank === 2 ? '#9CA3AF' : r.season_rank === 3 ? '#CD7C2F' : '#3B82F6',
                            padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 700
                          }}>
                            {r.season_rank === 1 ? '5%' : r.season_rank === 2 ? '4%' : r.season_rank === 3 ? '3%' : '2%'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ marginTop: '24px', padding: '16px', background: '#071426', borderRadius: '8px', fontSize: '12px', color: '#6B7280', lineHeight: 1.8 }}>
              <span style={{ color: '#FACC15' }}>Coins rates are awarded to active members only.</span> Non-members earn 0%. Each race category ranks separately and resets every quarter. Hall of Fame records never reset.
            </div>
          </>
        )}

        {/* HALL OF FAME TAB */}
        {tab === 'hof' && (
          <>
            <div style={{ marginBottom: '24px', fontSize: '13px', color: '#6B7280' }}>
              Records are permanent and tracked across all categories combined. Updated instantly when broken. 🏛️ Hall of Fame holders earn <span style={{ color: '#FACC15', fontWeight: 700 }}>8% coins rate</span>.
            </div>
            <div style={s.hofGrid}>
              {hof.map((record: any) => (
                <div key={record.id} style={s.hofCard}>
                  <div style={s.hofCategory}>{HOF_LABELS[record.category] || record.category}</div>
                  <div style={s.hofName}>{record.member_name === 'TBD' ? 'Unset' : record.member_name}</div>
                  <div style={s.hofRecord}>{record.record_label}</div>
                  {record.member_name !== 'TBD' && (
                    <>
                      <div style={s.hofMeta}>Set on {new Date(record.achieved_at).toLocaleDateString('en-GB')}</div>
                      <div style={s.hofTimer}>Held for {timeSince(record.achieved_at)}</div>
                    </>
                  )}
                  {record.previous_holder_name && (
                    <div style={s.hofPrev}>
                      Previous: {record.previous_holder_name} — {record.previous_record_value}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
    <Footer />
    </>
  );
}
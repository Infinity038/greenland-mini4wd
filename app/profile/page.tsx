// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import { getMemberData, getMemberDataFromSupabase, getTicketWallet, getReferralStats, RANK_COLORS, RANK_NEXT_POINTS, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, getMemberOrdersFromSupabase, logout } from '@/lib/member';
import { isMemberActive, daysRemaining } from '@/lib/loyalty';
import type { Member, TicketWallet, ReferralStats } from '@/lib/member';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const F = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
const FB = { fontFamily: "'DM Sans', sans-serif" } as const;

const DEMO_WALLET: TicketWallet = { paid_total: 3, paid_used: 2, paid_available: 1, bonus_available: 0, loyalty_progress: 3, loyalty_needed: 7 };
const DEMO_REFERRAL: ReferralStats = { referral_code: 'DEMO1234', referral_link: 'https://greenland-mini4wd.vercel.app/register?ref=DEMO1234', confirmed_referrals: 1, pending_referrals: 2, bonus_tickets_earned: 1 };

const TIER_LABELS: Record<string, string> = { non_member: 'Non-Member', member: 'Member', season_3rd: '🥉 Season 3rd', season_2nd: '🥈 Season 2nd', season_1st: '👑 Season 1st', hall_of_fame: '🏆 Hall of Fame' };
const TIER_COLORS: Record<string, string> = { non_member: '#6B7280', member: '#3B82F6', season_3rd: '#B45309', season_2nd: '#9CA3AF', season_1st: '#FACC15', hall_of_fame: '#DC2626' };

type Tab = 'overview' | 'orders' | 'tickets' | 'garage' | 'referral' | 'wishlist';

export default function ProfilePage() {
  const [member, setMember] = useState<Member | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [wallet, setWallet] = useState<TicketWallet>(DEMO_WALLET);
  const [referral, setReferral] = useState<ReferralStats>(DEMO_REFERRAL);
  const [cars, setCars] = useState<any[]>([]);
  const [addingCar, setAddingCar] = useState(false);
  const [carForm, setCarForm] = useState({ name: '', chassis: 'AR', series: '', color: '', image_url: '', bought_from: 'outside', notes: '' });
  const [carSaving, setCarSaving] = useState(false);
  const [tab, setTab] = useState<Tab>(
    () => {
      if (typeof window !== "undefined") {
        const p = new URLSearchParams(window.location.search).get("tab");
        if (p === "orders" || p === "tickets" || p === "referral" || p === "garage" || p === "wishlist") return p as Tab;
      }
      return "overview";
    }
  );
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ticketHistory, setTicketHistory] = useState<any[]>([]);
  const [raceEntries, setRaceEntries] = useState<any[]>([]);
  const [wishlist, setWishlist] = useState<any[]>([]);

  useEffect(() => {
    const local = getMemberData();
    if (!local?.email) { setLoading(false); return; }

    async function loadAll() {
      try {
        const [m, o, w, r] = await Promise.all([
          getMemberDataFromSupabase(local.email),
          getMemberOrdersFromSupabase(local.email),
          getTicketWallet(local.email),
          getReferralStats(local),
        ]);
        setMember(m || local);
        setOrders(o);
        setWallet(w);
        setReferral(r);
        const { data: carsData } = await supabase.from('cars').select('*').eq('member_email', local.email).order('created_at', { ascending: false });
        setCars(carsData || []);
        const { data: tkData } = await supabase.from('race_tickets').select('*').eq('member_email', local.email).order('created_at', { ascending: false });
        setTicketHistory(tkData || []);
        const { data: reData } = await supabase.from('race_entries').select('*').eq('member_email', local.email).order('created_at', { ascending: false });
        setRaceEntries(reData || []);
        const { data: wlData } = await supabase.from('wishlist').select('*').eq('member_email', local.email).order('created_at', { ascending: false });
        if (wlData && wlData.length > 0) {
          const { data: prods } = await supabase.from('products').select('*').in('id', wlData.map((w: any) => w.product_id));
          setWishlist(wlData.map((w: any) => ({ ...w, product: (prods || []).find((p: any) => p.id === w.product_id) })));
        } else {
          setWishlist([]);
        }
      } catch {
        setMember(local);
      } finally {
        setLoading(false);
      }
    }
    loadAll();
  }, []);

  const copyReferral = () => {
    navigator.clipboard.writeText(referral.referral_link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const rank = (member?.rank || 'Rookie') as keyof typeof RANK_COLORS;
  const rankColor = RANK_COLORS[rank] || '#6B7280';
  const points = member?.total_points || 0;
  const nextPoints = RANK_NEXT_POINTS[rank] || 5;
  const progressPct = rank === 'Legend' ? 100 : Math.min((points / nextPoints) * 100, 100);
  const memberActive = isMemberActive(member as any);
  const memberDaysLeft = daysRemaining(member as any);
  const loyaltyTier = (member as any)?.loyalty_tier || 'member';
  const loyaltyColor = TIER_COLORS[loyaltyTier] || '#6B7280';

  const removeFromWishlist = async (id: string) => {
    await supabase.from('wishlist').delete().eq('id', id);
    setWishlist(prev => prev.filter(w => w.id !== id));
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#050505', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ ...FB, color: '#B8C1CC' }}>Loading profile...</div>
    </div>
  );

  const TABS: Tab[] = ['overview', 'orders', 'tickets', 'garage', 'wishlist', 'referral'];

  return (
    <>
      <Navbar />
      <main style={{ background: '#050505', color: '#F5F5F5', minHeight: '100vh', paddingTop: 60 }}>

        {/* Profile hero */}
        <section style={{ background: '#071426', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '32px 24px 0' }}>
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            {/* Avatar + info */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', ...F, fontWeight: 900, fontSize: 28, color: '#fff', flexShrink: 0 }}>
                {member?.name?.[0]?.toUpperCase() || 'M'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
                  <h1 style={{ ...F, fontWeight: 900, fontSize: 28, color: '#F5F5F5', margin: 0 }}>{member?.name || 'Member'}</h1>
                  <span style={{ ...F, fontWeight: 700, fontSize: 11, letterSpacing: 2, padding: '3px 10px', borderRadius: 4, background: rankColor + '22', color: rankColor, border: `1px solid ${rankColor}55` }}>{rank}</span>
                  <span style={{ ...F, fontWeight: 700, fontSize: 11, letterSpacing: 2, padding: '3px 10px', borderRadius: 4, background: memberActive ? 'rgba(34,197,94,0.15)' : 'rgba(220,38,38,0.15)', color: memberActive ? '#22C55E' : '#DC2626', border: `1px solid ${memberActive ? 'rgba(34,197,94,0.4)' : 'rgba(220,38,38,0.4)'}` }}>
                    {memberActive ? `🟢 ACTIVE · ${memberDaysLeft}d LEFT` : '🔴 INACTIVE — TOP UP TO RACE'}
                  </span>
                  {member?.member_status === 'official' && (
                    <span style={{ ...F, fontWeight: 700, fontSize: 11, letterSpacing: 2, padding: '3px 10px', borderRadius: 4, background: 'rgba(250,204,21,0.15)', color: '#FACC15', border: '1px solid rgba(250,204,21,0.3)' }}>✓ OFFICIAL</span>
                  )}
                  {loyaltyTier !== 'member' && loyaltyTier !== 'non_member' && (
                    <span style={{ ...F, fontWeight: 700, fontSize: 11, letterSpacing: 2, padding: '3px 10px', borderRadius: 4, background: loyaltyColor + '22', color: loyaltyColor, border: `1px solid ${loyaltyColor}55` }}>
                      {TIER_LABELS[loyaltyTier]}
                    </span>
                  )}
                </div>
                <div style={{ ...FB, fontSize: 14, color: '#B8C1CC', marginBottom: 10 }}>{member?.email}</div>
                {/* Rank progress */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1, maxWidth: 200, height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${progressPct}%`, background: rankColor, borderRadius: 2 }} />
                  </div>
                  <span style={{ ...FB, fontSize: 12, color: '#B8C1CC' }}>
                    {rank === 'Legend' ? '🏆 Max Rank' : `${points}/${nextPoints} pts`}
                  </span>
                </div>
              </div>
              <button onClick={logout} style={{ ...FB, fontSize: 13, color: '#B8C1CC', background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 16px', cursor: 'pointer' }}>
                Logout
              </button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, overflowX: 'auto' }}>
              {TABS.map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{ ...F, fontWeight: 700, fontSize: 13, letterSpacing: 2, padding: '12px 20px', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', borderRadius: '8px 8px 0 0', background: tab === t ? '#050505' : 'transparent', color: tab === t ? '#DC2626' : '#B8C1CC', borderTop: tab === t ? '2px solid #DC2626' : '2px solid transparent' }}
                >
                  {t.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Content */}
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>

          {/* OVERVIEW */}
          {tab === 'overview' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 20 }}>
                {[
                  { label: 'Total Points', value: points, color: '#FACC15' },
                  { label: 'Lifetime Spend', value: `${(member as any)?.lifetime_spending || 0} kr`, color: '#A855F7' },
                  { label: 'Tickets Available', value: wallet.paid_available + wallet.bonus_available, color: '#22C55E' },
                  { label: 'Orders', value: orders.length, color: '#3B82F6' },
                  { label: 'Referrals', value: referral.confirmed_referrals, color: '#DC2626' },
                ].map(s => (
                  <div key={s.label} style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '20px 16px' }}>
                    <div style={{ ...F, fontWeight: 900, fontSize: 36, color: s.color }}>{s.value}</div>
                    <div style={{ ...FB, fontSize: 13, color: '#B8C1CC', marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 24 }}>
                <div style={{ ...F, fontWeight: 700, fontSize: 13, letterSpacing: 3, color: '#B8C1CC', marginBottom: 16 }}>MEMBER INFO</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {[
                    ['Nationality', member?.nationality || '—'],
                    ['City', member?.city || '—'],
                    ['Experience', member?.experience || '—'],
                    ['Chassis', member?.favorite_chassis || 'Not set'],
                    ['Member Since', member?.created_at ? new Date(member.created_at).toLocaleDateString() : '—'],
                    ['Status', member?.member_status === 'official' ? '✓ Official' : 'Registered'],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <div style={{ ...FB, fontSize: 12, color: '#B8C1CC', marginBottom: 2 }}>{k}</div>
                      <div style={{ ...FB, fontSize: 15, color: '#F5F5F5', fontWeight: 600, textTransform: 'capitalize' }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Race Entries on Overview */}
              {raceEntries.length > 0 && (
                <div style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 24, marginTop: 12 }}>
                  <div style={{ ...F, fontWeight: 700, fontSize: 13, letterSpacing: 3, color: '#B8C1CC', marginBottom: 16 }}>MY RACE ENTRIES</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {raceEntries.map((e: any) => (
                      <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '10px 14px' }}>
                        <span style={{ fontSize: 20 }}>🏎️</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ ...F, fontWeight: 700, fontSize: 15, color: '#F5F5F5' }}>{e.car_name || '—'}</div>
                          <div style={{ ...FB, fontSize: 12, color: '#B8C1CC' }}>{(e.race_category || '').replace(/_/g, ' ').toUpperCase()} · {new Date(e.created_at).toLocaleDateString('en-GB')}</div>
                        </div>
                        <span style={{ ...F, fontSize: 10, letterSpacing: 1, padding: '3px 10px', borderRadius: 20, background: 'rgba(34,197,94,0.1)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.25)', flexShrink: 0 }}>✅ ENTERED</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ORDERS */}
          {tab === 'orders' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {orders.length === 0 ? (
                <div style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 40, textAlign: 'center', ...FB, color: '#B8C1CC' }}>
                  No orders yet. <a href="/shop" style={{ color: '#DC2626' }}>Visit the shop →</a>
                </div>
              ) : orders.map((order: any) => {
                const st = order.payment_status || order.status;
                const statusColor = ORDER_STATUS_COLORS[st] || '#6B7280';
                const statusLabel = ORDER_STATUS_LABELS[st] || st;
                return (
                  <div key={order.id} style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ ...F, fontWeight: 900, fontSize: 20, color: '#F5F5F5' }}>{order.product_name}</div>
                        <div style={{ ...FB, fontSize: 13, color: '#B8C1CC', marginTop: 4 }}>
                          {order.chassis && <span style={{ marginRight: 12 }}>Chassis: {order.chassis}</span>}
                          {new Date(order.created_at).toLocaleDateString()}
                        </div>
                        {order.notes && (
                          <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#FACC15', marginTop: 4 }}>{order.notes}</div>
                        )}
                      </div>
                      <span style={{ ...F, fontWeight: 700, fontSize: 11, letterSpacing: 2, padding: '4px 12px', borderRadius: 20, background: statusColor + '22', color: statusColor, flexShrink: 0 }}>{statusLabel}</span>
                    </div>
                    {st === 'awaiting_payment' && (
                      <div style={{ marginTop: 12, background: 'rgba(250,204,21,0.08)', border: '1px solid rgba(250,204,21,0.25)', borderRadius: 8, padding: 12, ...FB, fontSize: 13, color: '#FACC15' }}>
                        💳 Send MobilePay to <strong>+45 54 32 79 41</strong> (Jovannie Ducay) with ref: <strong>{order.payment_reference}</strong>
                      </div>
                    )}
                    {st === 'proof_uploaded' && (
                      <div style={{ marginTop: 12, background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 8, padding: 12, ...FB, fontSize: 13, color: '#93C5FD' }}>
                        📋 Payment proof received. Awaiting admin confirmation.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* TICKETS */}
          {tab === 'tickets' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {[
                  { label: 'Paid Available', value: wallet.paid_available, color: '#22C55E' },
                  { label: 'Bonus Available', value: wallet.bonus_available, color: '#FACC15' },
                  { label: 'Used (Entries)', value: raceEntries.length, color: '#6B7280' },
                ].map(s => (
                  <div key={s.label} style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '20px 12px', textAlign: 'center' }}>
                    <div style={{ ...F, fontWeight: 900, fontSize: 40, color: s.color }}>{s.value}</div>
                    <div style={{ ...FB, fontSize: 12, color: '#B8C1CC', marginTop: 4 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Race Pass Punch Card - Dual */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Weekly */}
                <div style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ ...F, fontWeight: 900, fontSize: 16, color: '#F5F5F5' }}>WEEKLY RACE PASS</div>
                    <div style={{ ...F, fontWeight: 700, fontSize: 12, letterSpacing: 2, color: '#FACC15' }}>{(member as any)?.weekly_loyalty_progress || 0}/10</div>
                  </div>
                  <div style={{ ...FB, fontSize: 12, color: '#B8C1CC', marginBottom: 14 }}>10 weekly tickets → 1 FREE weekly ticket</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(11, 1fr)', gap: 5, marginBottom: 12 }}>
                    {Array.from({ length: 10 }).map((_, i) => {
                      const stamped = i < ((member as any)?.weekly_loyalty_progress || 0);
                      return (
                        <div key={i} style={{ aspectRatio: '1', borderRadius: '50%', border: stamped ? '2px solid #FACC15' : '1.5px solid rgba(250,204,21,0.25)', background: stamped ? '#FACC15' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: stamped ? '#111' : 'rgba(255,255,255,0.2)' }}>
                          {stamped ? '✓' : i + 1}
                        </div>
                      );
                    })}
                    <div style={{ aspectRatio: '1', borderRadius: '50%', border: ((member as any)?.weekly_loyalty_progress || 0) >= 10 ? '2px solid #DC2626' : '1.5px solid rgba(220,38,38,0.4)', background: ((member as any)?.weekly_loyalty_progress || 0) >= 10 ? '#DC2626' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, fontWeight: 900, color: ((member as any)?.weekly_loyalty_progress || 0) >= 10 ? '#fff' : 'rgba(220,38,38,0.5)' }}>FREE</div>
                  </div>
                  <p style={{ ...FB, fontSize: 12, color: '#B8C1CC', margin: 0 }}>
                    {((member as any)?.weekly_loyalty_progress || 0) >= 10 ? '🎉 Free ticket earned! Contact admin.' : `${10 - ((member as any)?.weekly_loyalty_progress || 0)} more to earn 1 FREE`}
                  </p>
                </div>
                {/* Season */}
                <div style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ ...F, fontWeight: 900, fontSize: 16, color: '#F5F5F5' }}>SEASON RACE PASS</div>
                    <div style={{ ...F, fontWeight: 700, fontSize: 12, letterSpacing: 2, color: '#DC2626' }}>{(member as any)?.season_loyalty_progress || 0}/10</div>
                  </div>
                  <div style={{ ...FB, fontSize: 12, color: '#B8C1CC', marginBottom: 14 }}>10 season tickets → 1 FREE season ticket</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(11, 1fr)', gap: 5, marginBottom: 12 }}>
                    {Array.from({ length: 10 }).map((_, i) => {
                      const stamped = i < ((member as any)?.season_loyalty_progress || 0);
                      return (
                        <div key={i} style={{ aspectRatio: '1', borderRadius: '50%', border: stamped ? '2px solid #DC2626' : '1.5px solid rgba(220,38,38,0.25)', background: stamped ? '#DC2626' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: stamped ? '#fff' : 'rgba(255,255,255,0.2)' }}>
                          {stamped ? '✓' : i + 1}
                        </div>
                      );
                    })}
                    <div style={{ aspectRatio: '1', borderRadius: '50%', border: ((member as any)?.season_loyalty_progress || 0) >= 10 ? '2px solid #FACC15' : '1.5px solid rgba(250,204,21,0.4)', background: ((member as any)?.season_loyalty_progress || 0) >= 10 ? '#FACC15' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, fontWeight: 900, color: ((member as any)?.season_loyalty_progress || 0) >= 10 ? '#111' : 'rgba(250,204,21,0.5)' }}>FREE</div>
                  </div>
                  <p style={{ ...FB, fontSize: 12, color: '#B8C1CC', margin: 0 }}>
                    {((member as any)?.season_loyalty_progress || 0) >= 10 ? '🎉 Free season ticket earned! Contact admin.' : `${10 - ((member as any)?.season_loyalty_progress || 0)} more to earn 1 FREE`}
                  </p>
                </div>
              </div>

              <div style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 24 }}>
                <div style={{ ...F, fontWeight: 900, fontSize: 18, color: '#F5F5F5', marginBottom: 12 }}>HOW TICKETS WORK</div>
                <ul style={{ ...FB, fontSize: 14, color: '#B8C1CC', lineHeight: 2, margin: 0, paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <li>🏁 1 ticket = 1 car entry into tournament</li>
                  <li>⚡ 1 ticket gives 2 qualification lives</li>
                  <li>🏆 Finals are single elimination</li>
                  <li>🚫 Same car cannot be entered twice</li>
                  <li>🎁 Every 10 paid tickets = 1 FREE bonus ticket</li>
                  <li>📵 Cancelled tickets don't count toward loyalty</li>
                </ul>
              </div>


              {/* Race Entries */}
              {raceEntries.length > 0 && (
                <div style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 24 }}>
                  <div style={{ ...F, fontWeight: 900, fontSize: 18, color: '#F5F5F5', marginBottom: 16 }}>MY RACE ENTRIES</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {raceEntries.map((e: any) => (
                      <div key={e.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ ...F, fontWeight: 700, fontSize: 15, color: '#F5F5F5', marginBottom: 2 }}>🏎️ {e.car_name || '—'} <span style={{ color: '#B8C1CC', fontWeight: 400, fontSize: 13 }}>→ {(e.race_category || '').replace(/_/g, ' ').toUpperCase()}</span></div>
                          <div style={{ ...FB, fontSize: 12, color: '#6B7280' }}>{new Date(e.created_at).toLocaleDateString('en-GB')}</div>
                        </div>
                        <span style={{ ...F, fontSize: 10, letterSpacing: 1, padding: '3px 10px', borderRadius: 20, background: 'rgba(34,197,94,0.12)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.3)', flexShrink: 0 }}>✅ 1 TICKET USED</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ticket Purchase History */}
              <div style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 24 }}>
                <div style={{ ...F, fontWeight: 900, fontSize: 18, color: '#F5F5F5', marginBottom: 16 }}>TICKET PURCHASE HISTORY</div>
                {ticketHistory.length === 0 ? (
                  <div style={{ ...FB, fontSize: 14, color: '#6B7280', textAlign: 'center', padding: '20px 0' }}>No tickets purchased yet.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {ticketHistory.map((t: any) => {
                      const SC: Record<string,string> = { payment_confirmed:'#22C55E', proof_uploaded:'#3B82F6', awaiting_payment:'#FACC15', cancelled:'#DC2626' };
                      const SL: Record<string,string> = { payment_confirmed:'✅ Confirmed', proof_uploaded:'🔄 Proof Uploaded', awaiting_payment:'⏳ Awaiting Payment', cancelled:'❌ Cancelled' };
                      const TL: Record<string,string> = { weekly_earlybird:'🐦 Early Bird', weekly:'🏁 Weekly', season:'🏆 Season', bonus:'🎁 Bonus' };
                      const color = SC[t.payment_status] || '#6B7280';
                      return (
                        <div key={t.id} style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${color}22`, borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                              <span style={{ ...F, fontWeight: 700, fontSize: 15, color: '#F5F5F5' }}>{TL[t.ticket_type] || t.ticket_type} × {t.quantity}</span>
                              <span style={{ ...F, fontSize: 10, letterSpacing: 1, padding: '2px 8px', borderRadius: 20, background: color + '18', color, border: `1px solid ${color}33` }}>{SL[t.payment_status] || t.payment_status}</span>
                            </div>
                            <div style={{ ...FB, fontSize: 12, color: '#6B7280', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                              <span>{new Date(t.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                              {t.total_price && <span style={{ color: '#FACC15', fontWeight: 600 }}>{t.total_price} DKK</span>}
                              {t.payment_reference && <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#B8C1CC' }}>Ref: {t.payment_reference}</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <a href="/tournament" style={{ display: 'block', textAlign: 'center', background: '#DC2626', color: '#fff', borderRadius: 12, padding: '16px 24px', ...F, fontWeight: 900, fontSize: 18, letterSpacing: 2, textDecoration: 'none' }}>
                VIEW UPCOMING TOURNAMENTS →
              </a>
            </div>
          )}

          {/* GARAGE */}
          {tab === 'garage' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ ...F, fontWeight: 900, fontSize: 22, color: '#F5F5F5' }}>MY GARAGE</div>
                  <div style={{ ...FB, fontSize: 13, color: '#B8C1CC' }}>Your registered race cars</div>
                </div>
                <button onClick={() => setAddingCar(true)} style={{ background: '#DC2626', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', ...F, fontWeight: 900, fontSize: 14, letterSpacing: 1, cursor: 'pointer' }}>+ ADD CAR</button>
              </div>

              {cars.length === 0 && !addingCar ? (
                <div style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 40, textAlign: 'center' }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>🏎️</div>
                  <div style={{ ...F, fontWeight: 900, fontSize: 20, color: '#F5F5F5', marginBottom: 8 }}>NO CARS YET</div>
                  <div style={{ ...FB, fontSize: 14, color: '#B8C1CC', marginBottom: 20 }}>Register your Mini 4WD cars to enter tournaments. Cars bought outside the shop are welcome!</div>
                  <button onClick={() => setAddingCar(true)} style={{ background: '#DC2626', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 24px', ...F, fontWeight: 900, fontSize: 16, letterSpacing: 2, cursor: 'pointer' }}>REGISTER YOUR FIRST CAR</button>
                </div>
              ) : null}

              {/* Add car form */}
              {addingCar && (
                <div style={{ background: '#071426', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 12, padding: 24 }}>
                  <div style={{ ...F, fontWeight: 900, fontSize: 18, color: '#F5F5F5', marginBottom: 16 }}>REGISTER A CAR</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {[
                      { label: 'CAR NAME / NICKNAME', key: 'name', placeholder: 'e.g. Shadow Shark, Flame Astute...' },
                      { label: 'SERIES / MODEL', key: 'series', placeholder: 'e.g. Flame Astute, Geo Glider...' },
                      { label: 'COLOR / BODY', key: 'color', placeholder: 'e.g. Blue/Silver, Stock body...' },
                      { label: 'IMAGE URL (optional)', key: 'image_url', placeholder: 'https://...' },
                      { label: 'NOTES (optional)', key: 'notes', placeholder: 'Any modifications, tuning notes...' },
                    ].map(f => (
                      <div key={f.key}>
                        <label style={{ ...F, fontSize: 11, letterSpacing: 3, color: '#B8C1CC', display: 'block', marginBottom: 5 }}>{f.label}</label>
                        <input value={(carForm as any)[f.key]} onChange={e => setCarForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder}
                          style={{ width: '100%', background: '#050505', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', color: '#F5F5F5', ...FB, fontSize: 14, outline: 'none', boxSizing: 'border-box' as const }} />
                      </div>
                    ))}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <label style={{ ...F, fontSize: 11, letterSpacing: 3, color: '#B8C1CC', display: 'block', marginBottom: 5 }}>CHASSIS</label>
                        <select value={carForm.chassis} onChange={e => setCarForm(p => ({ ...p, chassis: e.target.value }))}
                          style={{ width: '100%', background: '#050505', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', color: '#F5F5F5', ...FB, fontSize: 14, outline: 'none' }}>
                          {['AR', 'MA', 'VS', 'MS', 'FM-A', 'S2', 'Other'].map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ ...F, fontSize: 11, letterSpacing: 3, color: '#B8C1CC', display: 'block', marginBottom: 5 }}>BOUGHT FROM</label>
                        <select value={carForm.bought_from} onChange={e => setCarForm(p => ({ ...p, bought_from: e.target.value }))}
                          style={{ width: '100%', background: '#050505', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', color: '#F5F5F5', ...FB, fontSize: 14, outline: 'none' }}>
                          <option value="club_shop">Club Shop</option>
                          <option value="outside">Outside (Personal)</option>
                        </select>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button onClick={async () => {
                        if (!carForm.name || !member?.email) return;
                        setCarSaving(true);
                        const memberName = (member as any)?.name || member?.email;
                        await supabase.from('cars').insert({ ...carForm, member_email: member.email, member_name: memberName, status: 'pending' });
                        const { data } = await supabase.from('cars').select('*').eq('member_email', member.email).order('created_at', { ascending: false });
                        setCars(data || []);
                        setCarForm({ name: '', chassis: 'AR', series: '', color: '', image_url: '', bought_from: 'outside', notes: '' });
                        setAddingCar(false);
                        setCarSaving(false);
                      }} disabled={carSaving || !carForm.name}
                        style={{ flex: 1, background: '#DC2626', color: '#fff', border: 'none', borderRadius: 8, padding: '12px', ...F, fontWeight: 900, fontSize: 16, letterSpacing: 2, cursor: 'pointer', opacity: carSaving || !carForm.name ? 0.5 : 1 }}>
                        {carSaving ? 'SAVING...' : 'REGISTER CAR'}
                      </button>
                      <button onClick={() => setAddingCar(false)} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: '#B8C1CC', borderRadius: 8, padding: '12px 20px', ...FB, fontSize: 14, cursor: 'pointer' }}>Cancel</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Car list */}
              {cars.map(car => (
                <div key={car.id} style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 20, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  {car.image_url ? (
                    <img src={car.image_url} alt={car.name} style={{ width: 72, height: 72, objectFit: 'contain', borderRadius: 8, background: '#050505', border: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  ) : (
                    <div style={{ width: 72, height: 72, borderRadius: 8, background: '#050505', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0 }}>🏎️</div>
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ ...F, fontWeight: 900, fontSize: 18, color: '#F5F5F5' }}>{car.name}</span>
                      <span style={{ ...F, fontSize: 9, letterSpacing: 1, padding: '2px 8px', borderRadius: 20, background: car.status === 'approved' ? 'rgba(34,197,94,0.15)' : car.status === 'rejected' ? 'rgba(220,38,38,0.15)' : 'rgba(250,204,21,0.15)', color: car.status === 'approved' ? '#22C55E' : car.status === 'rejected' ? '#DC2626' : '#FACC15' }}>
                        {car.status === 'approved' ? '✓ APPROVED' : car.status === 'rejected' ? '✕ REJECTED' : '⏳ PENDING'}
                      </span>
                    </div>
                    <div style={{ ...FB, fontSize: 13, color: '#B8C1CC', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      {car.chassis && <span>Chassis: <strong style={{ color: '#F5F5F5' }}>{car.chassis}</strong></span>}
                      {car.series && <span>Series: <strong style={{ color: '#F5F5F5' }}>{car.series}</strong></span>}
                      {car.color && <span>Color: <strong style={{ color: '#F5F5F5' }}>{car.color}</strong></span>}
                      <span>{car.bought_from === 'club_shop' ? '🏪 Club Shop' : '🛒 Outside Purchase'}</span>
                    </div>
                    {car.notes && <div style={{ ...FB, fontSize: 12, color: '#6B7280', marginTop: 4 }}>{car.notes}</div>}
                    {car.status === 'pending' && <div style={{ ...FB, fontSize: 11, color: '#FACC15', marginTop: 6 }}>⏳ Awaiting admin approval before you can race with this car.</div>}
                    {car.status === 'rejected' && <div style={{ ...FB, fontSize: 11, color: '#DC2626', marginTop: 6 }}>✕ Rejected. Contact admin for details.</div>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                    <button onClick={async () => {
                      if (!confirm('Remove this car from your garage?')) return;
                      await supabase.from('cars').delete().eq('id', car.id);
                      const { data } = await supabase.from('cars').select('*').eq('member_email', member?.email).order('created_at', { ascending: false });
                      setCars(data || []);
                    }} style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 6, padding: '6px 12px', ...FB, fontSize: 12, color: '#DC2626', cursor: 'pointer' }}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}

              <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 10, padding: 14, ...FB, fontSize: 13, color: '#93C5FD', lineHeight: 1.7 }}>
                ℹ️ All cars require admin approval before race entry. Cars are verified to ensure fair competition. Approval usually takes less than 24 hours.
              </div>
            </div>
          )}

          {/* WISHLIST */}
          {tab === 'wishlist' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {wishlist.length === 0 ? (
                <div style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 40, textAlign: 'center', ...FB, color: '#B8C1CC' }}>
                  Nothing saved yet. <a href="/shop" style={{ color: '#DC2626' }}>Browse the shop →</a>
                </div>
              ) : wishlist.map((w: any) => {
                const p = w.product;
                if (!p) return null;
                const inStock = p.status !== 'sold out' && p.status !== 'coming soon' && ((p.unbuilt_stock ?? 1) > 0 || (p.built_stock ?? 1) > 0);
                return (
                  <div key={w.id} style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 56, height: 56, background: '#050505', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                      {p.image_url ? <img src={p.image_url.split(',')[0]?.trim()} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <span style={{ fontSize: 20 }}>🏎️</span>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ ...F, fontWeight: 700, fontSize: 16, color: '#F5F5F5' }}>{p.name}</div>
                      <div style={{ ...F, fontSize: 10, letterSpacing: 1, padding: '2px 8px', borderRadius: 20, display: 'inline-block', marginTop: 4, background: inStock ? 'rgba(34,197,94,0.15)' : 'rgba(220,38,38,0.15)', color: inStock ? '#22C55E' : '#DC2626' }}>
                        {inStock ? '✓ BACK IN STOCK' : 'STILL SOLD OUT'}
                      </div>
                    </div>
                    <a href={`/shop?product=${p.id}`} style={{ ...F, fontWeight: 700, fontSize: 12, letterSpacing: 1, color: '#fff', background: '#DC2626', borderRadius: 8, padding: '8px 14px', textDecoration: 'none', flexShrink: 0 }}>VIEW</a>
                    <button onClick={() => removeFromWishlist(w.id)} style={{ background: 'none', border: 'none', color: '#6B7280', fontSize: 18, cursor: 'pointer', flexShrink: 0 }}>✕</button>
                  </div>
                );
              })}
            </div>
          )}

          {/* REFERRAL */}
          {tab === 'referral' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {[
                  { label: 'Confirmed', value: referral.confirmed_referrals, color: '#22C55E' },
                  { label: 'Pending', value: referral.pending_referrals, color: '#FACC15' },
                  { label: 'Bonus Tickets', value: referral.bonus_tickets_earned, color: '#DC2626' },
                ].map(s => (
                  <div key={s.label} style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '20px 12px', textAlign: 'center' }}>
                    <div style={{ ...F, fontWeight: 900, fontSize: 40, color: s.color }}>{s.value}</div>
                    <div style={{ ...FB, fontSize: 12, color: '#B8C1CC', marginTop: 4 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              <div style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 24 }}>
                <div style={{ ...F, fontWeight: 900, fontSize: 18, color: '#F5F5F5', marginBottom: 12 }}>YOUR REFERRAL CODE</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#050505', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '12px 16px', marginBottom: 8 }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 22, color: '#FACC15', flex: 1, letterSpacing: 4 }}>{referral.referral_code}</span>
                  <button
                    onClick={copyReferral}
                    style={{ ...F, fontWeight: 700, fontSize: 13, letterSpacing: 1, background: copied ? '#16A34A' : '#DC2626', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', cursor: 'pointer' }}
                  >
                    {copied ? '✓ COPIED' : 'COPY LINK'}
                  </button>
                </div>
                <div style={{ ...FB, fontSize: 11, color: '#B8C1CC', wordBreak: 'break-all' }}>{referral.referral_link}</div>
              </div>

              <div style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 24 }}>
                <div style={{ ...F, fontWeight: 900, fontSize: 18, color: '#F5F5F5', marginBottom: 12 }}>HOW REFERRALS WORK</div>
                <ul style={{ ...FB, fontSize: 14, color: '#B8C1CC', lineHeight: 2, margin: 0, paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <li>📤 Share your referral link with friends</li>
                  <li>✅ They sign up and complete a qualifying purchase</li>
                  <li>🎟️ You earn 1 free bonus race ticket per confirmed referral</li>
                  <li>❌ Registration alone does NOT trigger the reward</li>
                  <li>❌ Unpaid or cancelled orders do NOT count</li>
                  <li>⚠️ Admin reviews all referral rewards before granting</li>
                </ul>
              </div>
            </div>
          )}

        </div>
      </main>
      <Footer />
    </>
  );
}
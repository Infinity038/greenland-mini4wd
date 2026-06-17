'use client';

import { useEffect, useState } from 'react';
import { getMemberData, getMemberDataFromSupabase, getTicketWallet, getReferralStats, RANK_COLORS, RANK_NEXT_POINTS, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, getMemberOrdersFromSupabase, logout } from '@/lib/member';
import type { Member, TicketWallet, ReferralStats } from '@/lib/member';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const F = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
const FB = { fontFamily: "'DM Sans', sans-serif" } as const;

const DEMO_WALLET: TicketWallet = { paid_total: 3, paid_used: 2, paid_available: 1, bonus_available: 0, loyalty_progress: 3, loyalty_needed: 7 };
const DEMO_REFERRAL: ReferralStats = { referral_code: 'DEMO1234', referral_link: 'https://greenland-mini4wd.vercel.app/register?ref=DEMO1234', confirmed_referrals: 1, pending_referrals: 2, bonus_tickets_earned: 1 };

type Tab = 'overview' | 'orders' | 'tickets' | 'referral';

export default function ProfilePage() {
  const [member, setMember] = useState<Member | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [wallet, setWallet] = useState<TicketWallet>(DEMO_WALLET);
  const [referral, setReferral] = useState<ReferralStats>(DEMO_REFERRAL);
  const [tab, setTab] = useState<Tab>(
    () => {
      if (typeof window !== "undefined") {
        const p = new URLSearchParams(window.location.search).get("tab");
        if (p === "orders" || p === "tickets" || p === "referral") return p as Tab;
      }
      return "overview";
    }
  );
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const local = getMemberData();
    if (!local?.email) { setLoading(false); return; }
    Promise.all([
      getMemberDataFromSupabase(local.email),
      getMemberOrdersFromSupabase(local.email),
      getTicketWallet(local.email),
      getReferralStats(local),
    ]).then(([m, o, w, r]) => {
      setMember(m || local);
      setOrders(o);
      setWallet(w);
      setReferral(r);
      setLoading(false);
    }).catch(() => { setMember(local); setLoading(false); });
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

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#050505', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ ...FB, color: '#B8C1CC' }}>Loading profile...</div>
    </div>
  );

  const TABS: Tab[] = ['overview', 'orders', 'tickets', 'referral'];

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
                  {member?.member_status === 'official' && (
                    <span style={{ ...F, fontWeight: 700, fontSize: 11, letterSpacing: 2, padding: '3px 10px', borderRadius: 4, background: 'rgba(250,204,21,0.15)', color: '#FACC15', border: '1px solid rgba(250,204,21,0.3)' }}>✓ OFFICIAL</span>
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
                  { label: 'Used', value: wallet.paid_used, color: '#6B7280' },
                ].map(s => (
                  <div key={s.label} style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '20px 12px', textAlign: 'center' }}>
                    <div style={{ ...F, fontWeight: 900, fontSize: 40, color: s.color }}>{s.value}</div>
                    <div style={{ ...FB, fontSize: 12, color: '#B8C1CC', marginTop: 4 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Race Pass Punch Card */}
              <div style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ ...F, fontWeight: 900, fontSize: 18, color: '#F5F5F5' }}>RACE PASS</div>
                  <div style={{ ...F, fontWeight: 700, fontSize: 13, letterSpacing: 2, color: '#FACC15' }}>{wallet.loyalty_progress}/10 STAMPED</div>
                </div>
                <div style={{ ...FB, fontSize: 12, color: '#B8C1CC', marginBottom: 16 }}>Buy 10 race tickets · Get 1 FREE</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(11, 1fr)', gap: 5, marginBottom: 14 }}>
                  {Array.from({ length: 10 }).map((_, i) => {
                    const stamped = i < wallet.loyalty_progress;
                    return (
                      <div key={i} style={{
                        aspectRatio: '1',
                        borderRadius: '50%',
                        border: stamped ? '2px solid #FACC15' : '1.5px solid rgba(250,204,21,0.25)',
                        background: stamped ? '#FACC15' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 9, fontWeight: 700,
                        color: stamped ? '#111' : 'rgba(255,255,255,0.2)',
                      }}>
                        {stamped ? '✓' : i + 1}
                      </div>
                    );
                  })}
                  {/* FREE slot */}
                  <div style={{
                    aspectRatio: '1',
                    borderRadius: '50%',
                    border: wallet.loyalty_progress >= 10 ? '2px solid #DC2626' : '1.5px solid rgba(220,38,38,0.4)',
                    background: wallet.loyalty_progress >= 10 ? '#DC2626' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 7, fontWeight: 900, letterSpacing: 0.5,
                    color: wallet.loyalty_progress >= 10 ? '#fff' : 'rgba(220,38,38,0.5)',
                  }}>
                    FREE
                  </div>
                </div>
                <p style={{ ...FB, fontSize: 13, color: wallet.loyalty_progress >= 10 ? '#22C55E' : '#B8C1CC', margin: 0 }}>
                  {wallet.loyalty_progress >= 10
                    ? '🎉 You earned a free bonus ticket! Contact admin to claim.'
                    : `${wallet.loyalty_needed} more paid ticket${wallet.loyalty_needed !== 1 ? 's' : ''} to earn 1 FREE bonus ticket`}
                </p>
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

              <a href="/tournament" style={{ display: 'block', textAlign: 'center', background: '#DC2626', color: '#fff', borderRadius: 12, padding: '16px 24px', ...F, fontWeight: 900, fontSize: 18, letterSpacing: 2, textDecoration: 'none' }}>
                VIEW UPCOMING TOURNAMENTS →
              </a>
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
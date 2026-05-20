'use client';

import { useEffect, useState } from 'react';
import { getMemberData, getMemberDataFromSupabase, getTicketWallet, getReferralStats, RANK_COLORS, RANK_NEXT_POINTS, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, logout } from '@/lib/member';
import type { Member, TicketWallet, ReferralStats } from '@/lib/member';
import { getMemberOrdersFromSupabase } from '@/lib/member';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const DEMO_WALLET: TicketWallet = {
  paid_total: 3,
  paid_used: 2,
  paid_available: 1,
  bonus_available: 0,
  loyalty_progress: 3,
  loyalty_needed: 7,
};

const DEMO_REFERRAL: ReferralStats = {
  referral_code: 'DEMO1234',
  referral_link: 'https://greenland-mini4wd.vercel.app/register?ref=DEMO1234',
  confirmed_referrals: 1,
  pending_referrals: 2,
  bonus_tickets_earned: 1,
};

export default function ProfilePage() {
  const [member, setMember] = useState<Member | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [wallet, setWallet] = useState<TicketWallet>(DEMO_WALLET);
  const [referral, setReferral] = useState<ReferralStats>(DEMO_REFERRAL);
  const [tab, setTab] = useState<'overview' | 'orders' | 'tickets' | 'referral'>('overview');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const local = getMemberData();
    if (!local?.email) return;

    Promise.all([
      getMemberDataFromSupabase(local.email),
      getMemberOrdersFromSupabase(local.email),
      getTicketWallet(local.email),
      getReferralStats(local),
    ]).then(([memberData, ordersData, walletData, referralData]) => {
      setMember(memberData || local);
      setOrders(ordersData);
      setWallet(walletData);
      setReferral(referralData);
      setLoading(false);
    }).catch(() => {
      setMember(local);
      setLoading(false);
    });
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="text-[#B8C1CC] font-barlow">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505]">
      <Navbar />

      {/* Hero bar */}
      <div className="bg-[#071426] border-b border-white/10 pt-20">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-full bg-[#DC2626] flex items-center justify-center text-white text-2xl font-barlow font-black flex-shrink-0">
              {member?.name?.[0]?.toUpperCase() || 'M'}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-barlow font-black text-white uppercase tracking-wide">
                  {member?.name || 'Member'}
                </h1>
                <span
                  className="px-2 py-0.5 rounded text-xs font-barlow font-bold uppercase tracking-wider"
                  style={{ backgroundColor: rankColor + '22', color: rankColor, border: `1px solid ${rankColor}55` }}
                >
                  {rank}
                </span>
                {member?.member_status === 'official' && (
                  <span className="px-2 py-0.5 rounded text-xs font-barlow font-bold uppercase tracking-wider bg-yellow-500/20 text-yellow-400 border border-yellow-500/40">
                    ✓ Official Member
                  </span>
                )}
              </div>
              <p className="text-[#B8C1CC] text-sm mt-1">{member?.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex-1 bg-white/10 rounded-full h-1.5 max-w-[200px]">
                  <div
                    className="h-1.5 rounded-full transition-all"
                    style={{ width: `${progressPct}%`, backgroundColor: rankColor }}
                  />
                </div>
                <span className="text-xs text-[#B8C1CC]">
                  {rank === 'Legend' ? '🏆 Max Rank' : `${points}/${nextPoints} pts to next rank`}
                </span>
              </div>
            </div>
            <button
              onClick={logout}
              className="text-sm text-[#B8C1CC] hover:text-red-400 transition-colors border border-white/10 px-4 py-2 rounded-lg"
            >
              Logout
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-6 overflow-x-auto">
            {(['overview', 'orders', 'tickets', 'referral'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 text-sm font-barlow font-bold uppercase tracking-wider rounded-t-lg whitespace-nowrap transition-colors ${
                  tab === t
                    ? 'bg-[#050505] text-[#DC2626] border-t border-x border-white/10'
                    : 'text-[#B8C1CC] hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* ── OVERVIEW ── */}
        {tab === 'overview' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total Points', value: points, color: '#FACC15' },
              { label: 'Tickets Available', value: wallet.paid_available + wallet.bonus_available, color: '#22C55E' },
              { label: 'Orders', value: orders.length, color: '#3B82F6' },
              { label: 'Referrals', value: referral.confirmed_referrals, color: '#DC2626' },
            ].map(s => (
              <div key={s.label} className="bg-[#071426] rounded-xl p-4 border border-white/10">
                <div className="text-2xl font-barlow font-black" style={{ color: s.color }}>{s.value}</div>
                <div className="text-xs text-[#B8C1CC] mt-1">{s.label}</div>
              </div>
            ))}

            <div className="col-span-2 sm:col-span-4 bg-[#071426] rounded-xl p-4 border border-white/10">
              <h3 className="text-sm font-barlow font-bold text-white uppercase tracking-wider mb-3">Member Info</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                {[
                  ['Nationality', member?.nationality || '—'],
                  ['City', member?.city || '—'],
                  ['Experience', member?.experience || '—'],
                  ['Chassis', member?.favorite_chassis || 'Not set'],
                  ['Member Since', member?.created_at ? new Date(member.created_at).toLocaleDateString() : '—'],
                  ['Status', member?.member_status === 'official' ? '✓ Official' : 'Registered'],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div className="text-[#B8C1CC]">{k}</div>
                    <div className="text-white font-medium capitalize">{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── ORDERS ── */}
        {tab === 'orders' && (
          <div className="space-y-4">
            {orders.length === 0 ? (
              <div className="bg-[#071426] rounded-xl p-8 border border-white/10 text-center text-[#B8C1CC]">
                No orders yet. <a href="/shop" className="text-[#DC2626] hover:underline">Visit the shop →</a>
              </div>
            ) : orders.map(order => {
              const statusColor = ORDER_STATUS_COLORS[order.payment_status || order.status] || '#6B7280';
              const statusLabel = ORDER_STATUS_LABELS[order.payment_status || order.status] || order.status;
              return (
                <div key={order.id} className="bg-[#071426] rounded-xl p-4 border border-white/10">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <div className="font-barlow font-bold text-white text-lg">{order.product_name}</div>
                      <div className="text-xs text-[#B8C1CC] mt-1">
                        {order.chassis && <span className="mr-3">Chassis: {order.chassis}</span>}
                        <span>{new Date(order.created_at).toLocaleDateString()}</span>
                      </div>
                      {order.payment_reference && (
                        <div className="text-xs text-[#FACC15] mt-1 font-mono">Ref: {order.payment_reference}</div>
                      )}
                    </div>
                    <span
                      className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex-shrink-0"
                      style={{ backgroundColor: statusColor + '22', color: statusColor }}
                    >
                      {statusLabel}
                    </span>
                  </div>
                  {order.payment_status === 'awaiting_payment' && (
                    <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-xs text-yellow-400">
                      💳 Send MobilePay to <strong>+299 XXXX XXXX</strong> with ref: <strong>{order.payment_reference || order.id?.slice(0, 8).toUpperCase()}</strong>
                    </div>
                  )}
                  {order.payment_status === 'proof_uploaded' && (
                    <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-xs text-blue-400">
                      📋 Payment proof received. Awaiting admin confirmation.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── TICKETS ── */}
        {tab === 'tickets' && (
          <div className="space-y-4">
            {/* Wallet summary */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Paid Available', value: wallet.paid_available, color: '#22C55E' },
                { label: 'Bonus Available', value: wallet.bonus_available, color: '#FACC15' },
                { label: 'Used', value: wallet.paid_used, color: '#6B7280' },
              ].map(s => (
                <div key={s.label} className="bg-[#071426] rounded-xl p-4 border border-white/10 text-center">
                  <div className="text-3xl font-barlow font-black" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-xs text-[#B8C1CC] mt-1">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Loyalty progress */}
            <div className="bg-[#071426] rounded-xl p-5 border border-white/10">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-barlow font-black text-white uppercase tracking-wider">Loyalty Reward</h3>
                <span className="text-sm text-[#FACC15] font-bold">{wallet.loyalty_progress}/10</span>
              </div>
              <div className="bg-white/10 rounded-full h-3 overflow-hidden">
                <div
                  className="h-3 rounded-full bg-gradient-to-r from-yellow-500 to-yellow-400 transition-all"
                  style={{ width: `${(wallet.loyalty_progress / 10) * 100}%` }}
                />
              </div>
              <p className="text-xs text-[#B8C1CC] mt-2">
                {wallet.loyalty_progress >= 10
                  ? '🎉 You earned a free bonus ticket! Check with admin.'
                  : `${wallet.loyalty_needed} more confirmed paid tickets to earn 1 FREE bonus ticket`}
              </p>
            </div>

            <div className="bg-[#071426] rounded-xl p-5 border border-white/10">
              <h3 className="font-barlow font-black text-white uppercase tracking-wider mb-2">How Tickets Work</h3>
              <ul className="text-sm text-[#B8C1CC] space-y-1">
                <li>🏁 1 ticket = 1 car entry into tournament</li>
                <li>⚡ 1 ticket gives 2 qualification lives</li>
                <li>🏆 Finals are single elimination</li>
                <li>🚫 Same car cannot be entered twice under one ticket</li>
                <li>🎁 Every 10 paid tickets = 1 FREE bonus ticket</li>
                <li>📵 Cancelled tickets don't count toward loyalty</li>
              </ul>
            </div>

            <a
              href="/tournament"
              className="block w-full text-center bg-[#DC2626] hover:bg-red-700 text-white font-barlow font-black uppercase tracking-wider py-3 rounded-xl transition-colors"
            >
              View Upcoming Tournaments →
            </a>
          </div>
        )}

        {/* ── REFERRAL ── */}
        {tab === 'referral' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Confirmed', value: referral.confirmed_referrals, color: '#22C55E' },
                { label: 'Pending', value: referral.pending_referrals, color: '#FACC15' },
                { label: 'Bonus Tickets', value: referral.bonus_tickets_earned, color: '#DC2626' },
              ].map(s => (
                <div key={s.label} className="bg-[#071426] rounded-xl p-4 border border-white/10 text-center">
                  <div className="text-3xl font-barlow font-black" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-xs text-[#B8C1CC] mt-1">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="bg-[#071426] rounded-xl p-5 border border-white/10">
              <h3 className="font-barlow font-black text-white uppercase tracking-wider mb-3">Your Referral Code</h3>
              <div className="flex items-center gap-2 bg-[#050505] border border-white/10 rounded-lg p-3">
                <span className="font-mono text-lg font-bold text-[#FACC15] flex-1 tracking-widest">
                  {referral.referral_code}
                </span>
                <button
                  onClick={copyReferral}
                  className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                    copied ? 'bg-green-600 text-white' : 'bg-[#DC2626] text-white hover:bg-red-700'
                  }`}
                >
                  {copied ? '✓ Copied!' : 'Copy Link'}
                </button>
              </div>
              <p className="text-xs text-[#B8C1CC] mt-2 break-all">{referral.referral_link}</p>
            </div>

            <div className="bg-[#071426] rounded-xl p-5 border border-white/10">
              <h3 className="font-barlaw font-black text-white uppercase tracking-wider mb-2">How Referrals Work</h3>
              <ul className="text-sm text-[#B8C1CC] space-y-1">
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

      <Footer />
    </div>
  );
}
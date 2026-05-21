'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/admin/AdminLayout';
import { supabase } from '@/lib/supabase';

const F = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
const FB = { fontFamily: "'DM Sans', sans-serif" } as const;

const ADMIN_PASSWORD = 'mini4wd2026';

interface Stats {
  totalMembers: number;
  activeMembers: number;
  officialMembers: number;
  pendingOrders: number;
  pendingProofs: number;
  activeTournaments: number;
  productsInStock: number;
  preordersWaiting: number;
  bonusTickets: number;
}

interface RecentItem {
  id: string;
  type: 'order' | 'member' | 'payment';
  label: string;
  sub: string;
  time: string;
  color: string;
}

export default function AdminDashboard() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loginError, setLoginError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<Stats>({
    totalMembers: 0, activeMembers: 0, officialMembers: 0,
    pendingOrders: 0, pendingProofs: 0, activeTournaments: 0,
    productsInStock: 0, preordersWaiting: 0, bonusTickets: 0,
  });
  const [recent, setRecent] = useState<RecentItem[]>([]);

  const login = () => {
    if (pw === ADMIN_PASSWORD) { setAuthed(true); setLoginError(false); fetchStats(); }
    else setLoginError(true);
  };

  const fetchStats = async () => {
    const [
      { data: members },
      { data: orders },
      { data: proofs },
      { data: tournaments },
      { data: products },
      { data: tickets },
    ] = await Promise.all([
      supabase.from('members').select('member_status, created_at'),
      supabase.from('orders').select('payment_status, status, created_at, member_name, product_name'),
      supabase.from('payment_proofs').select('status'),
      supabase.from('tournaments').select('status'),
      supabase.from('products').select('status, stock_qty'),
      supabase.from('tickets').select('ticket_type, status, created_at, member_name'),
    ]);

    const m = members || [];
    const o = orders || [];
    const t = tournaments || [];
    const p = products || [];
    const tk = tickets || [];

    setStats({
      totalMembers: m.length,
      activeMembers: m.filter((x: any) => x.member_status !== 'banned' && x.member_status !== 'suspended').length,
      officialMembers: m.filter((x: any) => x.member_status === 'official').length,
      pendingOrders: o.filter((x: any) => x.payment_status === 'awaiting_payment').length,
      pendingProofs: o.filter((x: any) => x.payment_status === 'proof_uploaded').length,
      activeTournaments: t.filter((x: any) => x.status === 'upcoming' || x.status === 'ongoing').length,
      productsInStock: p.filter((x: any) => x.status === 'in stock').length,
      preordersWaiting: o.filter((x: any) => x.status === 'pending').length,
      bonusTickets: tk.filter((x: any) => x.ticket_type === 'bonus' && x.status === 'available').length,
    });

    // Build recent activity
    const recentItems: RecentItem[] = [];
    o.slice(0, 3).forEach((x: any) => {
      recentItems.push({
        id: Math.random().toString(),
        type: x.payment_status === 'proof_uploaded' ? 'payment' : 'order',
        label: x.payment_status === 'proof_uploaded' ? `Payment proof: ${x.member_name}` : `New order: ${x.product_name}`,
        sub: x.member_name,
        time: new Date(x.created_at).toLocaleDateString(),
        color: x.payment_status === 'proof_uploaded' ? '#3B82F6' : '#22C55E',
      });
    });
    m.slice(0, 2).forEach((x: any) => {
      recentItems.push({
        id: Math.random().toString(),
        type: 'member',
        label: 'New member registration',
        sub: new Date(x.created_at).toLocaleDateString(),
        time: new Date(x.created_at).toLocaleDateString(),
        color: '#A855F7',
      });
    });
    setRecent(recentItems.slice(0, 6));
  };

  if (!authed) return (
    <div style={{ minHeight: '100vh', background: '#050505', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(220,38,38,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(220,38,38,0.03) 1px, transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 300, background: 'radial-gradient(ellipse, rgba(220,38,38,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 400, position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 52, height: 52, background: '#DC2626', borderRadius: 12, ...F, fontWeight: 900, fontSize: 20, color: '#fff', marginBottom: 14, boxShadow: '0 0 28px rgba(220,38,38,0.3)' }}>4W</div>
          <div style={{ ...F, fontWeight: 900, fontSize: 24, color: '#F5F5F5', letterSpacing: 2, marginBottom: 4 }}>ADMIN ACCESS</div>
          <div style={{ ...FB, fontSize: 12, color: '#6B7280' }}>Arctic Hustle Mini 4WD Control Center</div>
        </div>

        <div style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, padding: '32px 28px', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ ...F, fontSize: 11, letterSpacing: 3, color: '#B8C1CC', display: 'block', marginBottom: 8 }}>PASSWORD</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPw ? 'text' : 'password'}
                value={pw}
                onChange={e => { setPw(e.target.value); setLoginError(false); }}
                onKeyDown={e => e.key === 'Enter' && login()}
                placeholder="Enter admin password"
                style={{ width: '100%', background: '#050505', border: `1px solid ${loginError ? 'rgba(220,38,38,0.6)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 10, padding: '13px 46px 13px 16px', color: '#F5F5F5', ...FB, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                onFocus={e => { if (!loginError) e.target.style.borderColor = 'rgba(220,38,38,0.4)'; }}
                onBlur={e => { if (!loginError) e.target.style.borderColor = 'rgba(255,255,255,0.08)'; }}
              />
              <button onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer', fontSize: 15 }}>
                {showPw ? '🙈' : '👁️'}
              </button>
            </div>
            {loginError && <div style={{ ...FB, fontSize: 12, color: '#DC2626', marginTop: 6 }}>⚠ Incorrect password</div>}
          </div>
          <button
            onClick={login}
            style={{ width: '100%', background: '#DC2626', color: '#fff', border: 'none', borderRadius: 10, padding: '14px', ...F, fontWeight: 900, fontSize: 17, letterSpacing: 2, cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.background = '#B91C1C'}
            onMouseLeave={e => e.currentTarget.style.background = '#DC2626'}
          >
            ACCESS DASHBOARD →
          </button>
        </div>
        <div style={{ textAlign: 'center', marginTop: 20, ...FB, fontSize: 11, color: '#374151' }}>
          🔒 Restricted access — Greenland Mini 4WD Club
        </div>
      </div>
    </div>
  );

  const STAT_CARDS = [
    { label: 'Total Members', value: stats.totalMembers, icon: '👥', color: '#3B82F6', href: '/admin/members' },
    { label: 'Official Members', value: stats.officialMembers, icon: '✓', color: '#22C55E', href: '/admin/members' },
    { label: 'Pending Orders', value: stats.pendingOrders, icon: '⏳', color: '#FACC15', href: '/admin/orders', alert: stats.pendingOrders > 0 },
    { label: 'Proof Uploads', value: stats.pendingProofs, icon: '📸', color: '#F97316', href: '/admin/orders', alert: stats.pendingProofs > 0 },
    { label: 'Active Tournaments', value: stats.activeTournaments, icon: '🏁', color: '#DC2626', href: '/admin/tournaments' },
    { label: 'Products In Stock', value: stats.productsInStock, icon: '📦', color: '#22C55E', href: '/admin/products' },
    { label: 'Preorders Waiting', value: stats.preordersWaiting, icon: '🛒', color: '#A855F7', href: '/admin/orders' },
    { label: 'Bonus Tickets', value: stats.bonusTickets, icon: '🎟️', color: '#FACC15', href: '/admin/tickets' },
  ];

  const QUICK_ACTIONS = [
    { label: 'Add Product', icon: '➕', href: '/admin/products', color: '#22C55E' },
    { label: 'Create Tournament', icon: '🏁', href: '/admin/tournaments', color: '#DC2626' },
    { label: 'Confirm Payments', icon: '✅', href: '/admin/orders', color: '#FACC15', badge: stats.pendingProofs },
    { label: 'Manage Members', icon: '👥', href: '/admin/members', color: '#3B82F6' },
    { label: 'Upload Gallery', icon: '🖼️', href: '/admin/gallery', color: '#A855F7' },
    { label: 'Post News', icon: '📰', href: '/admin/news', color: '#F97316' },
  ];

  return (
    <AdminLayout title="DASHBOARD" subtitle="CONTROL CENTER">
      <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>

        {/* Stats grid */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ ...F, fontSize: 11, letterSpacing: 4, color: '#B8C1CC', marginBottom: 14 }}>OVERVIEW</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            {STAT_CARDS.map(s => (
              <Link key={s.label} href={s.href} style={{ textDecoration: 'none' }}>
                <div
                  style={{ background: '#071426', border: `1px solid ${s.alert ? s.color + '44' : 'rgba(255,255,255,0.06)'}`, borderRadius: 14, padding: '18px 16px', cursor: 'pointer', position: 'relative', overflow: 'hidden', transition: 'border-color 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = s.color + '66'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = s.alert ? s.color + '44' : 'rgba(255,255,255,0.06)'}
                >
                  {s.alert && <div style={{ position: 'absolute', top: 10, right: 10, width: 8, height: 8, background: s.color, borderRadius: '50%', boxShadow: `0 0 8px ${s.color}` }} />}
                  <div style={{ fontSize: 22, marginBottom: 8 }}>{s.icon}</div>
                  <div style={{ ...F, fontWeight: 900, fontSize: 36, color: s.color, lineHeight: 1, marginBottom: 4 }}>{s.value}</div>
                  <div style={{ ...F, fontSize: 11, letterSpacing: 1, color: '#B8C1CC' }}>{s.label}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>

          {/* Quick actions */}
          <div>
            <div style={{ ...F, fontSize: 11, letterSpacing: 4, color: '#B8C1CC', marginBottom: 14 }}>QUICK ACTIONS</div>
            <div style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, overflow: 'hidden' }}>
              {QUICK_ACTIONS.map((a, i) => (
                <Link key={a.label} href={a.href} style={{ textDecoration: 'none' }}>
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: i < QUICK_ACTIONS.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', cursor: 'pointer', transition: 'background 0.15s', position: 'relative' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: a.color + '18', border: `1px solid ${a.color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{a.icon}</div>
                    <span style={{ ...F, fontWeight: 700, fontSize: 15, color: '#F5F5F5', letterSpacing: 1, flex: 1 }}>{a.label}</span>
                    {a.badge ? <span style={{ background: a.color, color: '#050505', ...F, fontWeight: 900, fontSize: 11, padding: '2px 8px', borderRadius: 10 }}>{a.badge}</span> : null}
                    <span style={{ color: '#6B7280', fontSize: 14 }}>→</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Recent activity */}
          <div>
            <div style={{ ...F, fontSize: 11, letterSpacing: 4, color: '#B8C1CC', marginBottom: 14 }}>RECENT ACTIVITY</div>
            <div style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, overflow: 'hidden' }}>
              {recent.length === 0 ? (
                <div style={{ padding: '32px 20px', textAlign: 'center', ...FB, fontSize: 13, color: '#6B7280' }}>No recent activity yet.</div>
              ) : recent.map((item, i) => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: i < recent.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, flexShrink: 0, boxShadow: `0 0 6px ${item.color}88` }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ ...F, fontWeight: 600, fontSize: 14, color: '#F5F5F5', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</div>
                    <div style={{ ...FB, fontSize: 11, color: '#6B7280' }}>{item.sub}</div>
                  </div>
                  <div style={{ ...FB, fontSize: 11, color: '#6B7280', flexShrink: 0 }}>{item.time}</div>
                </div>
              ))}
              <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                <Link href="/admin/orders" style={{ ...F, fontSize: 12, letterSpacing: 2, color: '#DC2626', textDecoration: 'none' }}>VIEW ALL ORDERS →</Link>
              </div>
            </div>
          </div>
        </div>

        {/* Module links */}
        <div style={{ marginTop: 28 }}>
          <div style={{ ...F, fontSize: 11, letterSpacing: 4, color: '#B8C1CC', marginBottom: 14 }}>ALL MODULES</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
            {[
              { href: '/admin/orders',      icon: '📦', label: 'Orders',      desc: 'Payments & proofs' },
              { href: '/admin/products',    icon: '🛒', label: 'Products',    desc: 'Shop catalog' },
              { href: '/admin/members',     icon: '👥', label: 'Members',     desc: 'Accounts & status' },
              { href: '/admin/tournaments', icon: '🏁', label: 'Tournaments', desc: 'Race events' },
              { href: '/admin/tickets',     icon: '🎟️', label: 'Tickets',     desc: 'Loyalty & bonus' },
              { href: '/admin/news',        icon: '📰', label: 'News',        desc: 'Posts & updates' },
              { href: '/admin/gallery',     icon: '🖼️', label: 'Gallery',     desc: 'Photos & media' },
            ].map(m => (
              <Link key={m.href} href={m.href} style={{ textDecoration: 'none' }}>
                <div
                  style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '16px 14px', cursor: 'pointer', transition: 'border-color 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(220,38,38,0.3)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'}
                >
                  <div style={{ fontSize: 22, marginBottom: 8 }}>{m.icon}</div>
                  <div style={{ ...F, fontWeight: 700, fontSize: 15, color: '#F5F5F5', letterSpacing: 1, marginBottom: 2 }}>{m.label}</div>
                  <div style={{ ...FB, fontSize: 11, color: '#6B7280' }}>{m.desc}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
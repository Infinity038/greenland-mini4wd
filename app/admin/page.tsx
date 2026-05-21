'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const ADMIN_PASSWORD = 'mini4wd2026';
const F = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
const FB = { fontFamily: "'DM Sans', sans-serif" } as const;

const NAV = [
  { href: '/admin/orders',      icon: '📦', label: 'Orders',      desc: 'Payments & proofs' },
  { href: '/admin/products',    icon: '🛒', label: 'Products',    desc: 'Shop catalog' },
  { href: '/admin/members',     icon: '👥', label: 'Members',     desc: 'Accounts & status' },
  { href: '/admin/tournaments', icon: '🏁', label: 'Tournaments', desc: 'Race events' },
  { href: '/admin/tickets',     icon: '🎟️', label: 'Tickets',     desc: 'Loyalty & bonus' },
  { href: '/admin/news',        icon: '📰', label: 'News',        desc: 'Posts & updates' },
  { href: '/admin/gallery',     icon: '🖼️', label: 'Gallery',     desc: 'Photos & media' },
];

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loginError, setLoginError] = useState(false);
  const [stats, setStats] = useState({
    totalMembers: 0, officialMembers: 0,
    pendingOrders: 0, pendingProofs: 0,
    activeTournaments: 0, productsInStock: 0,
    bonusTickets: 0, preordersWaiting: 0,
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [recentMembers, setRecentMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const login = () => {
    if (pw === ADMIN_PASSWORD) { setAuthed(true); setLoginError(false); }
    else setLoginError(true);
  };

  useEffect(() => {
    if (!authed) return;
    setLoading(true);
    Promise.all([
      supabase.from('members').select('member_status, created_at, name, email'),
      supabase.from('orders').select('payment_status, status, created_at, member_name, product_name, id').order('created_at', { ascending: false }),
      supabase.from('tournaments').select('status'),
      supabase.from('products').select('status, stock_qty'),
      supabase.from('tickets').select('ticket_type, status'),
    ]).then(([{ data: m }, { data: o }, { data: t }, { data: p }, { data: tk }]) => {
      const members = m || [];
      const orders = o || [];
      const tournaments = t || [];
      const products = p || [];
      const tickets = tk || [];
      setStats({
        totalMembers: members.length,
        officialMembers: members.filter((x: any) => x.member_status === 'official').length,
        pendingOrders: orders.filter((x: any) => x.payment_status === 'awaiting_payment').length,
        pendingProofs: orders.filter((x: any) => x.payment_status === 'proof_uploaded').length,
        activeTournaments: tournaments.filter((x: any) => ['upcoming', 'ongoing'].includes(x.status)).length,
        productsInStock: products.filter((x: any) => x.status === 'in stock').length,
        bonusTickets: tickets.filter((x: any) => x.ticket_type === 'bonus' && x.status === 'available').length,
        preordersWaiting: orders.filter((x: any) => x.status === 'pending').length,
      });
      setRecentOrders(orders.slice(0, 5));
      setRecentMembers(members.slice(0, 5));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [authed]);

  // LOGIN SCREEN
  if (!authed) return (
    <div style={{ minHeight: '100vh', background: '#050505', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(220,38,38,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(220,38,38,0.03) 1px, transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: '25%', left: '50%', transform: 'translateX(-50%)', width: 500, height: 300, background: 'radial-gradient(ellipse, rgba(220,38,38,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 400, position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, background: '#DC2626', borderRadius: 14, ...F, fontWeight: 900, fontSize: 22, color: '#fff', marginBottom: 16, boxShadow: '0 0 32px rgba(220,38,38,0.25)' }}>4W</div>
          <div style={{ ...F, fontWeight: 900, fontSize: 28, color: '#F5F5F5', letterSpacing: 2, lineHeight: 1, marginBottom: 6 }}>ADMIN ACCESS</div>
          <div style={{ ...FB, fontSize: 13, color: '#6B7280' }}>Greenland Mini 4WD — Control Center</div>
        </div>

        {/* Card */}
        <div style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '32px 28px', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}>
          <label style={{ ...F, fontSize: 11, letterSpacing: 3, color: '#B8C1CC', display: 'block', marginBottom: 8 }}>PASSWORD</label>
          <div style={{ position: 'relative', marginBottom: loginError ? 8 : 20 }}>
            <input
              type={showPw ? 'text' : 'password'}
              value={pw}
              onChange={e => { setPw(e.target.value); setLoginError(false); }}
              onKeyDown={e => e.key === 'Enter' && login()}
              placeholder="Enter admin password"
              autoFocus
              style={{ width: '100%', background: '#050505', border: `1px solid ${loginError ? '#DC2626' : 'rgba(255,255,255,0.08)'}`, borderRadius: 10, padding: '14px 48px 14px 16px', color: '#F5F5F5', ...FB, fontSize: 15, outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
              onFocus={e => { if (!loginError) e.target.style.borderColor = 'rgba(220,38,38,0.5)'; }}
              onBlur={e => { if (!loginError) e.target.style.borderColor = 'rgba(255,255,255,0.08)'; }}
            />
            <button onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>
              {showPw ? '🙈' : '👁️'}
            </button>
          </div>
          {loginError && <div style={{ ...FB, fontSize: 13, color: '#DC2626', marginBottom: 16 }}>⚠ Incorrect password. Access denied.</div>}
          <button
            onClick={login}
            style={{ width: '100%', background: '#DC2626', color: '#fff', border: 'none', borderRadius: 10, padding: '14px', ...F, fontWeight: 900, fontSize: 18, letterSpacing: 3, cursor: 'pointer', transition: 'background 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.background = '#B91C1C'}
            onMouseLeave={e => e.currentTarget.style.background = '#DC2626'}
          >
            ACCESS DASHBOARD →
          </button>
        </div>
        <div style={{ textAlign: 'center', marginTop: 20, ...FB, fontSize: 12, color: '#374151' }}>🔒 Restricted — Greenland Mini 4WD Club Admin</div>
      </div>
    </div>
  );

  // DASHBOARD
  const STAT_CARDS = [
    { label: 'Total Members',    value: stats.totalMembers,     color: '#3B82F6', icon: '👥', href: '/admin/members' },
    { label: 'Official Members', value: stats.officialMembers,  color: '#22C55E', icon: '✓',  href: '/admin/members' },
    { label: 'Pending Orders',   value: stats.pendingOrders,    color: '#FACC15', icon: '⏳', href: '/admin/orders', alert: stats.pendingOrders > 0 },
    { label: 'Proof Uploads',    value: stats.pendingProofs,    color: '#F97316', icon: '📸', href: '/admin/orders', alert: stats.pendingProofs > 0 },
    { label: 'Tournaments',      value: stats.activeTournaments,color: '#DC2626', icon: '🏁', href: '/admin/tournaments' },
    { label: 'In Stock',         value: stats.productsInStock,  color: '#22C55E', icon: '📦', href: '/admin/products' },
    { label: 'Preorders',        value: stats.preordersWaiting, color: '#A855F7', icon: '🛒', href: '/admin/orders' },
    { label: 'Bonus Tickets',    value: stats.bonusTickets,     color: '#FACC15', icon: '🎟️', href: '/admin/tickets' },
  ];

  const QUICK_ACTIONS = [
    { label: 'Confirm Payments', icon: '✅', href: '/admin/orders',      color: '#22C55E', badge: stats.pendingProofs > 0 ? stats.pendingProofs : null },
    { label: 'Add Product',      icon: '➕', href: '/admin/products',    color: '#3B82F6', badge: null },
    { label: 'Create Tournament',icon: '🏁', href: '/admin/tournaments', color: '#DC2626', badge: null },
    { label: 'Manage Members',   icon: '👥', href: '/admin/members',     color: '#A855F7', badge: null },
    { label: 'Post News',        icon: '📰', href: '/admin/news',        color: '#F97316', badge: null },
    { label: 'Upload Gallery',   icon: '🖼️', href: '/admin/gallery',     color: '#FACC15', badge: null },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#050505', color: '#F5F5F5' }}>

      {/* Top bar */}
      <div style={{ background: '#071426', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 20px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, background: '#DC2626', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', ...F, fontWeight: 900, fontSize: 13, color: '#fff' }}>4W</div>
          <div>
            <div style={{ ...F, fontWeight: 900, fontSize: 15, color: '#F5F5F5', letterSpacing: 1, lineHeight: 1 }}>ADMIN DASHBOARD</div>
            <div style={{ ...F, fontSize: 9, letterSpacing: 3, color: '#DC2626', lineHeight: 1 }}>CONTROL CENTER</div>
          </div>
        </div>
        <a href="/" style={{ ...FB, fontSize: 12, color: '#B8C1CC', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '6px 12px' }}>← Back to Site</a>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 20px' }}>

        {/* Welcome */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ ...F, fontWeight: 900, fontSize: 'clamp(22px, 5vw, 32px)', color: '#F5F5F5', marginBottom: 4 }}>Welcome back 👋</div>
          <div style={{ ...FB, fontSize: 14, color: '#6B7280' }}>Here's what's happening at Greenland Mini 4WD Club.</div>
        </div>

        {/* Alert banner if proofs pending */}
        {stats.pendingProofs > 0 && (
          <a href="/admin/orders" style={{ textDecoration: 'none', display: 'block', marginBottom: 20 }}>
            <div style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 20 }}>📸</span>
                <div>
                  <div style={{ ...F, fontWeight: 700, fontSize: 15, color: '#F97316' }}>{stats.pendingProofs} payment proof{stats.pendingProofs > 1 ? 's' : ''} awaiting review</div>
                  <div style={{ ...FB, fontSize: 12, color: '#B8C1CC' }}>Confirm or reject to update order status</div>
                </div>
              </div>
              <span style={{ ...F, fontWeight: 700, fontSize: 13, color: '#F97316', letterSpacing: 1 }}>REVIEW →</span>
            </div>
          </a>
        )}

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginBottom: 28 }}>
          {STAT_CARDS.map(s => (
            <a key={s.label} href={s.href} style={{ textDecoration: 'none' }}>
              <div style={{ background: '#071426', border: `1px solid ${s.alert ? s.color + '44' : 'rgba(255,255,255,0.06)'}`, borderRadius: 14, padding: '16px 14px', position: 'relative', overflow: 'hidden', transition: 'transform 0.15s, border-color 0.15s', cursor: 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = s.color + '66'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = s.alert ? s.color + '44' : 'rgba(255,255,255,0.06)'; }}
              >
                {s.alert && <div style={{ position: 'absolute', top: 10, right: 10, width: 8, height: 8, background: s.color, borderRadius: '50%', boxShadow: `0 0 6px ${s.color}` }} />}
                <div style={{ fontSize: 20, marginBottom: 8 }}>{s.icon}</div>
                <div style={{ ...F, fontWeight: 900, fontSize: 32, color: s.color, lineHeight: 1, marginBottom: 4 }}>{s.value}</div>
                <div style={{ ...F, fontSize: 11, letterSpacing: 1, color: '#B8C1CC' }}>{s.label}</div>
              </div>
            </a>
          ))}
        </div>

        {/* Two column */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 28 }}>

          {/* Quick actions */}
          <div>
            <div style={{ ...F, fontSize: 11, letterSpacing: 4, color: '#B8C1CC', marginBottom: 12 }}>QUICK ACTIONS</div>
            <div style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, overflow: 'hidden' }}>
              {QUICK_ACTIONS.map((a, i) => (
                <a key={a.label} href={a.href} style={{ textDecoration: 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderBottom: i < QUICK_ACTIONS.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', transition: 'background 0.15s', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: a.color + '18', border: `1px solid ${a.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>{a.icon}</div>
                    <span style={{ ...F, fontWeight: 700, fontSize: 15, color: '#F5F5F5', letterSpacing: 1, flex: 1 }}>{a.label}</span>
                    {a.badge ? <span style={{ background: a.color, color: '#050505', ...F, fontWeight: 900, fontSize: 11, padding: '2px 8px', borderRadius: 10 }}>{a.badge}</span> : null}
                    <span style={{ color: '#6B7280', fontSize: 13 }}>→</span>
                  </div>
                </a>
              ))}
            </div>
          </div>

          {/* Recent orders */}
          <div>
            <div style={{ ...F, fontSize: 11, letterSpacing: 4, color: '#B8C1CC', marginBottom: 12 }}>RECENT ORDERS</div>
            <div style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, overflow: 'hidden' }}>
              {loading ? (
                <div style={{ padding: '32px 18px', textAlign: 'center', ...FB, fontSize: 13, color: '#6B7280' }}>Loading...</div>
              ) : recentOrders.length === 0 ? (
                <div style={{ padding: '32px 18px', textAlign: 'center', ...FB, fontSize: 13, color: '#6B7280' }}>No orders yet.</div>
              ) : recentOrders.map((o: any, i: number) => {
                const isProof = o.payment_status === 'proof_uploaded';
                const isConfirmed = o.payment_status === 'payment_confirmed';
                const dotColor = isProof ? '#F97316' : isConfirmed ? '#22C55E' : '#6B7280';
                return (
                  <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px', borderBottom: i < recentOrders.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ ...F, fontWeight: 700, fontSize: 14, color: '#F5F5F5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.product_name}</div>
                      <div style={{ ...FB, fontSize: 11, color: '#6B7280' }}>{o.member_name}</div>
                    </div>
                    <div style={{ ...FB, fontSize: 11, color: '#6B7280', flexShrink: 0 }}>{new Date(o.created_at).toLocaleDateString()}</div>
                  </div>
                );
              })}
              <div style={{ padding: '10px 18px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                <a href="/admin/orders" style={{ ...F, fontSize: 12, letterSpacing: 2, color: '#DC2626', textDecoration: 'none' }}>VIEW ALL ORDERS →</a>
              </div>
            </div>
          </div>
        </div>

        {/* All modules grid */}
        <div style={{ ...F, fontSize: 11, letterSpacing: 4, color: '#B8C1CC', marginBottom: 12 }}>ALL MODULES</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
          {NAV.map(m => (
            <a key={m.href} href={m.href} style={{ textDecoration: 'none' }}>
              <div style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '16px 14px', cursor: 'pointer', transition: 'border-color 0.15s, transform 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(220,38,38,0.35)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <div style={{ fontSize: 22, marginBottom: 8 }}>{m.icon}</div>
                <div style={{ ...F, fontWeight: 700, fontSize: 14, color: '#F5F5F5', letterSpacing: 1, marginBottom: 2 }}>{m.label}</div>
                <div style={{ ...FB, fontSize: 11, color: '#6B7280' }}>{m.desc}</div>
              </div>
            </a>
          ))}
        </div>

      </div>
    </div>
  );
}
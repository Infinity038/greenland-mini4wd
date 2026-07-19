'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { createSupabaseBrowserClient } from '@/lib/supabaseAuth/browserClient';
import type { StaffRole } from '@/lib/supabaseAuth/roles';

const F = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
const FB = { fontFamily: "'DM Sans', sans-serif" } as const;

const NAV = [
  { href: '/admin/orders', icon: '📦', label: 'Orders', desc: 'Payments & proofs' },
  { href: '/admin/products', icon: '🛒', label: 'Products', desc: 'Shop catalog' },
  { href: '/admin/members', icon: '👥', label: 'Members', desc: 'Accounts & status' },
  { href: '/admin/tournaments', icon: '🏁', label: 'Tournaments', desc: 'Race events' },
  { href: '/admin/cars', icon: '🚗', label: 'Garage', desc: 'Car approvals' },
  { href: '/admin/tickets', icon: '🎟️', label: 'Tickets', desc: 'Loyalty & bonus' },
  { href: '/admin/news', icon: '📰', label: 'News', desc: 'Posts & updates' },
  { href: '/admin/gallery', icon: '🖼️', label: 'Gallery', desc: 'Photos & media' },
  { href: '/admin/race-results', icon: '🏎️', label: 'Race Results', desc: 'Enter race data' },
  { href: '/admin/seasons', icon: '📅', label: 'Seasons', desc: 'Manage seasons' },
  { href: '/admin/hall-of-fame', icon: '🏛️', label: 'Hall of Fame', desc: 'Records & history' },
  { href: '/admin/loyalty', icon: '⭐', label: 'Loyalty Points', desc: 'Points & tiers' },
];

interface Stats {
  totalMembers: number;
  officialMembers: number;
  pendingOrders: number;
  pendingProofs: number;
  activeTournaments: number;
  productsInStock: number;
  preordersWaiting: number;
  hofRecords: number;
}

const EMPTY: Stats = { totalMembers: 0, officialMembers: 0, pendingOrders: 0, pendingProofs: 0, activeTournaments: 0, productsInStock: 0, preordersWaiting: 0, hofRecords: 0 };

export default function AdminDashboardContent({ roles }: { roles: StaffRole[] }) {
  const router = useRouter();
  const [stats, setStats] = useState<Stats>(EMPTY);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: members }, { data: orders }, { data: tournaments }, { data: products }, { data: hallOfFame }] = await Promise.all([
        supabase.from('members').select('id, member_status'),
        supabase.from('orders').select('id, payment_status, status, created_at, member_name, product_name').order('created_at', { ascending: false }),
        supabase.from('tournaments').select('id, status'),
        supabase.from('products').select('id, status, stock_qty'),
        supabase.from('hall_of_fame').select('id, member_name').neq('member_name', 'TBD'),
      ]);
      if (cancelled) return;
      const m = members || [];
      const o = orders || [];
      const t = tournaments || [];
      const p = products || [];
      setStats({
        totalMembers: m.length,
        officialMembers: m.filter((row: any) => row.member_status?.toLowerCase() === 'official').length,
        pendingOrders: o.filter((row: any) => row.payment_status === 'awaiting_payment').length,
        pendingProofs: o.filter((row: any) => row.payment_status === 'proof_uploaded').length,
        activeTournaments: t.filter((row: any) => row.status === 'upcoming' || row.status === 'ongoing').length,
        productsInStock: p.filter((row: any) => row.status === 'in stock').length,
        preordersWaiting: o.filter((row: any) => row.status === 'pending').length,
        hofRecords: hallOfFame?.length || 0,
      });
      setRecentOrders(o.slice(0, 5));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  async function signOut() {
    setSigningOut(true);
    const client = createSupabaseBrowserClient();
    await client.auth.signOut();
    router.replace('/admin/login');
    router.refresh();
  }

  const cards = [
    ['Total Members', stats.totalMembers, '👥', '#3B82F6', '/admin/members'],
    ['Official Members', stats.officialMembers, '✓', '#22C55E', '/admin/members'],
    ['Pending Orders', stats.pendingOrders, '⏳', '#FACC15', '/admin/orders'],
    ['Proof Uploads', stats.pendingProofs, '📸', '#F97316', '/admin/orders'],
    ['Tournaments', stats.activeTournaments, '🏁', '#DC2626', '/admin/tournaments'],
    ['In Stock', stats.productsInStock, '📦', '#22C55E', '/admin/products'],
    ['Preorders', stats.preordersWaiting, '🛒', '#A855F7', '/admin/orders'],
    ['HoF Records', stats.hofRecords, '🏛️', '#FACC15', '/admin/hall-of-fame'],
  ] as const;

  return (
    <div style={{ minHeight: '100vh', background: '#050505', color: '#F5F5F5' }}>
      <div style={{ background: '#071426', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 20px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, background: '#DC2626', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', ...F, fontWeight: 900, fontSize: 13 }}>4W</div>
          <div>
            <div style={{ ...F, fontWeight: 900, fontSize: 15, letterSpacing: 1 }}>ADMIN DASHBOARD</div>
            <div style={{ ...F, fontSize: 9, letterSpacing: 3, color: '#DC2626' }}>{roles.join(', ').toUpperCase()}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/" style={{ ...FB, fontSize: 12, color: '#B8C1CC', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '6px 12px' }}>← Site</Link>
          <button onClick={signOut} disabled={signingOut} style={{ ...FB, fontSize: 12, color: '#DC2626', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 6, padding: '6px 12px', cursor: signingOut ? 'not-allowed' : 'pointer' }}>{signingOut ? 'Signing out…' : 'Sign Out'}</button>
        </div>
      </div>

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 20px' }}>
        <div style={{ ...F, fontWeight: 900, fontSize: 'clamp(22px, 5vw, 32px)', marginBottom: 20 }}>Welcome back 👋</div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10, marginBottom: 28 }}>
          {cards.map(([label, value, icon, color, href]) => (
            <Link key={label} href={href} style={{ textDecoration: 'none' }}>
              <div style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '14px 12px' }}>
                <div style={{ fontSize: 18, marginBottom: 6 }}>{icon}</div>
                <div style={{ ...F, fontWeight: 900, fontSize: 28, color, lineHeight: 1, marginBottom: 4 }}>{loading ? '—' : value}</div>
                <div style={{ ...F, fontSize: 10, letterSpacing: 1, color: '#B8C1CC' }}>{label}</div>
              </div>
            </Link>
          ))}
        </div>

        <div style={{ ...F, fontSize: 11, letterSpacing: 4, color: '#B8C1CC', marginBottom: 12 }}>RECENT ORDERS</div>
        <div style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, overflow: 'hidden', marginBottom: 28 }}>
          {loading ? <div style={{ padding: 28, textAlign: 'center', ...FB, color: '#6B7280' }}>Loading…</div> : recentOrders.length === 0 ? <div style={{ padding: 28, textAlign: 'center', ...FB, color: '#6B7280' }}>No orders yet.</div> : recentOrders.map((order, index) => (
            <div key={order.id} style={{ display: 'flex', gap: 10, padding: '12px 18px', borderBottom: index < recentOrders.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
              <div style={{ flex: 1 }}><div style={{ ...F, fontWeight: 700 }}>{order.product_name}</div><div style={{ ...FB, fontSize: 11, color: '#6B7280' }}>{order.member_name}</div></div>
              <div style={{ ...FB, fontSize: 11, color: '#6B7280' }}>{new Date(order.created_at).toLocaleDateString()}</div>
            </div>
          ))}
        </div>

        <div style={{ ...F, fontSize: 11, letterSpacing: 4, color: '#B8C1CC', marginBottom: 12 }}>ALL MODULES</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
          {NAV.map(module => (
            <Link key={module.href} href={module.href} style={{ textDecoration: 'none' }}>
              <div style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '16px 14px' }}>
                <div style={{ fontSize: 22, marginBottom: 8 }}>{module.icon}</div>
                <div style={{ ...F, fontWeight: 700, fontSize: 14, color: '#F5F5F5', letterSpacing: 1 }}>{module.label}</div>
                <div style={{ ...FB, fontSize: 11, color: '#6B7280' }}>{module.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}

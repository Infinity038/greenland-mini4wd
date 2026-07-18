'use client';

// Authorized dashboard body for the Supabase-Auth-gated /admin path
// (NEXT_PUBLIC_SUPABASE_AUTH_ENABLED — see page.tsx). Only ever rendered
// after page.tsx's server-side requireStaffSession() check has already
// succeeded — this component itself performs no auth check and trusts the
// `roles` prop purely for display, never for authorization (the actual
// gate already happened server-side before this component's first byte was
// sent to the browser).
//
// Intentionally a separate component from LegacyAdminDashboard.tsx rather
// than a shared extraction — see that file's header comment for why.
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { createSupabaseBrowserClient } from '@/lib/supabaseAuth/browserClient';
import type { StaffRole } from '@/lib/supabaseAuth/roles';

interface MemberRow {
  member_status?: string | null;
}
interface OrderRow {
  id: string;
  payment_status?: string | null;
  status?: string | null;
  created_at: string;
  member_name?: string | null;
  product_name?: string | null;
}
interface TournamentRow {
  status?: string | null;
}
interface ProductRow {
  status?: string | null;
}

const F = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
const FB = { fontFamily: "'DM Sans', sans-serif" } as const;

const NAV = [
  { href: '/admin/pos',          icon: '🧾', label: 'Point of Sale', desc: 'In-person checkout' },
  { href: '/admin/orders',       icon: '📦', label: 'Orders',        desc: 'Payments & proofs' },
  { href: '/admin/products',     icon: '🛒', label: 'Products',      desc: 'Shop catalog' },
  { href: '/admin/members',      icon: '👥', label: 'Members',       desc: 'Accounts & status' },
  { href: '/admin/tournaments',  icon: '🏁', label: 'Tournaments',   desc: 'Race events' },
  { href: '/admin/cars',         icon: '🚗', label: 'Garage',        desc: 'Car approvals' },
  { href: '/admin/tickets',      icon: '🎟️', label: 'Tickets (Legacy)', desc: 'Historical records' },
  { href: '/admin/news',         icon: '📰', label: 'News',          desc: 'Posts & updates' },
  { href: '/admin/gallery',      icon: '🖼️', label: 'Gallery',       desc: 'Photos & media' },
  { href: '/admin/race-results', icon: '🏎️', label: 'Race Results',  desc: 'Enter race data' },
  { href: '/admin/seasons',      icon: '📅', label: 'Seasons',       desc: 'Manage seasons' },
  { href: '/admin/hall-of-fame', icon: '🏛️', label: 'Hall of Fame',  desc: 'Records & history' },
  { href: '/admin/loyalty',      icon: '⭐', label: 'Loyalty Points', desc: 'Points & tiers' },
];

interface DashboardStats {
  totalMembers: number;
  officialMembers: number;
  pendingOrders: number;
  pendingProofs: number;
  activeTournaments: number;
  productsInStock: number;
  preordersWaiting: number;
  activeSeason: string;
  hofRecords: number;
}

const EMPTY_STATS: DashboardStats = {
  totalMembers: 0, officialMembers: 0, pendingOrders: 0, pendingProofs: 0,
  activeTournaments: 0, productsInStock: 0, preordersWaiting: 0,
  activeSeason: '', hofRecords: 0,
};

export default function AdminDashboardContent({ roles }: { roles: StaffRole[] }) {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
  const [recentOrders, setRecentOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: m }, { data: o }, { data: t }, { data: p }, { data: s }, { data: hof }] = await Promise.all([
        supabase.from('members').select('id, member_status'),
        supabase.from('orders').select('id, payment_status, status, created_at, member_name, product_name').order('created_at', { ascending: false }),
        supabase.from('tournaments').select('id, status'),
        supabase.from('products').select('id, status, stock_qty'),
        supabase.from('seasons').select('name, is_active').eq('is_active', true).limit(1),
        supabase.from('hall_of_fame').select('id, member_name').neq('member_name', 'TBD'),
      ]);
      if (cancelled) return;
      const members = m || [];
      const orders = o || [];
      const tournaments = t || [];
      const products = p || [];
      setStats({
        totalMembers: members.length,
        officialMembers: members.filter((x: MemberRow) => x.member_status?.toLowerCase() === 'official').length,
        pendingOrders: orders.filter((x: OrderRow) => x.payment_status === 'awaiting_payment').length,
        pendingProofs: orders.filter((x: OrderRow) => x.payment_status === 'proof_uploaded').length,
        activeTournaments: tournaments.filter((x: TournamentRow) => x.status === 'upcoming' || x.status === 'ongoing').length,
        productsInStock: products.filter((x: ProductRow) => x.status === 'in stock').length,
        preordersWaiting: orders.filter((x: OrderRow) => x.status === 'pending').length,
        activeSeason: s?.[0]?.name || 'No active season',
        hofRecords: hof?.length || 0,
      });
      setRecentOrders(orders.slice(0, 5));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSignOut() {
    setSigningOut(true);
    const client = createSupabaseBrowserClient();
    await client.auth.signOut();
    router.push('/admin/login');
  }

  const isViewerOnly = roles.length === 1 && roles[0] === 'viewer';

  const STAT_CARDS = [
    { label: 'Total Members',    value: stats.totalMembers,      color: '#3B82F6', icon: '👥', href: '/admin/members' },
    { label: 'Official Members', value: stats.officialMembers,   color: '#22C55E', icon: '✓',  href: '/admin/members' },
    { label: 'Pending Orders',   value: stats.pendingOrders,     color: '#FACC15', icon: '⏳', href: '/admin/orders' },
    { label: 'Proof Uploads',    value: stats.pendingProofs,     color: '#F97316', icon: '📸', href: '/admin/orders' },
    { label: 'Tournaments',      value: stats.activeTournaments, color: '#DC2626', icon: '🏁', href: '/admin/tournaments' },
    { label: 'In Stock',         value: stats.productsInStock,   color: '#22C55E', icon: '📦', href: '/admin/products' },
    { label: 'Preorders',        value: stats.preordersWaiting,  color: '#A855F7', icon: '🛒', href: '/admin/orders' },
    { label: 'HoF Records',      value: stats.hofRecords,        color: '#FACC15', icon: '🏛️', href: '/admin/hall-of-fame' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#050505', color: '#F5F5F5' }}>
      <div style={{ background: '#071426', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 20px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, background: '#DC2626', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', ...F, fontWeight: 900, fontSize: 13, color: '#fff' }}>4W</div>
          <div>
            <div style={{ ...F, fontWeight: 900, fontSize: 15, color: '#F5F5F5', letterSpacing: 1, lineHeight: 1 }}>ADMIN DASHBOARD</div>
            <div style={{ ...F, fontSize: 9, letterSpacing: 3, color: '#DC2626', lineHeight: 1 }}>
              {roles.join(', ').toUpperCase()}{isViewerOnly ? ' — READ-ONLY' : ''}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/" style={{ ...FB, fontSize: 12, color: '#B8C1CC', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '6px 12px' }}>← Back to Site</Link>
          <button onClick={handleSignOut} disabled={signingOut} style={{ ...FB, fontSize: 12, color: '#DC2626', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 6, padding: '6px 12px', cursor: signingOut ? 'not-allowed' : 'pointer', opacity: signingOut ? 0.6 : 1 }}>
            {signingOut ? 'Signing out…' : 'Sign Out'}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 20px' }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ ...F, fontWeight: 900, fontSize: 'clamp(22px, 5vw, 32px)', color: '#F5F5F5', marginBottom: 4 }}>Welcome back 👋</div>
          <div style={{ ...FB, fontSize: 14, color: '#6B7280' }}>Greenland Mini 4WD Club — Admin Panel</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10, marginBottom: 28 }}>
          {STAT_CARDS.map(s => (
            <a key={s.label} href={s.href} style={{ textDecoration: 'none' }}>
              <div style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '14px 12px', cursor: 'pointer' }}>
                <div style={{ fontSize: 18, marginBottom: 6 }}>{s.icon}</div>
                <div style={{ ...F, fontWeight: 900, fontSize: 28, color: s.color, lineHeight: 1, marginBottom: 4 }}>{loading ? '—' : s.value}</div>
                <div style={{ ...F, fontSize: 10, letterSpacing: 1, color: '#B8C1CC' }}>{s.label}</div>
              </div>
            </a>
          ))}
        </div>

        <div style={{ marginBottom: 28 }}>
          <div style={{ ...F, fontSize: 11, letterSpacing: 4, color: '#B8C1CC', marginBottom: 12 }}>RECENT ORDERS</div>
          <div style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, overflow: 'hidden' }}>
            {loading ? (
              <div style={{ padding: '32px 18px', textAlign: 'center', ...FB, fontSize: 13, color: '#6B7280' }}>Loading...</div>
            ) : recentOrders.length === 0 ? (
              <div style={{ padding: '32px 18px', textAlign: 'center', ...FB, fontSize: 13, color: '#6B7280' }}>No orders yet.</div>
            ) : recentOrders.map((o: OrderRow, i: number) => (
              <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px', borderBottom: i < recentOrders.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ ...F, fontWeight: 700, fontSize: 14, color: '#F5F5F5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.product_name}</div>
                  <div style={{ ...FB, fontSize: 11, color: '#6B7280' }}>{o.member_name}</div>
                </div>
                <div style={{ ...FB, fontSize: 11, color: '#6B7280', flexShrink: 0 }}>{new Date(o.created_at).toLocaleDateString()}</div>
              </div>
            ))}
            <div style={{ padding: '10px 18px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
              <a href="/admin/orders" style={{ ...F, fontSize: 12, letterSpacing: 2, color: '#DC2626', textDecoration: 'none' }}>VIEW ALL ORDERS →</a>
            </div>
          </div>
        </div>

        <div style={{ ...F, fontSize: 11, letterSpacing: 4, color: '#B8C1CC', marginBottom: 12 }}>ALL MODULES</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
          {NAV.map(m => (
            <a key={m.href} href={m.href} style={{ textDecoration: 'none' }}>
              <div style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '16px 14px', cursor: 'pointer' }}>
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

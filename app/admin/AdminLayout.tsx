'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

const F = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
const FB = { fontFamily: "'DM Sans', sans-serif" } as const;

const NAV = [
  { href: '/admin',               icon: '⬡', label: 'Dashboard' },
  { href: '/admin/orders',        icon: '📦', label: 'Orders' },
  { href: '/admin/products',      icon: '🛒', label: 'Products' },
  { href: '/admin/members',       icon: '👥', label: 'Members' },
  { href: '/admin/tournaments',   icon: '🏁', label: 'Tournaments' },
  { href: '/admin/tickets',       icon: '🎟️', label: 'Tickets' },
  { href: '/admin/news',          icon: '📰', label: 'News' },
  { href: '/admin/gallery',       icon: '🖼️', label: 'Gallery' },
  { href: '/admin/leaderboard',   icon: '🏆', label: 'Leaderboard' },
];

interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export default function AdminLayout({ children, title, subtitle }: AdminLayoutProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#050505', display: 'flex', flexDirection: 'column' }}>

      {/* Top bar */}
      <div style={{ background: '#071426', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 20px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => setOpen(!open)}
            style={{ background: 'none', border: 'none', color: '#B8C1CC', cursor: 'pointer', fontSize: 20, padding: '4px 8px', display: 'flex', alignItems: 'center' }}
          >
            ☰
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, background: '#DC2626', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', ...F, fontWeight: 900, fontSize: 13, color: '#fff' }}>4W</div>
            <div>
              <div style={{ ...F, fontWeight: 900, fontSize: 14, color: '#F5F5F5', letterSpacing: 1, lineHeight: 1 }}>ADMIN</div>
              <div style={{ ...F, fontSize: 9, letterSpacing: 3, color: '#DC2626', lineHeight: 1 }}>CONTROL CENTER</div>
            </div>
          </div>
        </div>
        <a href="/" style={{ ...FB, fontSize: 12, color: '#B8C1CC', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '6px 12px' }}>
          ← Site
        </a>
      </div>

      <div style={{ display: 'flex', flex: 1, position: 'relative' }}>

        {/* Sidebar overlay on mobile */}
        {open && (
          <div
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 40, top: 56 }}
          />
        )}

        {/* Sidebar */}
        <div style={{
          width: 220, background: '#071426', borderRight: '1px solid rgba(255,255,255,0.06)',
          position: 'fixed', top: 56, bottom: 0, left: 0, zIndex: 50,
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s ease',
          overflowY: 'auto',
          // Always visible on large screens
        }}>
          <style>{`
            @media (min-width: 1024px) {
              .admin-sidebar { transform: translateX(0) !important; position: sticky !important; top: 56px !important; height: calc(100vh - 56px) !important; flex-shrink: 0; }
            }
          `}</style>
          <div className="admin-sidebar" style={{ padding: '16px 0' }}>
            {NAV.map(item => {
              const active = isActive(item.href);
              return (
                <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 20px', textDecoration: 'none', background: active ? 'rgba(220,38,38,0.12)' : 'transparent', borderLeft: active ? '3px solid #DC2626' : '3px solid transparent', transition: 'all 0.15s' }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                >
                  <span style={{ fontSize: 16, width: 20, textAlign: 'center' }}>{item.icon}</span>
                  <span style={{ ...F, fontWeight: active ? 700 : 600, fontSize: 14, letterSpacing: 1, color: active ? '#F5F5F5' : '#B8C1CC' }}>{item.label}</span>
                </Link>
              );
            })}

            <div style={{ margin: '16px 20px 0', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16 }}>
              <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', textDecoration: 'none' }}>
                <span style={{ fontSize: 16, width: 20, textAlign: 'center' }}>🌐</span>
                <span style={{ ...F, fontWeight: 600, fontSize: 14, letterSpacing: 1, color: '#6B7280' }}>Back to Site</span>
              </a>
            </div>
          </div>
        </div>

        {/* Main content — offset on desktop */}
        <div style={{ flex: 1, minWidth: 0, marginLeft: 0 }}>
          <style>{`@media (min-width: 1024px) { .admin-main { margin-left: 220px !important; } }`}</style>
          <div className="admin-main">
            {(title || subtitle) && (
              <div style={{ background: '#071426', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '20px 24px' }}>
                {subtitle && <div style={{ ...F, fontSize: 10, letterSpacing: 4, color: '#DC2626', marginBottom: 4 }}>{subtitle}</div>}
                {title && <h1 style={{ ...F, fontWeight: 900, fontSize: 'clamp(20px, 4vw, 28px)', color: '#F5F5F5', margin: 0 }}>{title}</h1>}
              </div>
            )}
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
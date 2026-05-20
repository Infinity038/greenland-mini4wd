'use client';

import { useState } from 'react';
import Link from 'next/link';

const ADMIN_PASSWORD = 'mini4wd2026';

const F = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
const FB = { fontFamily: "'DM Sans', sans-serif" } as const;

const MODULES = [
  { href: '/admin/news',       icon: '📰', label: 'Manage News',       desc: 'Create, edit, publish news posts' },
  { href: '/admin/gallery',    icon: '🖼️', label: 'Manage Gallery',    desc: 'Upload and organize photos' },
  { href: '/admin/products',   icon: '🛒', label: 'Manage Shop',       desc: 'Products, pricing, stock status' },
  { href: '/admin/members',    icon: '👥', label: 'Manage Members',    desc: 'View, edit, suspend members' },
  { href: '/admin/orders',     icon: '📦', label: 'Manage Orders',     desc: 'Payments, proofs, order status' },
  { href: '/admin/tickets',    icon: '🎟️', label: 'Manage Tickets',    desc: 'Race tickets and loyalty rewards' },
  { href: '/admin/tournaments',icon: '🏁', label: 'Manage Tournaments',desc: 'Create and manage race events' },
];

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState('');
  const [err, setErr] = useState(false);

  const login = () => {
    if (pw === ADMIN_PASSWORD) { setAuthed(true); setErr(false); }
    else setErr(true);
  };

  if (!authed) return (
    <div style={{ minHeight: '100vh', background: '#050505', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 40, width: '100%', maxWidth: 380 }}>
        <div style={{ ...F, fontSize: 11, letterSpacing: 5, color: '#DC2626', marginBottom: 8 }}>GREENLAND MINI 4WD CLUB</div>
        <h1 style={{ ...F, fontWeight: 900, fontSize: 32, color: '#F5F5F5', margin: '0 0 32px' }}>ADMIN ACCESS</h1>
        <input
          type="password" value={pw} placeholder="Enter admin password"
          onChange={e => setPw(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && login()}
          style={{ width: '100%', background: '#050505', border: `1px solid ${err ? '#DC2626' : 'rgba(255,255,255,0.1)'}`, borderRadius: 10, padding: '14px 16px', color: '#F5F5F5', ...FB, fontSize: 15, outline: 'none', boxSizing: 'border-box', marginBottom: 8 }}
        />
        {err && <div style={{ ...FB, fontSize: 13, color: '#DC2626', marginBottom: 12 }}>Incorrect password</div>}
        <button onClick={login} style={{ width: '100%', background: '#DC2626', color: '#fff', border: 'none', borderRadius: 10, padding: '14px 24px', ...F, fontWeight: 900, fontSize: 18, letterSpacing: 2, cursor: 'pointer', marginTop: 8 }}>
          LOGIN →
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#050505', color: '#F5F5F5' }}>
      {/* Top bar */}
      <div style={{ background: '#071426', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ ...F, fontSize: 11, letterSpacing: 4, color: '#DC2626' }}>GREENLAND MINI 4WD CLUB</div>
          <div style={{ ...F, fontWeight: 900, fontSize: 22, color: '#F5F5F5' }}>ADMIN DASHBOARD</div>
        </div>
        <a href="/" style={{ ...FB, fontSize: 13, color: '#B8C1CC', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 16px' }}>← Back to Site</a>
      </div>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ ...F, fontWeight: 700, fontSize: 13, letterSpacing: 3, color: '#B8C1CC', marginBottom: 20 }}>MANAGEMENT MODULES</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {MODULES.map(m => (
            <Link key={m.href} href={m.href} style={{ textDecoration: 'none' }}>
              <div style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 24, cursor: 'pointer', transition: 'border-color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(220,38,38,0.4)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
              >
                <div style={{ fontSize: 32, marginBottom: 12 }}>{m.icon}</div>
                <div style={{ ...F, fontWeight: 900, fontSize: 20, color: '#F5F5F5', marginBottom: 4 }}>{m.label}</div>
                <div style={{ ...FB, fontSize: 13, color: '#B8C1CC' }}>{m.desc}</div>
              </div>
            </Link>
          ))}
        </div>

        {/* Role note */}
        <div style={{ marginTop: 40, background: '#071426', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 20 }}>
          <div style={{ ...F, fontWeight: 700, fontSize: 13, letterSpacing: 3, color: '#B8C1CC', marginBottom: 8 }}>FUTURE ADMIN ROLES</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {['super_admin', 'event_manager', 'shop_manager', 'content_manager'].map(r => (
              <span key={r} style={{ ...F, fontSize: 12, letterSpacing: 2, padding: '4px 10px', borderRadius: 4, background: 'rgba(255,255,255,0.05)', color: '#6B7280', border: '1px solid rgba(255,255,255,0.06)' }}>{r}</span>
            ))}
          </div>
          <div style={{ ...FB, fontSize: 12, color: '#6B7280', marginTop: 8 }}>Role-based access control planned for future release.</div>
        </div>
      </div>
    </div>
  );
}
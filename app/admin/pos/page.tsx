'use client';
import { useState } from 'react';
import POSTerminal from '@/components/pos/POSTerminal';

const F  = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
const FB = { fontFamily: "'DM Sans', sans-serif" } as const;

function checkAuth() {
  if (typeof window === 'undefined') return false;
  try { const { expires } = JSON.parse(localStorage.getItem('adminSession') || '{}'); return Date.now() < expires; }
  catch { return false; }
}
function saveAuth() {
  localStorage.setItem('adminSession', JSON.stringify({ expires: Date.now() + 8 * 60 * 60 * 1000 }));
}

export default function AdminPosPage() {
  const [authed, setAuthed] = useState(() => checkAuth());
  const [pw, setPw] = useState('');
  const [pwError, setPwError] = useState('');

  function handleLogin() {
    if (pw === 'mini4wd2026') { saveAuth(); setAuthed(true); }
    else setPwError('Wrong password');
  }

  if (!authed) return (
    <div style={{ background: '#050505', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '32px 28px', width: '100%', maxWidth: 360 }}>
        <div style={{ ...F, fontWeight: 900, fontSize: 20, letterSpacing: 2, marginBottom: 20, color: '#F5F5F5' }}>ADMIN LOGIN</div>
        <input style={{ background: '#050505', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', color: '#F5F5F5', ...FB, fontSize: 13, width: '100%', boxSizing: 'border-box', marginBottom: 8 }}
          type="password" placeholder="Password" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} />
        {pwError && <div style={{ color: '#DC2626', ...FB, fontSize: 12, marginBottom: 8 }}>{pwError}</div>}
        <button onClick={handleLogin} style={{ width: '100%', background: '#DC2626', color: '#fff', border: 'none', borderRadius: 8, padding: 12, ...F, fontWeight: 900, fontSize: 16, letterSpacing: 2, cursor: 'pointer', marginTop: 4 }}>LOGIN →</button>
      </div>
    </div>
  );

  return (
    <div style={{ background: '#050505', minHeight: '100vh', color: '#F5F5F5' }}>
      <div style={{ background: '#071426', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 50 }}>
        <a href="/admin" style={{ ...FB, fontSize: 12, color: '#6B7280', textDecoration: 'none' }}>← Dashboard</a>
        <div style={{ ...F, fontWeight: 900, fontSize: 18, letterSpacing: 2 }}>POINT OF SALE</div>
      </div>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 20px' }}>
        <div style={{ ...FB, fontSize: 13, color: '#B8C1CC', marginBottom: 20, background: 'rgba(107,114,128,0.08)', border: '1px solid rgba(107,114,128,0.25)', borderRadius: 8, padding: '10px 14px', lineHeight: 1.7 }}>
          🔧 <strong style={{ color: '#F5F5F5' }}>Mock screen.</strong> This terminal simulates the full grocery-style sale flow — scan products/services, scan a Racer QR or Racer ID, apply a reward or Shop Credit, confirm payment — entirely in memory. No stock, points, receipt, or audit-log record shown here is written to a live table. That requires the Mini4WD Supabase schema, authentication and RLS to be reviewed and approved first.
        </div>
        <POSTerminal />
      </div>
    </div>
  );
}

'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
const F = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
const FB = { fontFamily: "'DM Sans', sans-serif" } as const;

function checkAuth() {
  if (typeof window === 'undefined') return false;
  try { const { expires } = JSON.parse(localStorage.getItem('adminSession') || '{}'); return Date.now() < expires; } catch { return false; }
}
function saveAuth() { localStorage.setItem('adminSession', JSON.stringify({ expires: Date.now() + 8 * 60 * 60 * 1000 })); }

const CHASSIS = ['AR', 'MA', 'VS', 'MS', 'FM-A', 'S2', 'Other'];
const STATUS_COLORS: Record<string, string> = { pending: '#FACC15', approved: '#22C55E', rejected: '#DC2626' };

export default function AdminCarsPage() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState('');
  const [pwErr, setPwErr] = useState('');
  const [cars, setCars] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const [saving, setSaving] = useState<string | null>(null);
  const [msg, setMsg] = useState('');

  const stats = {
    total: cars.length,
    pending: cars.filter(c => c.status === 'pending').length,
    approved: cars.filter(c => c.status === 'approved').length,
    rejected: cars.filter(c => c.status === 'rejected').length,
  };

  useEffect(() => { if (checkAuth()) { setAuthed(true); loadData(); } }, []);

  async function loadData() {
    const { data } = await supabase.from('cars').select('*').order('created_at', { ascending: false });
    setCars(data || []);
  }

  async function updateStatus(id: string, status: string, notes?: string) {
    setSaving(id);
    await supabase.from('cars').update({ status, ...(notes ? { notes } : {}) }).eq('id', id);
    setMsg(status === 'approved' ? '✅ Car approved!' : '❌ Car rejected');
    loadData();
    setSaving(null);
    setTimeout(() => setMsg(''), 2000);
  }

  async function deleteCar(id: string) {
    if (!confirm('Delete this car registration?')) return;
    await supabase.from('cars').delete().eq('id', id);
    loadData();
  }

  const filtered = filter === 'all' ? cars : cars.filter(c => c.status === filter);

  const inp = { background: '#050505', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', color: '#F5F5F5', ...FB, fontSize: 13, outline: 'none' } as const;

  if (!authed) return (
    <div style={{ minHeight: '100vh', background: '#050505', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '32px 28px', width: '100%', maxWidth: 360 }}>
        <div style={{ ...F, fontWeight: 900, fontSize: 20, letterSpacing: 2, color: '#F5F5F5', marginBottom: 20 }}>ADMIN LOGIN</div>
        <input style={{ ...inp, width: '100%', boxSizing: 'border-box', marginBottom: 8 }} type="password" placeholder="Password" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === 'Enter' && (pw === 'mini4wd2026' ? (saveAuth(), setAuthed(true), loadData()) : setPwErr('Wrong password'))} />
        {pwErr && <div style={{ color: '#DC2626', ...FB, fontSize: 12, marginBottom: 8 }}>{pwErr}</div>}
        <button onClick={() => pw === 'mini4wd2026' ? (saveAuth(), setAuthed(true), loadData()) : setPwErr('Wrong password')}
          style={{ width: '100%', background: '#DC2626', color: '#fff', border: 'none', borderRadius: 8, padding: 12, ...F, fontWeight: 900, fontSize: 16, letterSpacing: 2, cursor: 'pointer', marginTop: 4 }}>LOGIN →</button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#050505', color: '#F5F5F5' }}>
      <div style={{ background: '#071426', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 20px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <a href="/admin" style={{ ...FB, fontSize: 12, color: '#6B7280', textDecoration: 'none' }}>← Dashboard</a>
          <div style={{ ...F, fontWeight: 900, fontSize: 18, letterSpacing: 2 }}>GARAGE — CAR REGISTRATIONS</div>
        </div>
      </div>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 20px' }}>
        {msg && <div style={{ ...FB, fontSize: 13, color: '#22C55E', marginBottom: 16, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8, padding: '10px 14px' }}>{msg}</div>}

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
          {[{ label: 'Total', value: stats.total, color: '#3B82F6' }, { label: 'Pending', value: stats.pending, color: '#FACC15' }, { label: 'Approved', value: stats.approved, color: '#22C55E' }, { label: 'Rejected', value: stats.rejected, color: '#DC2626' }].map(s => (
            <div key={s.label} style={{ background: '#071426', border: `1px solid ${s.color}22`, borderRadius: 10, padding: '14px 12px', textAlign: 'center' }}>
              <div style={{ ...F, fontWeight: 900, fontSize: 28, color: s.color }}>{s.value}</div>
              <div style={{ ...FB, fontSize: 11, color: '#6B7280', letterSpacing: 1 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          {['all', 'pending', 'approved', 'rejected'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ ...F, fontSize: 11, letterSpacing: 1, padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', background: filter === f ? '#DC2626' : 'rgba(255,255,255,0.06)', color: filter === f ? '#fff' : '#B8C1CC' }}>
              {f.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Car list */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, ...FB, color: '#6B7280' }}>No cars found.</div>
        ) : filtered.map(car => (
          <div key={car.id} style={{ background: '#071426', border: `1px solid ${STATUS_COLORS[car.status] || '#333'}33`, borderRadius: 12, padding: 20, marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              {car.image_url ? (
                <img src={car.image_url} alt={car.name} style={{ width: 72, height: 72, objectFit: 'contain', borderRadius: 8, background: '#050505', border: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              ) : (
                <div style={{ width: 72, height: 72, borderRadius: 8, background: '#050505', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0 }}>🏎️</div>
              )}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                  <span style={{ ...F, fontWeight: 900, fontSize: 20, color: '#F5F5F5' }}>{car.name}</span>
                  <span style={{ ...F, fontSize: 10, letterSpacing: 2, padding: '2px 10px', borderRadius: 20, background: (STATUS_COLORS[car.status] || '#6B7280') + '22', color: STATUS_COLORS[car.status] || '#6B7280', border: `1px solid ${STATUS_COLORS[car.status] || '#6B7280'}44` }}>
                    {car.status?.toUpperCase()}
                  </span>
                </div>
                <div style={{ ...FB, fontSize: 13, color: '#B8C1CC', marginBottom: 2 }}>{car.member_name} · {car.member_email}</div>
                <div style={{ ...FB, fontSize: 12, color: '#6B7280', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {car.chassis && <span>Chassis: <strong style={{ color: '#F5F5F5' }}>{car.chassis}</strong></span>}
                  {car.series && <span>Series: {car.series}</span>}
                  {car.color && <span>Color: {car.color}</span>}
                  <span>{car.bought_from === 'club_shop' ? '🏪 Club Shop' : '🛒 Outside'}</span>
                  <span>{new Date(car.created_at).toLocaleDateString('en-GB')}</span>
                </div>
                {car.notes && <div style={{ ...FB, fontSize: 12, color: '#B8C1CC', marginTop: 4 }}>Notes: {car.notes}</div>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                {car.status !== 'approved' && (
                  <button onClick={() => updateStatus(car.id, 'approved')} disabled={saving === car.id}
                    style={{ background: '#22C55E', color: '#000', border: 'none', borderRadius: 6, padding: '8px 16px', ...F, fontWeight: 700, fontSize: 12, letterSpacing: 1, cursor: 'pointer' }}>
                    ✓ APPROVE
                  </button>
                )}
                {car.status !== 'rejected' && (
                  <button onClick={() => updateStatus(car.id, 'rejected')} disabled={saving === car.id}
                    style={{ background: 'rgba(220,38,38,0.1)', color: '#DC2626', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 6, padding: '8px 16px', ...F, fontWeight: 700, fontSize: 12, letterSpacing: 1, cursor: 'pointer' }}>
                    ✕ REJECT
                  </button>
                )}
                <button onClick={() => deleteCar(car.id)}
                  style={{ background: 'transparent', color: '#6B7280', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, padding: '6px 12px', ...FB, fontSize: 12, cursor: 'pointer' }}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
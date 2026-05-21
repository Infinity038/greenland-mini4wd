'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const ADMIN_PASSWORD = 'mini4wd2026';
const F = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
const FB = { fontFamily: "'DM Sans', sans-serif" } as const;

const STATUS_LABELS: Record<string, string> = {
  awaiting_payment: 'Awaiting Payment', proof_uploaded: 'Proof Uploaded',
  payment_confirmed: 'Payment Confirmed', rejected: 'Proof Rejected',
  pending: 'Pending', reserved: 'Reserved', awaiting_stock: 'Awaiting Stock',
  in_transit: 'In Transit', ready_for_pickup: 'Ready for Pickup',
  completed: 'Completed', cancelled: 'Cancelled',
};
const STATUS_COLORS: Record<string, string> = {
  awaiting_payment: '#FACC15', proof_uploaded: '#3B82F6', payment_confirmed: '#22C55E',
  rejected: '#DC2626', pending: '#FACC15', reserved: '#22C55E', awaiting_stock: '#F97316',
  in_transit: '#3B82F6', ready_for_pickup: '#10B981', completed: '#6B7280', cancelled: '#DC2626',
};
const ALL_STATUSES = ['awaiting_payment','proof_uploaded','payment_confirmed','rejected','reserved','awaiting_stock','in_transit','ready_for_pickup','completed','cancelled'];

export default function AdminOrdersPage() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState('');
  const [orders, setOrders] = useState<any[]>([]);
  const [proofs, setProofs] = useState<Record<string, any>>({});
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [activeProof, setActiveProof] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState('all');
  const [tab, setTab] = useState<'orders' | 'members'>('orders');

  const login = () => { if (pw === ADMIN_PASSWORD) setAuthed(true); };

  const fetchData = async () => {
    setLoading(true);
    const [{ data: o }, { data: pr }, { data: m }] = await Promise.all([
      supabase.from('orders').select('*').order('created_at', { ascending: false }),
      supabase.from('payment_proofs').select('*'),
      supabase.from('members').select('*').order('created_at', { ascending: false }),
    ]);
    setOrders(o || []);
    setMembers(m || []);
    const pm: Record<string, any> = {};
    (pr || []).forEach((p: any) => { pm[p.order_id] = p; });
    setProofs(pm);
    const nm: Record<string, string> = {};
    (o || []).forEach((x: any) => { nm[x.id] = x.notes || ''; });
    setNotes(nm);
    setLoading(false);
  };

  useEffect(() => { if (authed) fetchData(); }, [authed]);

  const updateOrder = async (id: string, updates: any) => {
    setSaving(id);
    await supabase.from('orders').update(updates).eq('id', id);
    await fetchData();
    setSaving(null);
  };

  const confirmPayment = async (order: any) => {
    setSaving(order.id);
    await supabase.from('orders').update({ payment_status: 'payment_confirmed', status: 'reserved' }).eq('id', order.id);
    if (proofs[order.id]) {
      await supabase.from('payment_proofs').update({ status: 'confirmed', reviewed_at: new Date().toISOString() }).eq('order_id', order.id);
    }
    await fetchData();
    setSaving(null);
  };

  const rejectProof = async (id: string) => {
    setSaving(id);
    await supabase.from('orders').update({ payment_status: 'rejected' }).eq('id', id);
    if (proofs[id]) await supabase.from('payment_proofs').update({ status: 'rejected' }).eq('order_id', id);
    await fetchData();
    setSaving(null);
  };

  const unlockMembership = async (email: string) => {
    await supabase.from('members').update({ member_status: 'official' }).eq('email', email);
    await fetchData();
  };

  const filtered = filter === 'all' ? orders : orders.filter(o => (o.payment_status || o.status) === filter);

  if (!authed) return (
    <div style={{ minHeight: '100vh', background: '#050505', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(220,38,38,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(220,38,38,0.03) 1px, transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />
      <div style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, padding: '32px 28px', width: '100%', maxWidth: 380, position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, background: '#DC2626', borderRadius: 12, ...F, fontWeight: 900, fontSize: 20, color: '#fff', marginBottom: 12 }}>4W</div>
          <div style={{ ...F, fontWeight: 900, fontSize: 22, color: '#F5F5F5', letterSpacing: 2 }}>ADMIN ACCESS</div>
        </div>
        <input type="password" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === 'Enter' && login()} placeholder="Enter admin password"
          style={{ width: '100%', background: '#050505', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '13px 16px', color: '#F5F5F5', ...FB, fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 14 }} />
        <button onClick={login} style={{ width: '100%', background: '#DC2626', color: '#fff', border: 'none', borderRadius: 10, padding: '13px', ...F, fontWeight: 900, fontSize: 17, letterSpacing: 2, cursor: 'pointer' }}>
          ACCESS DASHBOARD →
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#050505', color: '#F5F5F5' }}>
      {/* Top bar */}
      <div style={{ background: '#071426', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 20px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <a href="/admin" style={{ textDecoration: 'none' }}>
            <div style={{ width: 28, height: 28, background: '#DC2626', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', ...F, fontWeight: 900, fontSize: 12, color: '#fff' }}>4W</div>
          </a>
          <div style={{ ...F, fontWeight: 900, fontSize: 18, color: '#F5F5F5', letterSpacing: 1 }}>ORDERS & PAYMENTS</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a href="/admin" style={{ ...FB, fontSize: 12, color: '#B8C1CC', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '6px 12px' }}>← Dashboard</a>
          <a href="/" style={{ ...FB, fontSize: 12, color: '#B8C1CC', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '6px 12px' }}>Site</a>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 20px' }}>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10, marginBottom: 24 }}>
          {[
            { label: 'Total Orders', value: orders.length, color: '#F5F5F5' },
            { label: 'Proof Uploaded', value: orders.filter(o => o.payment_status === 'proof_uploaded').length, color: '#3B82F6' },
            { label: 'Awaiting Payment', value: orders.filter(o => o.payment_status === 'awaiting_payment').length, color: '#FACC15' },
            { label: 'Confirmed', value: orders.filter(o => o.payment_status === 'payment_confirmed').length, color: '#22C55E' },
            { label: 'Total Members', value: members.length, color: '#A855F7' },
          ].map(s => (
            <div key={s.label} style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ ...F, fontWeight: 900, fontSize: 30, color: s.color }}>{s.value}</div>
              <div style={{ ...F, fontSize: 11, letterSpacing: 1, color: '#B8C1CC' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {(['orders', 'members'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                ...F, fontWeight: 700, fontSize: 14, letterSpacing: 1,
                padding: '9px 20px', borderRadius: 8, cursor: 'pointer',
                background: tab === t ? '#DC2626' : '#071426',
                color: tab === t ? '#fff' : '#B8C1CC',
                border: tab === t ? 'none' : '1px solid rgba(255,255,255,0.08)',
              }}
            >
              {t === 'orders' ? `ORDERS (${orders.length})` : `MEMBERS (${members.length})`}
            </button>
          ))}
        </div>

        {/* ORDERS TAB */}
        {tab === 'orders' && (
          <>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 20, paddingBottom: 4 }}>
              {['all', 'proof_uploaded', 'awaiting_payment', 'payment_confirmed', 'rejected'].map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  style={{ ...F, fontWeight: 700, fontSize: 11, letterSpacing: 1, padding: '7px 14px', borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, background: filter === f ? '#DC2626' : '#071426', color: filter === f ? '#fff' : '#B8C1CC', border: filter === f ? 'none' : '1px solid rgba(255,255,255,0.08)' }}>
                  {f === 'all' ? 'ALL' : (STATUS_LABELS[f] || f).toUpperCase()}
                  {f === 'proof_uploaded' ? ` (${orders.filter(o => o.payment_status === 'proof_uploaded').length})` : ''}
                </button>
              ))}
            </div>

            {loading
              ? <div style={{ textAlign: 'center', padding: 60, ...FB, color: '#B8C1CC' }}>Loading...</div>
              : filtered.length === 0
                ? <div style={{ textAlign: 'center', padding: 60, ...FB, color: '#B8C1CC' }}>No orders found.</div>
                : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {filtered.map(order => {
                      const ps = order.payment_status || order.status;
                      const sc = STATUS_COLORS[ps] || '#6B7280';
                      const proof = proofs[order.id];
                      return (
                        <div key={order.id} style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden' }}>
                          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                            <div>
                              <div style={{ ...F, fontWeight: 900, fontSize: 18, color: '#F5F5F5', marginBottom: 2 }}>{order.product_name}</div>
                              <div style={{ ...FB, fontSize: 13, color: '#B8C1CC' }}>{order.member_name} · {order.member_email}</div>
                              <div style={{ ...FB, fontSize: 11, color: '#6B7280', marginTop: 2 }}>{new Date(order.created_at).toLocaleString()}</div>
                              {order.payment_reference && <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#FACC15', marginTop: 4 }}>Ref: {order.payment_reference}</div>}
                            </div>
                            <span style={{ ...F, fontSize: 11, letterSpacing: 2, padding: '4px 12px', borderRadius: 20, background: sc + '22', color: sc, flexShrink: 0 }}>
                              {STATUS_LABELS[ps] || ps}
                            </span>
                          </div>

                          {proof && (
                            <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(59,130,246,0.05)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ ...F, fontWeight: 700, fontSize: 13, color: '#3B82F6' }}>📸 Payment Proof Uploaded</span>
                                <button onClick={() => setActiveProof(activeProof === order.id ? null : order.id)}
                                  style={{ ...FB, fontSize: 12, color: '#B8C1CC', background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '5px 10px', cursor: 'pointer' }}>
                                  {activeProof === order.id ? 'Hide' : 'View Proof'}
                                </button>
                              </div>
                              {activeProof === order.id && proof.proof_url && (
                                <img src={proof.proof_url} alt="proof" style={{ maxHeight: 240, borderRadius: 8, marginTop: 10, border: '1px solid rgba(255,255,255,0.1)', display: 'block', margin: '10px auto 0' }} />
                              )}
                            </div>
                          )}

                          <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {ps === 'proof_uploaded' && (
                              <div style={{ display: 'flex', gap: 8 }}>
                                <button onClick={() => confirmPayment(order)} disabled={saving === order.id}
                                  style={{ background: '#16A34A', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 16px', ...F, fontWeight: 700, fontSize: 13, letterSpacing: 1, cursor: 'pointer', opacity: saving === order.id ? 0.5 : 1 }}>
                                  ✓ CONFIRM PAYMENT
                                </button>
                                <button onClick={() => rejectProof(order.id)} disabled={saving === order.id}
                                  style={{ background: 'transparent', color: '#DC2626', border: '1px solid rgba(220,38,38,0.4)', borderRadius: 8, padding: '9px 16px', ...F, fontWeight: 700, fontSize: 13, letterSpacing: 1, cursor: 'pointer' }}>
                                  ✕ REJECT
                                </button>
                              </div>
                            )}
                            {ps === 'payment_confirmed' && (
                              <button onClick={() => unlockMembership(order.member_email)}
                                style={{ alignSelf: 'flex-start', background: 'rgba(250,204,21,0.12)', color: '#FACC15', border: '1px solid rgba(250,204,21,0.3)', borderRadius: 8, padding: '9px 16px', ...F, fontWeight: 700, fontSize: 13, letterSpacing: 1, cursor: 'pointer' }}>
                                🏅 UNLOCK OFFICIAL MEMBERSHIP
                              </button>
                            )}
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              <select value={order.status || ''} onChange={e => updateOrder(order.id, { status: e.target.value })}
                                style={{ background: '#050505', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', color: '#F5F5F5', ...FB, fontSize: 13, outline: 'none', cursor: 'pointer' }}>
                                {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s] || s}</option>)}
                              </select>
                              <input value={notes[order.id] || ''} onChange={e => setNotes(p => ({ ...p, [order.id]: e.target.value }))} placeholder="Admin notes..."
                                style={{ flex: 1, minWidth: 140, background: '#050505', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', color: '#F5F5F5', ...FB, fontSize: 13, outline: 'none' }} />
                              <button onClick={() => updateOrder(order.id, { notes: notes[order.id] })} disabled={saving === order.id}
                                style={{ background: '#DC2626', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', ...F, fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: saving === order.id ? 0.5 : 1 }}>
                                {saving === order.id ? '...' : 'SAVE'}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
            }
          </>
        )}

        {/* MEMBERS TAB */}
        {tab === 'members' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {members.map(m => (
              <div key={m.id} style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ ...F, fontWeight: 700, fontSize: 17, color: '#F5F5F5' }}>{m.name}</div>
                  <div style={{ ...FB, fontSize: 12, color: '#B8C1CC' }}>{m.email} · {m.nationality} · {m.city}</div>
                  <div style={{ ...FB, fontSize: 11, color: '#6B7280' }}>Joined: {new Date(m.created_at).toLocaleDateString()}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ ...F, fontSize: 10, letterSpacing: 2, padding: '3px 10px', borderRadius: 4, background: m.member_status === 'official' ? 'rgba(250,204,21,0.15)' : 'rgba(255,255,255,0.06)', color: m.member_status === 'official' ? '#FACC15' : '#B8C1CC' }}>
                    {(m.member_status || 'registered').toUpperCase()}
                  </span>
                  {m.member_status !== 'official' && (
                    <button onClick={() => unlockMembership(m.email)}
                      style={{ ...F, fontWeight: 700, fontSize: 11, letterSpacing: 1, padding: '6px 12px', borderRadius: 6, background: 'transparent', border: '1px solid rgba(250,204,21,0.3)', color: '#FACC15', cursor: 'pointer' }}>
                      MAKE OFFICIAL
                    </button>
                  )}
                </div>
              </div>
            ))}
            {members.length === 0 && <div style={{ textAlign: 'center', padding: 60, ...FB, color: '#B8C1CC' }}>No members yet.</div>}
          </div>
        )}
      </div>
    </div>
  );
}
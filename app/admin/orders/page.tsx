// @ts-nocheck
'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { awardForPayment, clawbackForPayment } from '@/lib/loyalty';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function checkAuth() {
  if (typeof window === 'undefined') return false;
  const session = localStorage.getItem('adminSession');
  if (!session) return false;
  try { const { expires } = JSON.parse(session); return Date.now() < expires; }
  catch { return false; }
}
function saveAuth() {
  localStorage.setItem('adminSession', JSON.stringify({ expires: Date.now() + 8 * 60 * 60 * 1000 }));
}

const STATUSES = ['awaiting_payment', 'proof_uploaded', 'payment_confirmed', 'reserved', 'awaiting_stock', 'in_transit', 'ready_for_pickup', 'completed', 'cancelled'];
const STATUS_LABELS: Record<string, string> = {
  awaiting_payment: 'Awaiting Payment',
  proof_uploaded: 'Proof Uploaded',
  payment_confirmed: 'Payment Confirmed',
  reserved: 'Reserved',
  awaiting_stock: 'Awaiting Stock',
  in_transit: 'In Transit',
  ready_for_pickup: 'Ready for Pickup',
  completed: 'Completed',
  cancelled: 'Cancelled',
};
const STATUS_COLORS: Record<string, string> = {
  awaiting_payment: '#FACC15',
  proof_uploaded: '#F97316',
  payment_confirmed: '#22C55E',
  reserved: '#3B82F6',
  awaiting_stock: '#A855F7',
  in_transit: '#06B6D4',
  ready_for_pickup: '#22C55E',
  completed: '#6B7280',
  cancelled: '#DC2626',
};

function ProductThumb({ url }: { url?: string }) {
  const [failed, setFailed] = useState(false);
  const first = url?.split(',')[0]?.trim();
  if (!first || failed) return (
    <div style={{ width: 56, height: 56, borderRadius: 8, background: '#050505', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 9, color: 'rgba(255,255,255,0.15)', letterSpacing: 1 }}>NO IMG</span>
    </div>
  );
  return <img src={first} alt="" onError={() => setFailed(true)} style={{ width: 56, height: 56, objectFit: 'contain', borderRadius: 8, background: '#050505', border: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }} />;
}

export default function AdminOrders() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState('');
  const [pwError, setPwError] = useState('');
  const [orders, setOrders] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [tab, setTab] = useState<'orders' | 'members'>('orders');
  const [filter, setFilter] = useState('all');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [stats, setStats] = useState({ total: 0, proofs: 0, awaiting: 0, confirmed: 0, memberCount: 0 });

  useEffect(() => { if (checkAuth()) { setAuthed(true); loadData(); } }, []);

  async function loadData() {
    const [{ data: o }, { data: m }, { data: p }] = await Promise.all([
      supabase.from('orders').select('*').order('created_at', { ascending: false }),
      supabase.from('members').select('id, first_name, last_name, email, member_status, created_at').order('created_at', { ascending: false }),
      supabase.from('products').select('id, name, image_url'),
    ]);
    const ordersData = o || [];
    setOrders(ordersData);
    setMembers(m || []);
    setProducts(p || []);
    setStats({
      total: ordersData.length,
      proofs: ordersData.filter((x: any) => x.payment_status === 'proof_uploaded').length,
      awaiting: ordersData.filter((x: any) => x.payment_status === 'awaiting_payment').length,
      confirmed: ordersData.filter((x: any) => x.payment_status === 'payment_confirmed').length,
      memberCount: (m || []).length,
    });
  }

  // Match order to product image by name similarity
  function getProductImage(orderProductName: string): string | undefined {
    if (!orderProductName) return undefined;
    const clean = orderProductName.toLowerCase().replace(/\(.*?\)/g, '').trim();
    const match = products.find(p => {
      const pName = (p.name || '').toLowerCase();
      return clean.includes(pName) || pName.includes(clean) || clean.split(' ').some((w: string) => w.length > 3 && pName.includes(w));
    });
    return match?.image_url;
  }

  function handleLogin() {
    if (pw === 'mini4wd2026') { saveAuth(); setAuthed(true); loadData(); }
    else setPwError('Wrong password');
  }

  // Orders created before this engine existed have no spend_amount_dkk — recover the
  // real amount from the notes text so re-saving an old order still backfills correctly.
  function extractSpendFromNotes(notes: string): number {
    if (!notes) return 0;
    const full = notes.match(/Full Payment:\s*([\d.]+)\s*DKK/i);
    if (full) return parseFloat(full[1]);
    const deposit = notes.match(/Deposit:\s*([\d.]+)\s*DKK\s*\(Remaining:\s*([\d.]+)\s*DKK/i);
    if (deposit) return parseFloat(deposit[1]) + parseFloat(deposit[2]);
    return 0;
  }

  // Any status from here on means money actually changed hands — award (once) on first entry.
  const PAID_STATUSES = ['payment_confirmed', 'reserved', 'awaiting_stock', 'in_transit', 'ready_for_pickup', 'completed'];

  async function updateStatus(id: string, status: string) {
    setSaving(id);
    const order = orders.find((o: any) => o.id === id);
    const updates: any = { payment_status: status };

    try {
      if (PAID_STATUSES.includes(status) && order && !order.rewards_applied) {
        const spend = Number(order.spend_amount_dkk) || extractSpendFromNotes(order.notes);
        if (spend > 0 && (order.member_email || order.email)) {
          const result = await awardForPayment(order.member_email || order.email, spend);
          if (result) {
            updates.points_awarded = result.points;
            updates.membership_days_awarded = result.days;
            updates.rewards_applied = true;
            updates.spend_amount_dkk = spend; // backfill so it's correct going forward too
          }
        }
      }
      // Cancelling a previously-confirmed order claws back exactly what it gave.
      if (status === 'cancelled' && order?.rewards_applied) {
        await clawbackForPayment(order.member_email || order.email, Number(order.points_awarded) || 0, Number(order.membership_days_awarded) || 0);
        updates.rewards_applied = false;
      }
    } catch (e: any) {
      setMsg('⚠️ Status saved, but rewards sync failed: ' + e.message);
    }

    const { error } = await supabase.from('orders').update(updates).eq('id', id);
    if (error) { setMsg('❌ Error: ' + error.message); }
    else if (!msg) { setMsg('✅ Updated'); }
    loadData();
    setSaving(null);
    setTimeout(() => setMsg(''), 3000);
  }

  async function deleteOrder(id: string) {
    if (!confirm('Delete this order permanently?')) return;
    await supabase.from('orders').delete().eq('id', id);
    loadData();
  }

  const filtered = filter === 'all' ? orders : orders.filter((o: any) => o.payment_status === filter);

  const s: Record<string, any> = {
    page: { background: '#050505', minHeight: '100vh', color: '#F5F5F5', fontFamily: "'DM Sans', sans-serif" },
    header: { background: '#071426', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    title: { fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: '20px', letterSpacing: '2px' },
    body: { maxWidth: '1000px', margin: '0 auto', padding: '24px 20px' },
    statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '10px', marginBottom: '24px' },
    stat: (color: string) => ({ background: '#071426', border: `1px solid ${color}22`, borderRadius: '10px', padding: '14px', textAlign: 'center' as const }),
    statVal: (color: string) => ({ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: '28px', color }),
    statLabel: { fontSize: '11px', color: '#6B7280', letterSpacing: '1px' },
    tabs: { display: 'flex', gap: '8px', marginBottom: '20px' },
    tab: (active: boolean) => ({ padding: '8px 20px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '14px', letterSpacing: '1px', background: active ? '#DC2626' : 'rgba(255,255,255,0.06)', color: active ? '#fff' : '#B8C1CC' }),
    filters: { display: 'flex', gap: '6px', flexWrap: 'wrap' as const, marginBottom: '20px' },
    filterBtn: (active: boolean) => ({ padding: '5px 14px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '11px', letterSpacing: '1px', fontFamily: "'Barlow Condensed', sans-serif", background: active ? '#DC2626' : 'rgba(255,255,255,0.06)', color: active ? '#fff' : '#B8C1CC' }),
    card: { background: '#071426', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '18px', marginBottom: '12px' },
    badge: (status: string) => ({ background: `${STATUS_COLORS[status] || '#6B7280'}22`, color: STATUS_COLORS[status] || '#6B7280', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, letterSpacing: '1px', fontFamily: "'Barlow Condensed', sans-serif" }),
    meta: { fontSize: '13px', color: '#6B7280', marginBottom: '4px' },
    proof: { marginTop: '10px', padding: '10px', background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: '6px' },
    proofLink: { color: '#F97316', fontSize: '13px', textDecoration: 'none', display: 'block', marginBottom: '6px' },
    actions: { display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' as const, alignItems: 'center' },
    select: { background: '#050505', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '6px 10px', color: '#F5F5F5', fontSize: '12px' },
    noteInput: { flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '6px 10px', color: '#F5F5F5', fontSize: '12px', minWidth: '150px' },
    saveBtn: { padding: '6px 16px', background: '#22C55E', border: 'none', borderRadius: '6px', color: '#000', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '1px' },
    delBtn: { padding: '6px 12px', background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: '6px', color: '#DC2626', fontSize: '12px', cursor: 'pointer' },
    memberRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', flexWrap: 'wrap' as const, gap: '8px' },
    memberName: { fontWeight: 600, fontSize: '15px' },
    memberEmail: { fontSize: '12px', color: '#6B7280' },
    memberBadge: (status: string) => ({ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', letterSpacing: '1px', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, background: status === 'official' ? 'rgba(34,197,94,0.15)' : status === 'suspended' ? 'rgba(220,38,38,0.15)' : 'rgba(59,130,246,0.15)', color: status === 'official' ? '#22C55E' : status === 'suspended' ? '#DC2626' : '#3B82F6' }),
    input: { width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '10px 14px', color: '#F5F5F5', fontSize: '14px' },
    btn: { padding: '10px 20px', background: '#DC2626', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', marginTop: '12px' },
    msg: { fontSize: '13px', color: '#22C55E', marginLeft: '12px' },
  };

  if (!authed) return (
    <div style={{ ...s.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '32px 28px', width: '100%', maxWidth: '360px' }}>
        <div style={{ ...s.title, marginBottom: '20px' }}>ADMIN LOGIN</div>
        <input style={s.input} type="password" placeholder="Password" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} />
        {pwError && <div style={{ color: '#DC2626', fontSize: '13px', marginTop: '8px' }}>{pwError}</div>}
        <button style={s.btn} onClick={handleLogin}>Enter</button>
      </div>
    </div>
  );

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <a href="/admin" style={{ color: '#6B7280', fontSize: '13px', textDecoration: 'none' }}>← Dashboard</a>
          <div style={s.title}>ORDERS & PAYMENTS</div>
        </div>
        <a href="/" style={{ color: '#6B7280', fontSize: '12px', textDecoration: 'none' }}>Site</a>
      </div>

      <div style={s.body}>
        <div style={s.statsRow}>
          <div style={s.stat('#3B82F6')}><div style={s.statVal('#3B82F6')}>{stats.total}</div><div style={s.statLabel}>Total Orders</div></div>
          <div style={s.stat('#F97316')}><div style={s.statVal('#F97316')}>{stats.proofs}</div><div style={s.statLabel}>Proof Uploaded</div></div>
          <div style={s.stat('#FACC15')}><div style={s.statVal('#FACC15')}>{stats.awaiting}</div><div style={s.statLabel}>Awaiting Payment</div></div>
          <div style={s.stat('#22C55E')}><div style={s.statVal('#22C55E')}>{stats.confirmed}</div><div style={s.statLabel}>Confirmed</div></div>
          <div style={s.stat('#A855F7')}><div style={s.statVal('#A855F7')}>{stats.memberCount}</div><div style={s.statLabel}>Total Members</div></div>
        </div>

        {msg && <div style={{ ...s.msg, marginBottom: '16px', display: 'block' }}>{msg}</div>}

        <div style={s.tabs}>
          <button style={s.tab(tab === 'orders')} onClick={() => setTab('orders')}>Orders ({orders.length})</button>
          <button style={s.tab(tab === 'members')} onClick={() => setTab('members')}>Members ({members.length})</button>
        </div>

        {tab === 'orders' && (
          <>
            <div style={s.filters}>
              {['all', ...STATUSES].map(f => (
                <button key={f} style={s.filterBtn(filter === f)} onClick={() => setFilter(f)}>
                  {f === 'all' ? 'ALL' : STATUS_LABELS[f]?.toUpperCase()}
                </button>
              ))}
            </div>

            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#4B5563' }}>No orders found.</div>
            ) : filtered.map((order: any) => {
              const imgUrl = getProductImage(order.product_name);
              return (
                <div key={order.id} style={s.card}>
                  <div style={s.cardTop || { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', gap: 14, flex: 1, alignItems: 'flex-start' }}>
                      <ProductThumb url={imgUrl} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '18px' }}>{order.product_name}</div>
                        <div style={s.meta}>{order.member_name} · {order.email || order.member_email}</div>
                        <div style={s.meta}>Ref: <span style={{ color: '#FACC15', fontFamily: 'monospace' }}>{order.payment_reference || order.reference_code || order.id?.slice(0, 8)}</span> · {new Date(order.created_at).toLocaleDateString('en-GB')}</div>
                        {order.notes && <div style={s.meta}>{order.notes}</div>}
                      </div>
                    </div>
                    <span style={s.badge(order.payment_status)}>{STATUS_LABELS[order.payment_status] || order.payment_status}</span>
                  </div>

                  {order.proof_url && (
                    <div style={s.proof}>
                      <a href={order.proof_url} target="_blank" rel="noreferrer" style={s.proofLink}>📸 View Payment Proof</a>
                    </div>
                  )}

                  {order.admin_notes && (
                    <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '8px' }}>Note: {order.admin_notes}</div>
                  )}

                  <div style={s.actions}>
                    <select style={s.select}
                      value={notes[`${order.id}_status`] || order.payment_status}
                      onChange={e => setNotes(n => ({ ...n, [`${order.id}_status`]: e.target.value }))}>
                      {STATUSES.map(st => <option key={st} value={st}>{STATUS_LABELS[st]}</option>)}
                    </select>
                    <input style={s.noteInput} placeholder="Admin notes..." value={notes[order.id] || ''} onChange={e => setNotes(n => ({ ...n, [order.id]: e.target.value }))} />
                    <button style={s.saveBtn} disabled={saving === order.id}
                      onClick={() => updateStatus(order.id, notes[`${order.id}_status`] || order.payment_status)}>
                      {saving === order.id ? '...' : 'SAVE'}
                    </button>
                    <button style={s.delBtn} onClick={() => deleteOrder(order.id)}>Delete</button>
                  </div>
                </div>
              );
            })}
          </>
        )}

        {tab === 'members' && (
          <div style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '20px' }}>
            {members.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#4B5563' }}>No members yet.</div>
            ) : members.map((m: any) => (
              <div key={m.id} style={s.memberRow}>
                <div>
                  <div style={s.memberName}>{m.first_name} {m.last_name}</div>
                  <div style={s.memberEmail}>{m.email} · Joined {new Date(m.created_at).toLocaleDateString('en-GB')}</div>
                </div>
                <span style={s.memberBadge(m.member_status || 'registered')}>{m.member_status || 'registered'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
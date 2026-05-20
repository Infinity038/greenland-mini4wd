'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/lib/member';

const ADMIN_PASSWORD = 'mini4wd2026';

const ALL_STATUSES = [
  'awaiting_payment',
  'proof_uploaded',
  'payment_confirmed',
  'rejected',
  'reserved',
  'awaiting_stock',
  'in_transit',
  'ready_for_pickup',
  'completed',
  'cancelled',
];

export default function AdminOrdersPage() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState('');
  const [orders, setOrders] = useState<any[]>([]);
  const [proofs, setProofs] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [activeProof, setActiveProof] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<string>('all');
  const [saving, setSaving] = useState<string | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [tab, setTab] = useState<'orders' | 'members'>('orders');

  const login = () => {
    if (pw === ADMIN_PASSWORD) setAuthed(true);
  };

  const fetchData = async () => {
    setLoading(true);
    const [{ data: ordersData }, { data: proofData }, { data: membersData }] = await Promise.all([
      supabase.from('orders').select('*').order('created_at', { ascending: false }),
      supabase.from('payment_proofs').select('*'),
      supabase.from('members').select('*').order('created_at', { ascending: false }),
    ]);

    setOrders(ordersData || []);
    setMembers(membersData || []);

    // Index proofs by order_id
    const proofMap: Record<string, any> = {};
    (proofData || []).forEach((p: any) => { proofMap[p.order_id] = p; });
    setProofs(proofMap);

    // Init notes
    const noteMap: Record<string, string> = {};
    (ordersData || []).forEach(o => { noteMap[o.id] = o.notes || ''; });
    setNotes(noteMap);
    setLoading(false);
  };

  useEffect(() => {
    if (authed) fetchData();
  }, [authed]);

  const updateOrder = async (orderId: string, updates: any) => {
    setSaving(orderId);
    await supabase.from('orders').update(updates).eq('id', orderId);
    await fetchData();
    setSaving(null);
  };

  const confirmPayment = async (order: any) => {
    setSaving(order.id);
    await supabase.from('orders').update({
      payment_status: 'payment_confirmed',
      status: 'reserved',
    }).eq('id', order.id);

    if (proofs[order.id]) {
      await supabase.from('payment_proofs').update({ status: 'confirmed', reviewed_at: new Date().toISOString() }).eq('order_id', order.id);
    }

    // Loyalty: count confirmed paid tickets (orders acting as tickets)
    // Give bonus ticket every 10
    const { data: confirmedOrders } = await supabase
      .from('orders')
      .select('id')
      .eq('member_email', order.member_email)
      .eq('payment_status', 'payment_confirmed');

    const confirmedCount = (confirmedOrders || []).length + 1;
    if (confirmedCount % 10 === 0) {
      await supabase.from('tickets').insert({
        member_email: order.member_email,
        member_name: order.member_name,
        ticket_type: 'bonus',
        status: 'available',
      });
    }

    await fetchData();
    setSaving(null);
  };

  const rejectProof = async (orderId: string) => {
    setSaving(orderId);
    await supabase.from('orders').update({ payment_status: 'rejected' }).eq('id', orderId);
    if (proofs[orderId]) {
      await supabase.from('payment_proofs').update({ status: 'rejected' }).eq('order_id', orderId);
    }
    await fetchData();
    setSaving(null);
  };

  const unlockMembership = async (memberEmail: string) => {
    await supabase.from('members').update({ member_status: 'official' }).eq('email', memberEmail);
    await fetchData();
  };

  const filteredOrders = filter === 'all' ? orders : orders.filter(o => (o.payment_status || o.status) === filter);

  if (!authed) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
        <div className="bg-[#071426] border border-white/10 rounded-2xl p-8 w-full max-w-sm">
          <h1 className="font-barlow font-black text-white text-2xl uppercase mb-6 text-center">Admin Access</h1>
          <input
            type="password"
            value={pw}
            onChange={e => setPw(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && login()}
            placeholder="Enter admin password"
            className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-[#B8C1CC] mb-4 focus:outline-none focus:border-[#DC2626]"
          />
          <button
            onClick={login}
            className="w-full bg-[#DC2626] text-white font-barlaw font-black uppercase py-3 rounded-xl hover:bg-red-700 transition-colors"
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505]">
      <div className="bg-[#071426] border-b border-white/10 px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-barlow font-black text-white text-2xl uppercase">Admin Panel</h1>
          <p className="text-[#B8C1CC] text-xs">Greenland Mini 4WD Club</p>
        </div>
        <div className="flex gap-2 text-sm">
          <a href="/admin" className="text-[#B8C1CC] hover:text-white px-3 py-1 rounded-lg border border-white/10">Dashboard</a>
          <a href="/" className="text-[#B8C1CC] hover:text-white px-3 py-1 rounded-lg border border-white/10">← Site</a>
        </div>
      </div>

      {/* Quick stats */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Orders', value: orders.length, color: '#F5F5F5' },
            { label: 'Proof Uploaded', value: orders.filter(o => o.payment_status === 'proof_uploaded').length, color: '#3B82F6' },
            { label: 'Awaiting Payment', value: orders.filter(o => o.payment_status === 'awaiting_payment').length, color: '#FACC15' },
            { label: 'Total Members', value: members.length, color: '#22C55E' },
          ].map(s => (
            <div key={s.label} className="bg-[#071426] rounded-xl p-4 border border-white/10">
              <div className="text-2xl font-barlaw font-black" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs text-[#B8C1CC]">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tab switch */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab('orders')}
            className={`px-5 py-2 rounded-lg font-barlaw font-bold uppercase text-sm transition-colors ${tab === 'orders' ? 'bg-[#DC2626] text-white' : 'bg-[#071426] text-[#B8C1CC] border border-white/10 hover:text-white'}`}
          >
            Orders ({orders.length})
          </button>
          <button
            onClick={() => setTab('members')}
            className={`px-5 py-2 rounded-lg font-barlaw font-bold uppercase text-sm transition-colors ${tab === 'members' ? 'bg-[#DC2626] text-white' : 'bg-[#071426] text-[#B8C1CC] border border-white/10 hover:text-white'}`}
          >
            Members ({members.length})
          </button>
        </div>

        {/* ── ORDERS TAB ── */}
        {tab === 'orders' && (
          <>
            {/* Filter */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
              {['all', 'proof_uploaded', 'awaiting_payment', 'payment_confirmed', 'rejected'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors ${
                    filter === f ? 'bg-[#DC2626] text-white' : 'bg-[#071426] text-[#B8C1CC] border border-white/10 hover:text-white'
                  }`}
                >
                  {f === 'all' ? 'All' : ORDER_STATUS_LABELS[f] || f}
                  {f === 'proof_uploaded' && ` (${orders.filter(o => o.payment_status === 'proof_uploaded').length})`}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="text-[#B8C1CC] text-center py-12">Loading...</div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-[#B8C1CC] text-center py-12">No orders found.</div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map(order => {
                  const payStatus = order.payment_status || order.status;
                  const statusColor = ORDER_STATUS_COLORS[payStatus] || '#6B7280';
                  const proof = proofs[order.id];

                  return (
                    <div key={order.id} className="bg-[#071426] border border-white/10 rounded-2xl overflow-hidden">
                      {/* Header */}
                      <div className="flex flex-wrap items-start justify-between gap-2 p-4 border-b border-white/10">
                        <div>
                          <div className="font-barlaw font-black text-white text-lg">{order.product_name}</div>
                          <div className="text-sm text-[#B8C1CC]">{order.member_name} · {order.member_email}</div>
                          <div className="text-xs text-[#B8C1CC] mt-1">
                            {order.chassis && <span className="mr-3">Chassis: {order.chassis}</span>}
                            <span>{new Date(order.created_at).toLocaleString()}</span>
                          </div>
                          {order.payment_reference && (
                            <div className="text-xs font-mono text-[#FACC15] mt-1">Ref: {order.payment_reference}</div>
                          )}
                        </div>
                        <span
                          className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex-shrink-0"
                          style={{ backgroundColor: statusColor + '22', color: statusColor }}
                        >
                          {ORDER_STATUS_LABELS[payStatus] || payStatus}
                        </span>
                      </div>

                      {/* Proof section */}
                      {proof && (
                        <div className="p-4 border-b border-white/10 bg-blue-500/5">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="text-blue-400 text-sm font-bold">📸 Payment Proof Uploaded</span>
                            <button
                              onClick={() => setActiveProof(activeProof === order.id ? null : order.id)}
                              className="text-xs text-[#B8C1CC] hover:text-white border border-white/10 px-3 py-1 rounded-lg"
                            >
                              {activeProof === order.id ? 'Hide' : 'View Proof'}
                            </button>
                          </div>
                          {activeProof === order.id && proof.proof_url && (
                            <div className="mt-3">
                              <img
                                src={proof.proof_url}
                                alt="Payment proof"
                                className="max-h-64 rounded-xl border border-white/10 mx-auto"
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="p-4 space-y-3">
                        {/* Quick action buttons */}
                        <div className="flex flex-wrap gap-2">
                          {payStatus === 'proof_uploaded' && (
                            <>
                              <button
                                onClick={() => confirmPayment(order)}
                                disabled={saving === order.id}
                                className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-bold uppercase px-4 py-2 rounded-lg transition-colors"
                              >
                                ✓ Confirm Payment
                              </button>
                              <button
                                onClick={() => rejectProof(order.id)}
                                disabled={saving === order.id}
                                className="bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white text-xs font-bold uppercase px-4 py-2 rounded-lg transition-colors"
                              >
                                ✕ Reject Proof
                              </button>
                            </>
                          )}
                          {payStatus === 'payment_confirmed' && (
                            <button
                              onClick={() => unlockMembership(order.member_email)}
                              className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border border-yellow-500/40 text-xs font-bold uppercase px-4 py-2 rounded-lg transition-colors"
                            >
                              🏅 Unlock Official Membership
                            </button>
                          )}
                        </div>

                        {/* Status select */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <select
                            value={order.status || ''}
                            onChange={e => updateOrder(order.id, { status: e.target.value })}
                            className="bg-[#050505] border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-[#DC2626]"
                          >
                            {ALL_STATUSES.map(s => (
                              <option key={s} value={s}>{ORDER_STATUS_LABELS[s] || s}</option>
                            ))}
                          </select>

                          {/* Notes */}
                          <input
                            value={notes[order.id] || ''}
                            onChange={e => setNotes(prev => ({ ...prev, [order.id]: e.target.value }))}
                            placeholder="Admin notes..."
                            className="flex-1 min-w-[150px] bg-[#050505] border border-white/10 rounded-lg px-3 py-2 text-white text-xs placeholder-[#B8C1CC] focus:outline-none focus:border-[#DC2626]"
                          />
                          <button
                            onClick={() => updateOrder(order.id, { notes: notes[order.id] })}
                            disabled={saving === order.id}
                            className="bg-[#DC2626] hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold uppercase px-3 py-2 rounded-lg transition-colors"
                          >
                            {saving === order.id ? '...' : 'Save'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── MEMBERS TAB ── */}
        {tab === 'members' && (
          <div className="space-y-3">
            {members.map(m => (
              <div key={m.id} className="bg-[#071426] border border-white/10 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-barlaw font-black text-white">{m.name}</div>
                  <div className="text-xs text-[#B8C1CC]">{m.email} · {m.nationality} · {m.city}</div>
                  <div className="text-xs text-[#B8C1CC]">Joined: {new Date(m.created_at).toLocaleDateString()}</div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                    m.member_status === 'official' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-white/10 text-[#B8C1CC]'
                  }`}>
                    {m.member_status || 'registered'}
                  </span>
                  {m.member_status !== 'official' && (
                    <button
                      onClick={() => unlockMembership(m.email)}
                      className="text-xs border border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/20 px-3 py-1 rounded-lg transition-colors"
                    >
                      Make Official
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
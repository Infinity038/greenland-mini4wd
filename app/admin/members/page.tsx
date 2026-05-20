'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const F = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
const FB = { fontFamily: "'DM Sans', sans-serif" } as const;

const MEMBER_STATUSES = ['registered', 'official', 'suspended', 'banned'];
const STATUS_COLORS: Record<string, string> = { registered: '#3B82F6', official: '#22C55E', suspended: '#FACC15', banned: '#DC2626' };

interface Member {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  nationality?: string;
  city?: string;
  experience?: string;
  member_status?: string;
  rank?: string;
  total_points?: number;
  referral_code?: string;
  created_at?: string;
}

export default function AdminMembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Member | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [bonusInput, setBonusInput] = useState('0');
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'info' | 'orders' | 'tickets' | 'referrals'>('info');

  useEffect(() => { fetchMembers(); }, []);

  const fetchMembers = async () => {
    const { data } = await supabase.from('members').select('*').order('created_at', { ascending: false });
    if (data) setMembers(data);
  };

  const openMember = async (m: Member) => {
    setSelected(m); setTab('info');
    const [{ data: o }, { data: t }, { data: r }] = await Promise.all([
      supabase.from('orders').select('*').eq('member_email', m.email).order('created_at', { ascending: false }),
      supabase.from('tickets').select('*').eq('member_email', m.email).order('created_at', { ascending: false }),
      supabase.from('referrals').select('*').eq('referrer_email', m.email),
    ]);
    setOrders(o || []);
    setTickets(t || []);
    setReferrals(r || []);
  };

  const updateStatus = async (email: string, status: string) => {
    setSaving(true);
    await supabase.from('members').update({ member_status: status }).eq('email', email);
    await fetchMembers();
    if (selected?.email === email) setSelected(prev => prev ? { ...prev, member_status: status } : null);
    setSaving(false);
  };

  const deleteMember = async (email: string) => {
    if (!confirm(`Remove member ${email}? This cannot be undone.`)) return;
    await supabase.from('members').delete().eq('email', email);
    setSelected(null);
    await fetchMembers();
  };

  const addBonusTickets = async () => {
    if (!selected) return;
    const count = parseInt(bonusInput);
    if (isNaN(count) || count <= 0) return;
    setSaving(true);
    const rows = Array.from({ length: count }, () => ({
      member_email: selected.email,
      member_name: selected.name,
      ticket_type: 'bonus',
      status: 'available',
    }));
    await supabase.from('tickets').insert(rows);
    await supabase.from('ticket_transactions').insert({ member_email: selected.email, transaction_type: 'earned_bonus', tickets_count: count, notes: 'Manual admin grant' });
    setBonusInput('0');
    const { data } = await supabase.from('tickets').select('*').eq('member_email', selected.email);
    setTickets(data || []);
    setSaving(false);
  };

  const filtered = members.filter(m =>
    m.name?.toLowerCase().includes(search.toLowerCase()) ||
    m.email?.toLowerCase().includes(search.toLowerCase()) ||
    m.nationality?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ minHeight: '100vh', background: '#050505', color: '#F5F5F5' }}>
      <div style={{ background: '#071426', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ ...F, fontSize: 11, letterSpacing: 4, color: '#DC2626' }}>ADMIN</div>
          <div style={{ ...F, fontWeight: 900, fontSize: 24, color: '#F5F5F5' }}>MANAGE MEMBERS</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ ...FB, fontSize: 13, color: '#B8C1CC' }}>{members.length} total</span>
          <a href="/admin" style={{ ...FB, fontSize: 13, color: '#B8C1CC', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 16px' }}>← Dashboard</a>
        </div>
      </div>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 24px' }}>
        {/* Search */}
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, email, nationality..."
          style={{ width: '100%', background: '#071426', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '14px 18px', color: '#F5F5F5', ...FB, fontSize: 15, outline: 'none', boxSizing: 'border-box', marginBottom: 20 }}
        />

        {/* Quick stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
          {MEMBER_STATUSES.map(s => {
            const count = members.filter(m => (m.member_status || 'registered') === s).length;
            return (
              <div key={s} style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ ...F, fontWeight: 900, fontSize: 28, color: STATUS_COLORS[s] }}>{count}</div>
                <div style={{ ...F, fontSize: 11, letterSpacing: 2, color: '#B8C1CC' }}>{s.toUpperCase()}</div>
              </div>
            );
          })}
        </div>

        {/* Member list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(m => {
            const st = m.member_status || 'registered';
            const sc = STATUS_COLORS[st] || '#6B7280';
            return (
              <div key={m.email} style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', cursor: 'pointer' }}
                onClick={() => openMember(m)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: sc + '22', border: `2px solid ${sc}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', ...F, fontWeight: 900, fontSize: 18, color: sc, flexShrink: 0 }}>
                    {m.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <div style={{ ...F, fontWeight: 700, fontSize: 18, color: '#F5F5F5' }}>{m.name}</div>
                    <div style={{ ...FB, fontSize: 12, color: '#B8C1CC' }}>{m.email} · {m.nationality} · {m.city}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ ...F, fontSize: 11, letterSpacing: 2, padding: '3px 10px', borderRadius: 4, background: sc + '18', color: sc }}>{st.toUpperCase()}</span>
                  <select
                    value={st}
                    onClick={e => e.stopPropagation()}
                    onChange={e => { e.stopPropagation(); updateStatus(m.email, e.target.value); }}
                    style={{ background: '#050505', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '6px 10px', color: '#F5F5F5', ...F, fontSize: 12, cursor: 'pointer', outline: 'none' }}
                  >
                    {MEMBER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: 60, ...FB, color: '#B8C1CC' }}>No members found.</div>
          )}
        </div>
      </div>

      {/* Member detail modal */}
      {selected && (
        <div onClick={() => setSelected(null)} style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px', overflowY: 'auto' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, width: '100%', maxWidth: 600, marginBottom: 24 }}>
            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ ...F, fontWeight: 900, fontSize: 24, color: '#F5F5F5' }}>{selected.name}</div>
                <div style={{ ...FB, fontSize: 13, color: '#B8C1CC' }}>{selected.email}</div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: '#B8C1CC', fontSize: 22, cursor: 'pointer' }}>✕</button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid rgba(255,255,255,0.08)', overflowX: 'auto' }}>
              {(['info', 'orders', 'tickets', 'referrals'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)} style={{ ...F, fontWeight: 700, fontSize: 13, letterSpacing: 2, padding: '12px 20px', border: 'none', background: 'transparent', color: tab === t ? '#DC2626' : '#B8C1CC', borderBottom: tab === t ? '2px solid #DC2626' : '2px solid transparent', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  {t.toUpperCase()}
                </button>
              ))}
            </div>

            <div style={{ padding: 24 }}>
              {/* INFO TAB */}
              {tab === 'info' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {[
                      ['Phone', selected.phone || '—'],
                      ['Nationality', selected.nationality || '—'],
                      ['City', selected.city || '—'],
                      ['Experience', selected.experience || '—'],
                      ['Rank', selected.rank || 'Rookie'],
                      ['Points', String(selected.total_points || 0)],
                      ['Referral Code', selected.referral_code || '—'],
                      ['Joined', selected.created_at ? new Date(selected.created_at).toLocaleDateString() : '—'],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <div style={{ ...F, fontSize: 11, letterSpacing: 2, color: '#B8C1CC', marginBottom: 2 }}>{k}</div>
                        <div style={{ ...FB, fontSize: 15, color: '#F5F5F5', fontWeight: 600 }}>{v}</div>
                      </div>
                    ))}
                  </div>

                  {/* Status change */}
                  <div>
                    <div style={{ ...F, fontSize: 11, letterSpacing: 3, color: '#B8C1CC', marginBottom: 8 }}>MEMBER STATUS</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {MEMBER_STATUSES.map(s => (
                        <button key={s} disabled={saving} onClick={() => updateStatus(selected.email, s)}
                          style={{ ...F, fontWeight: 700, fontSize: 12, letterSpacing: 1, padding: '8px 16px', borderRadius: 8, border: `1px solid ${STATUS_COLORS[s]}55`, background: (selected.member_status || 'registered') === s ? STATUS_COLORS[s] + '22' : 'transparent', color: STATUS_COLORS[s], cursor: 'pointer' }}>
                          {s.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Danger zone */}
                  <div style={{ borderTop: '1px solid rgba(220,38,38,0.2)', paddingTop: 16, marginTop: 8 }}>
                    <button onClick={() => deleteMember(selected.email)} style={{ ...F, fontWeight: 700, fontSize: 13, letterSpacing: 1, padding: '10px 20px', borderRadius: 8, background: 'transparent', border: '1px solid rgba(220,38,38,0.4)', color: '#DC2626', cursor: 'pointer' }}>
                      🗑 REMOVE MEMBER
                    </button>
                  </div>
                </div>
              )}

              {/* ORDERS TAB */}
              {tab === 'orders' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {orders.length === 0 ? <div style={{ ...FB, color: '#B8C1CC', textAlign: 'center', padding: 40 }}>No orders yet.</div>
                  : orders.map((o: any) => (
                    <div key={o.id} style={{ background: '#050505', borderRadius: 10, padding: 14 }}>
                      <div style={{ ...F, fontWeight: 700, fontSize: 17, color: '#F5F5F5' }}>{o.product_name}</div>
                      <div style={{ ...FB, fontSize: 12, color: '#B8C1CC', marginTop: 4 }}>{new Date(o.created_at).toLocaleDateString()} · {o.payment_status || o.status}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* TICKETS TAB */}
              {tab === 'tickets' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                    {[
                      { label: 'Paid', value: tickets.filter(t => t.ticket_type === 'paid').length, color: '#22C55E' },
                      { label: 'Bonus', value: tickets.filter(t => t.ticket_type === 'bonus').length, color: '#FACC15' },
                      { label: 'Used', value: tickets.filter(t => t.status === 'used').length, color: '#6B7280' },
                    ].map(s => (
                      <div key={s.label} style={{ background: '#050505', borderRadius: 10, padding: 14, textAlign: 'center' }}>
                        <div style={{ ...F, fontWeight: 900, fontSize: 28, color: s.color }}>{s.value}</div>
                        <div style={{ ...F, fontSize: 11, letterSpacing: 2, color: '#B8C1CC' }}>{s.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Manual bonus tickets */}
                  <div style={{ background: '#050505', borderRadius: 10, padding: 16 }}>
                    <div style={{ ...F, fontSize: 11, letterSpacing: 3, color: '#B8C1CC', marginBottom: 10 }}>MANUALLY ADD BONUS TICKETS</div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <input type="number" value={bonusInput} min="1" onChange={e => setBonusInput(e.target.value)}
                        style={{ flex: 1, background: '#071426', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', color: '#F5F5F5', ...FB, fontSize: 14, outline: 'none' }} />
                      <button onClick={addBonusTickets} disabled={saving}
                        style={{ background: '#DC2626', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', ...F, fontWeight: 700, fontSize: 14, letterSpacing: 1, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
                        ADD
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* REFERRALS TAB */}
              {tab === 'referrals' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {referrals.length === 0 ? <div style={{ ...FB, color: '#B8C1CC', textAlign: 'center', padding: 40 }}>No referrals yet.</div>
                  : referrals.map((r: any) => (
                    <div key={r.id} style={{ background: '#050505', borderRadius: 10, padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ ...F, fontWeight: 700, fontSize: 16, color: '#F5F5F5' }}>{r.referred_email}</div>
                        <div style={{ ...FB, fontSize: 12, color: '#B8C1CC' }}>{new Date(r.created_at).toLocaleDateString()}</div>
                      </div>
                      <span style={{ ...F, fontSize: 11, letterSpacing: 2, padding: '3px 10px', borderRadius: 4, background: r.status === 'rewarded' ? 'rgba(34,197,94,0.15)' : 'rgba(250,204,21,0.1)', color: r.status === 'rewarded' ? '#22C55E' : '#FACC15' }}>
                        {r.status?.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
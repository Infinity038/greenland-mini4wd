'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const ADMIN_PASSWORD = 'mini4wd2026';
const F = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
const FB = { fontFamily: "'DM Sans', sans-serif" } as const;
const STATUS_COLORS: Record<string, string> = { registered: '#3B82F6', official: '#22C55E', suspended: '#FACC15', banned: '#DC2626' };

function TopBar() {
  return (
    <div style={{ background: '#071426', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 20px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <a href="/admin" style={{ textDecoration: 'none' }}><div style={{ width: 28, height: 28, background: '#DC2626', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', ...F, fontWeight: 900, fontSize: 12, color: '#fff' }}>4W</div></a>
        <div style={{ ...F, fontWeight: 900, fontSize: 18, color: '#F5F5F5', letterSpacing: 1 }}>MANAGE MEMBERS</div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <a href="/admin" style={{ ...FB, fontSize: 12, color: '#B8C1CC', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '6px 12px' }}>← Dashboard</a>
      </div>
    </div>
  );
}

export default function AdminMembersPage() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState('');
  const [members, setMembers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [bonusInput, setBonusInput] = useState('1');
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'info'|'orders'|'tickets'>('info');

  const login = () => { if (pw === ADMIN_PASSWORD) { setAuthed(true); fetchMembers(); } };

  const fetchMembers = async () => {
    const { data } = await supabase.from('members').select('*').order('created_at', { ascending: false });
    setMembers(data || []);
  };

  const openMember = async (m: any) => {
    setSelected(m); setTab('info');
    const [{ data: o }, { data: t }] = await Promise.all([
      supabase.from('orders').select('*').eq('member_email', m.email).order('created_at', { ascending: false }),
      supabase.from('tickets').select('*').eq('member_email', m.email),
    ]);
    setOrders(o || []); setTickets(t || []);
  };

  const updateStatus = async (email: string, status: string) => {
    setSaving(true);
    await supabase.from('members').update({ member_status: status }).eq('email', email);
    await fetchMembers();
    if (selected?.email === email) setSelected((p: any) => p ? { ...p, member_status: status } : null);
    setSaving(false);
  };

  const deleteMember = async (email: string) => {
    if (!confirm('Remove this member?')) return;
    await supabase.from('members').delete().eq('email', email);
    setSelected(null); await fetchMembers();
  };

  const addBonus = async () => {
    if (!selected) return;
    const n = parseInt(bonusInput);
    if (isNaN(n) || n <= 0) return;
    setSaving(true);
    await supabase.from('tickets').insert(Array.from({ length: n }, () => ({ member_email: selected.email, member_name: selected.name, ticket_type: 'bonus', status: 'available' })));
    const { data } = await supabase.from('tickets').select('*').eq('member_email', selected.email);
    setTickets(data || []); setBonusInput('1'); setSaving(false);
  };

  const filtered = members.filter(m => m.name?.toLowerCase().includes(search.toLowerCase()) || m.email?.toLowerCase().includes(search.toLowerCase()));

  if (!authed) return (
    <div style={{ minHeight: '100vh', background: '#050505', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, padding: '32px 28px', width: '100%', maxWidth: 380 }}>
        <div style={{ ...F, fontWeight: 900, fontSize: 24, color: '#F5F5F5', marginBottom: 24 }}>ADMIN ACCESS</div>
        <input type="password" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === 'Enter' && login()} placeholder="Password"
          style={{ width: '100%', background: '#050505', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '13px 16px', color: '#F5F5F5', ...FB, fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 14 }} />
        <button onClick={login} style={{ width: '100%', background: '#DC2626', color: '#fff', border: 'none', borderRadius: 10, padding: '13px', ...F, fontWeight: 900, fontSize: 17, letterSpacing: 2, cursor: 'pointer' }}>LOGIN →</button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#050505', color: '#F5F5F5' }}>
      <TopBar />
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px,1fr))', gap: 10, marginBottom: 20 }}>
          {['registered','official','suspended','banned'].map(s => (
            <div key={s} style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ ...F, fontWeight: 900, fontSize: 28, color: STATUS_COLORS[s] }}>{members.filter(m => (m.member_status || 'registered') === s).length}</div>
              <div style={{ ...F, fontSize: 11, letterSpacing: 1, color: '#B8C1CC' }}>{s.toUpperCase()}</div>
            </div>
          ))}
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..."
          style={{ width: '100%', background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '12px 16px', color: '#F5F5F5', ...FB, fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 16 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(m => {
            const st = m.member_status || 'registered';
            const sc = STATUS_COLORS[st] || '#6B7280';
            return (
              <div key={m.email} onClick={() => openMember(m)} style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(220,38,38,0.3)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: sc + '22', border: `2px solid ${sc}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', ...F, fontWeight: 900, fontSize: 16, color: sc, flexShrink: 0 }}>{m.name?.[0]?.toUpperCase() || '?'}</div>
                  <div>
                    <div style={{ ...F, fontWeight: 700, fontSize: 17, color: '#F5F5F5' }}>{m.name}</div>
                    <div style={{ ...FB, fontSize: 12, color: '#B8C1CC' }}>{m.email} · {m.nationality}</div>
                  </div>
                </div>
                <span style={{ ...F, fontSize: 10, letterSpacing: 2, padding: '3px 10px', borderRadius: 4, background: sc + '18', color: sc }}>{st.toUpperCase()}</span>
              </div>
            );
          })}
        </div>
      </div>

      {selected && (
        <div onClick={() => setSelected(null)} style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '20px 16px', overflowY: 'auto' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 18, width: '100%', maxWidth: 560, marginBottom: 24 }}>
            <div style={{ padding: '18px 22px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ ...F, fontWeight: 900, fontSize: 22, color: '#F5F5F5' }}>{selected.name}</div>
                <div style={{ ...FB, fontSize: 13, color: '#B8C1CC' }}>{selected.email}</div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: '#B8C1CC', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              {(['info','orders','tickets'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)} style={{ ...F, fontWeight: 700, fontSize: 13, letterSpacing: 2, padding: '11px 18px', border: 'none', background: 'transparent', color: tab === t ? '#DC2626' : '#B8C1CC', borderBottom: tab === t ? '2px solid #DC2626' : '2px solid transparent', cursor: 'pointer' }}>
                  {t.toUpperCase()}
                </button>
              ))}
            </div>
            <div style={{ padding: 22 }}>
              {tab === 'info' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {[['Phone', selected.phone || '—'], ['Nationality', selected.nationality || '—'], ['City', selected.city || '—'], ['Experience', selected.experience || '—'], ['Rank', selected.rank || 'Rookie'], ['Points', String(selected.total_points || 0)], ['Joined', selected.created_at ? new Date(selected.created_at).toLocaleDateString() : '—'], ['Referral Code', selected.referral_code || '—']].map(([k,v]) => (
                      <div key={k}><div style={{ ...F, fontSize: 10, letterSpacing: 2, color: '#B8C1CC', marginBottom: 2 }}>{k}</div><div style={{ ...FB, fontSize: 14, color: '#F5F5F5', fontWeight: 600 }}>{v}</div></div>
                    ))}
                  </div>
                  <div>
                    <div style={{ ...F, fontSize: 11, letterSpacing: 3, color: '#B8C1CC', marginBottom: 10 }}>MEMBER STATUS</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {['registered','official','suspended','banned'].map(s => (
                        <button key={s} disabled={saving} onClick={() => updateStatus(selected.email, s)}
                          style={{ ...F, fontWeight: 700, fontSize: 12, letterSpacing: 1, padding: '8px 14px', borderRadius: 8, border: `1px solid ${STATUS_COLORS[s]}55`, background: (selected.member_status || 'registered') === s ? STATUS_COLORS[s] + '22' : 'transparent', color: STATUS_COLORS[s], cursor: 'pointer' }}>
                          {s.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ borderTop: '1px solid rgba(220,38,38,0.2)', paddingTop: 14 }}>
                    <button onClick={() => deleteMember(selected.email)} style={{ ...F, fontWeight: 700, fontSize: 13, letterSpacing: 1, padding: '9px 18px', borderRadius: 8, background: 'transparent', border: '1px solid rgba(220,38,38,0.4)', color: '#DC2626', cursor: 'pointer' }}>🗑 REMOVE MEMBER</button>
                  </div>
                </div>
              )}
              {tab === 'orders' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {orders.length === 0 ? <div style={{ ...FB, color: '#B8C1CC', textAlign: 'center', padding: 32 }}>No orders.</div>
                  : orders.map((o: any) => (
                    <div key={o.id} style={{ background: '#050505', borderRadius: 10, padding: 14 }}>
                      <div style={{ ...F, fontWeight: 700, fontSize: 16, color: '#F5F5F5' }}>{o.product_name}</div>
                      <div style={{ ...FB, fontSize: 12, color: '#B8C1CC', marginTop: 3 }}>{new Date(o.created_at).toLocaleDateString()} · {o.payment_status || o.status}</div>
                    </div>
                  ))}
                </div>
              )}
              {tab === 'tickets' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                    {[['Paid', tickets.filter((t: any) => t.ticket_type === 'paid').length, '#22C55E'], ['Bonus', tickets.filter((t: any) => t.ticket_type === 'bonus').length, '#FACC15'], ['Used', tickets.filter((t: any) => t.status === 'used').length, '#6B7280']].map(([l,v,c]) => (
                      <div key={String(l)} style={{ background: '#050505', borderRadius: 10, padding: '12px', textAlign: 'center' }}>
                        <div style={{ ...F, fontWeight: 900, fontSize: 26, color: String(c) }}>{v}</div>
                        <div style={{ ...F, fontSize: 11, letterSpacing: 2, color: '#B8C1CC' }}>{l}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ background: '#050505', borderRadius: 10, padding: 14 }}>
                    <div style={{ ...F, fontSize: 11, letterSpacing: 3, color: '#B8C1CC', marginBottom: 10 }}>ADD BONUS TICKETS</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input type="number" value={bonusInput} min="1" onChange={e => setBonusInput(e.target.value)}
                        style={{ flex: 1, background: '#071426', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '9px 12px', color: '#F5F5F5', ...FB, fontSize: 14, outline: 'none' }} />
                      <button onClick={addBonus} disabled={saving} style={{ background: '#DC2626', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', ...F, fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>ADD</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
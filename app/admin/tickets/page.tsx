'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const F = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
const FB = { fontFamily: "'DM Sans', sans-serif" } as const;

const TICKET_STATUS_COLORS: Record<string, string> = { available: '#22C55E', used: '#6B7280', cancelled: '#DC2626' };
const TYPE_COLORS: Record<string, string> = { paid: '#3B82F6', bonus: '#FACC15', referral: '#A855F7' };

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchTickets(); }, []);

  const fetchTickets = async () => {
    setLoading(true);
    const { data } = await supabase.from('tickets').select('*').order('created_at', { ascending: false });
    setTickets(data || []);
    setLoading(false);
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('tickets').update({ status }).eq('id', id);
    await fetchTickets();
  };

  const deleteTicket = async (id: string) => {
    if (!confirm('Delete this ticket?')) return;
    await supabase.from('tickets').delete().eq('id', id);
    await fetchTickets();
  };

  const filtered = tickets.filter(t => {
    const matchSearch = t.member_email?.toLowerCase().includes(search.toLowerCase()) || t.member_name?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || t.status === filter || t.ticket_type === filter;
    return matchSearch && matchFilter;
  });

  const stats = {
    total: tickets.length,
    available: tickets.filter(t => t.status === 'available').length,
    used: tickets.filter(t => t.status === 'used').length,
    bonus: tickets.filter(t => t.ticket_type === 'bonus').length,
  };

  return (
    <div style={{ minHeight: '100vh', background: '#050505', color: '#F5F5F5' }}>
      <div style={{ background: '#071426', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ ...F, fontSize: 11, letterSpacing: 4, color: '#DC2626' }}>ADMIN</div>
          <div style={{ ...F, fontWeight: 900, fontSize: 24, color: '#F5F5F5' }}>MANAGE TICKETS</div>
        </div>
        <a href="/admin" style={{ ...FB, fontSize: 13, color: '#B8C1CC', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 16px' }}>← Dashboard</a>
      </div>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 24px' }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Total', value: stats.total, color: '#F5F5F5' },
            { label: 'Available', value: stats.available, color: '#22C55E' },
            { label: 'Used', value: stats.used, color: '#6B7280' },
            { label: 'Bonus', value: stats.bonus, color: '#FACC15' },
          ].map(s => (
            <div key={s.label} style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '16px' }}>
              <div style={{ ...F, fontWeight: 900, fontSize: 32, color: s.color }}>{s.value}</div>
              <div style={{ ...F, fontSize: 11, letterSpacing: 2, color: '#B8C1CC' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Search + filter */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by member name or email..."
            style={{ flex: 1, minWidth: 200, background: '#071426', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '12px 16px', color: '#F5F5F5', ...FB, fontSize: 14, outline: 'none' }} />
          <div style={{ display: 'flex', gap: 8 }}>
            {['all', 'available', 'used', 'paid', 'bonus', 'cancelled'].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{ ...F, fontWeight: 700, fontSize: 12, letterSpacing: 1, padding: '8px 14px', borderRadius: 8, border: filter === f ? 'none' : '1px solid rgba(255,255,255,0.1)', background: filter === f ? '#DC2626' : '#071426', color: filter === f ? '#fff' : '#B8C1CC', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {f.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, ...FB, color: '#B8C1CC' }}>Loading...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(t => {
              const sc = TICKET_STATUS_COLORS[t.status] || '#6B7280';
              const tc = TYPE_COLORS[t.ticket_type] || '#6B7280';
              return (
                <div key={t.id} style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ ...F, fontSize: 11, letterSpacing: 2, padding: '2px 8px', borderRadius: 4, background: tc + '22', color: tc }}>{t.ticket_type?.toUpperCase()}</span>
                      <span style={{ ...F, fontSize: 11, letterSpacing: 2, padding: '2px 8px', borderRadius: 4, background: sc + '22', color: sc }}>● {t.status?.toUpperCase()}</span>
                    </div>
                    <div style={{ ...F, fontWeight: 700, fontSize: 17, color: '#F5F5F5' }}>{t.member_name || t.member_email}</div>
                    <div style={{ ...FB, fontSize: 12, color: '#B8C1CC' }}>{t.member_email} · {t.created_at ? new Date(t.created_at).toLocaleDateString() : '—'}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <select value={t.status} onChange={e => updateStatus(t.id, e.target.value)}
                      style={{ background: '#050505', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '7px 10px', color: '#F5F5F5', ...F, fontSize: 12, cursor: 'pointer', outline: 'none' }}>
                      <option value="available">available</option>
                      <option value="used">used</option>
                      <option value="cancelled">cancelled</option>
                    </select>
                    <button onClick={() => deleteTicket(t.id)} style={{ ...F, fontSize: 12, letterSpacing: 1, padding: '7px 14px', borderRadius: 6, background: 'transparent', border: '1px solid rgba(220,38,38,0.3)', color: '#DC2626', cursor: 'pointer' }}>DELETE</button>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && <div style={{ textAlign: 'center', padding: 60, ...FB, color: '#B8C1CC' }}>No tickets found.</div>}
          </div>
        )}
      </div>
    </div>
  );
}
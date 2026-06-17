'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function checkAuth() {
  if (typeof window === 'undefined') return false;
  try { const { expires } = JSON.parse(localStorage.getItem('adminSession') || '{}'); return Date.now() < expires; }
  catch { return false; }
}
function saveAuth() {
  localStorage.setItem('adminSession', JSON.stringify({ expires: Date.now() + 8 * 60 * 60 * 1000 }));
}

const F = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
const FB = { fontFamily: "'DM Sans', sans-serif" } as const;

const STATUS_COLORS: Record<string, string> = {
  awaiting_payment: '#FACC15',
  proof_uploaded: '#F97316',
  payment_confirmed: '#22C55E',
  cancelled: '#DC2626',
};
const STATUS_LABELS: Record<string, string> = {
  awaiting_payment: 'Awaiting Payment',
  proof_uploaded: 'Proof Uploaded',
  payment_confirmed: 'Confirmed',
  cancelled: 'Cancelled',
};
const TYPE_LABELS: Record<string, string> = {
  weekly_earlybird: '🐦 Early Bird',
  weekly: '🏁 Weekly',
  season: '🏆 Season',
};
const TYPE_COLORS: Record<string, string> = {
  weekly_earlybird: '#22C55E',
  weekly: '#FACC15',
  season: '#DC2626',
};

export default function AdminTicketsPage() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState('');
  const [pwError, setPwError] = useState('');
  const [tickets, setTickets] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [saving, setSaving] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [earlyBirdSlots, setEarlyBirdSlots] = useState(10);
  const [savingConfig, setSavingConfig] = useState(false);
  const [statuses, setStatuses] = useState<Record<string, string>>({});

  const stats = {
    total: tickets.length,
    proofs: tickets.filter(t => t.payment_status === 'proof_uploaded').length,
    confirmed: tickets.filter(t => t.payment_status === 'payment_confirmed').length,
    earlyBird: tickets.filter(t => t.ticket_type === 'weekly_earlybird' && t.payment_status === 'payment_confirmed').length,
    weekly: tickets.filter(t => t.ticket_type === 'weekly' && t.payment_status === 'payment_confirmed').length,
    season: tickets.filter(t => t.ticket_type === 'season' && t.payment_status === 'payment_confirmed').length,
    revenue: tickets.filter(t => t.payment_status === 'payment_confirmed').reduce((s, t) => s + (t.total_price || 0), 0),
  };

  useEffect(() => { if (checkAuth()) { setAuthed(true); loadData(); } }, []);

  async function loadData() {
    const { data } = await supabase.from('race_tickets').select('*').order('created_at', { ascending: false });
    setTickets(data || []);
    const { data: cfg } = await supabase.from('admin_config').select('value').eq('key', 'earlybird_slots').single();
    if (cfg) setEarlyBirdSlots(parseInt(cfg.value));
  }

  async function updateStatus(id: string) {
    const status = statuses[id];
    if (!status) return;
    setSaving(id);
    const ticket = tickets.find(t => t.id === id);

    await supabase.from('race_tickets').update({ payment_status: status }).eq('id', id);

    // Auto-increment loyalty on confirmation
    if (status === 'payment_confirmed' && ticket?.payment_status !== 'payment_confirmed') {
      const col = ticket?.ticket_type === 'season' ? 'season_loyalty_progress' : 'weekly_loyalty_progress';
      const qty = ticket?.quantity || 1;
      const { data: member } = await supabase.from('members').select(col).eq('email', ticket.member_email).single();
      if (member) {
        const current = member[col] || 0;
        const newVal = (current + qty) % 10; // resets at 10
        const grantFree = (current + qty) >= 10;
        await supabase.from('members').update({ [col]: newVal }).eq('email', ticket.member_email);
        if (grantFree) setMsg(`✅ Updated · 🎁 ${ticket.member_name} earned a FREE ticket!`);
        else setMsg('✅ Updated');
      }
    } else {
      setMsg('✅ Updated');
    }

    loadData();
    setSaving(null);
    setTimeout(() => setMsg(''), 4000);
  }

  async function saveEarlyBirdSlots() {
    setSavingConfig(true);
    await supabase.from('admin_config').upsert({ key: 'earlybird_slots', value: String(earlyBirdSlots) }, { onConflict: 'key' });
    setSavingConfig(false);
    setMsg('✅ Early bird slots saved');
    setTimeout(() => setMsg(''), 2000);
  }

  async function deleteTicket(id: string) {
    if (!confirm('Delete this ticket?')) return;
    await supabase.from('race_tickets').delete().eq('id', id);
    loadData();
  }

  function handleLogin() {
    if (pw === 'mini4wd2026') { saveAuth(); setAuthed(true); loadData(); }
    else setPwError('Wrong password');
  }

  const filtered = tickets.filter(t => {
    const statusMatch = filter === 'all' || t.payment_status === filter;
    const typeMatch = typeFilter === 'all' || t.ticket_type === typeFilter;
    return statusMatch && typeMatch;
  });

  const s = {
    page: { background: '#050505', minHeight: '100vh', color: '#F5F5F5' },
    header: { background: '#071426', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky' as const, top: 0, zIndex: 50 },
    body: { maxWidth: '1000px', margin: '0 auto', padding: '24px 20px' },
    card: { background: '#071426', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '18px 20px', marginBottom: 10 },
    badge: (c: string) => ({ ...F, fontSize: 10, letterSpacing: 2, padding: '3px 10px', borderRadius: 20, background: c + '22', color: c, border: `1px solid ${c}44`, display: 'inline-block' }),
    inp: { background: '#050505', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', color: '#F5F5F5', ...FB, fontSize: 13, outline: 'none' } as const,
  };

  if (!authed) return (
    <div style={{ ...s.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '32px 28px', width: '100%', maxWidth: 360 }}>
        <div style={{ ...F, fontWeight: 900, fontSize: 20, letterSpacing: 2, marginBottom: 20 }}>ADMIN LOGIN</div>
        <input style={{ ...s.inp, width: '100%', boxSizing: 'border-box', marginBottom: 8 }} type="password" placeholder="Password" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} />
        {pwError && <div style={{ color: '#DC2626', ...FB, fontSize: 12, marginBottom: 8 }}>{pwError}</div>}
        <button onClick={handleLogin} style={{ width: '100%', background: '#DC2626', color: '#fff', border: 'none', borderRadius: 8, padding: 12, ...F, fontWeight: 900, fontSize: 16, letterSpacing: 2, cursor: 'pointer', marginTop: 4 }}>LOGIN →</button>
      </div>
    </div>
  );

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <a href="/admin" style={{ ...FB, fontSize: 12, color: '#6B7280', textDecoration: 'none' }}>← Dashboard</a>
          <div style={{ ...F, fontWeight: 900, fontSize: 18, letterSpacing: 2 }}>RACE TICKETS</div>
        </div>
        <a href="/tickets" target="_blank" style={{ ...FB, fontSize: 12, color: '#B8C1CC', textDecoration: 'none' }}>View Public Page ↗</a>
      </div>

      <div style={s.body}>
        {msg && <div style={{ ...FB, fontSize: 13, color: '#22C55E', marginBottom: 16, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8, padding: '10px 14px' }}>{msg}</div>}

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10, marginBottom: 24 }}>
          {[
            { label: 'Total', value: stats.total, color: '#3B82F6' },
            { label: 'Proof Uploaded', value: stats.proofs, color: '#F97316' },
            { label: 'Confirmed', value: stats.confirmed, color: '#22C55E' },
            { label: 'Early Bird', value: stats.earlyBird, color: '#22C55E' },
            { label: 'Weekly', value: stats.weekly, color: '#FACC15' },
            { label: 'Season', value: stats.season, color: '#DC2626' },
            { label: 'Revenue (DKK)', value: stats.revenue, color: '#A855F7' },
          ].map(s => (
            <div key={s.label} style={{ background: '#071426', border: `1px solid ${s.color}22`, borderRadius: 10, padding: '14px 12px', textAlign: 'center' }}>
              <div style={{ ...F, fontWeight: 900, fontSize: 26, color: s.color }}>{s.value}</div>
              <div style={{ ...FB, fontSize: 10, color: '#6B7280', letterSpacing: 1, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Early Bird Config */}
        <div style={{ background: '#071426', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 12, padding: 20, marginBottom: 24 }}>
          <div style={{ ...F, fontWeight: 900, fontSize: 16, color: '#22C55E', marginBottom: 4, letterSpacing: 1 }}>🐦 EARLY BIRD SLOT CONTROL</div>
          <div style={{ ...FB, fontSize: 12, color: '#B8C1CC', marginBottom: 14 }}>Set how many early bird slots (130 DKK) are available. Once filled, early bird option is hidden from members.</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={() => setEarlyBirdSlots(s => Math.max(0, s - 1))} style={{ width: 32, height: 32, borderRadius: '50%', background: '#050505', border: '1px solid rgba(255,255,255,0.1)', color: '#F5F5F5', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
              <span style={{ ...F, fontWeight: 900, fontSize: 28, color: '#22C55E', minWidth: 40, textAlign: 'center' }}>{earlyBirdSlots}</span>
              <button onClick={() => setEarlyBirdSlots(s => s + 1)} style={{ width: 32, height: 32, borderRadius: '50%', background: '#050505', border: '1px solid rgba(255,255,255,0.1)', color: '#F5F5F5', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
            </div>
            <div style={{ ...FB, fontSize: 13, color: '#B8C1CC' }}>max slots · <span style={{ color: '#22C55E' }}>{stats.earlyBird} used</span> · <span style={{ color: '#FACC15' }}>{Math.max(0, earlyBirdSlots - stats.earlyBird)} remaining</span></div>
            <button onClick={saveEarlyBirdSlots} disabled={savingConfig} style={{ marginLeft: 'auto', background: '#22C55E', color: '#000', border: 'none', borderRadius: 8, padding: '8px 18px', ...F, fontWeight: 700, fontSize: 13, letterSpacing: 1, cursor: 'pointer', opacity: savingConfig ? 0.5 : 1 }}>
              {savingConfig ? 'SAVING...' : 'SAVE'}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
          {['all', 'awaiting_payment', 'proof_uploaded', 'payment_confirmed', 'cancelled'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ ...F, fontSize: 11, letterSpacing: 1, padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', background: filter === f ? '#DC2626' : 'rgba(255,255,255,0.06)', color: filter === f ? '#fff' : '#B8C1CC' }}>
              {f === 'all' ? 'ALL' : STATUS_LABELS[f]?.toUpperCase()}
            </button>
          ))}
          <div style={{ width: 1, background: 'rgba(255,255,255,0.08)', margin: '0 4px' }} />
          {['all', 'weekly_earlybird', 'weekly', 'season'].map(f => (
            <button key={f} onClick={() => setTypeFilter(f)}
              style={{ ...F, fontSize: 11, letterSpacing: 1, padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', background: typeFilter === f ? '#3B82F6' : 'rgba(255,255,255,0.06)', color: typeFilter === f ? '#fff' : '#B8C1CC' }}>
              {f === 'all' ? 'ALL TYPES' : TYPE_LABELS[f]?.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Ticket list */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', ...FB, color: '#6B7280' }}>No tickets found.</div>
        ) : filtered.map(ticket => (
          <div key={ticket.id} style={s.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
              <div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                  <span style={s.badge(TYPE_COLORS[ticket.ticket_type] || '#6B7280')}>{TYPE_LABELS[ticket.ticket_type] || ticket.ticket_type}</span>
                  <span style={s.badge(STATUS_COLORS[ticket.payment_status] || '#6B7280')}>{STATUS_LABELS[ticket.payment_status] || ticket.payment_status}</span>
                </div>
                <div style={{ ...F, fontWeight: 900, fontSize: 18, color: '#F5F5F5' }}>{ticket.member_name}</div>
                <div style={{ ...FB, fontSize: 12, color: '#B8C1CC', marginTop: 2 }}>{ticket.member_email}</div>
                <div style={{ ...FB, fontSize: 12, color: '#B8C1CC', marginTop: 2 }}>
                  Ref: <span style={{ color: '#FACC15', fontFamily: 'monospace' }}>{ticket.payment_reference}</span> · {new Date(ticket.created_at).toLocaleDateString('en-GB')}
                </div>
                <div style={{ ...FB, fontSize: 12, color: '#B8C1CC', marginTop: 2 }}>
                  {ticket.quantity} ticket{ticket.quantity > 1 ? 's' : ''} × {ticket.unit_price} DKK = <strong style={{ color: '#FACC15' }}>{ticket.total_price} DKK</strong>
                </div>
              </div>
            </div>

            {ticket.payment_proof_url && (
              <div style={{ marginBottom: 12, background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: 8, padding: 12 }}>
                <a href={ticket.payment_proof_url} target="_blank" rel="noreferrer" style={{ color: '#F97316', ...FB, fontSize: 13, textDecoration: 'none' }}>📸 View Payment Proof ↗</a>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <select
                value={statuses[ticket.id] || ticket.payment_status}
                onChange={e => setStatuses(s => ({ ...s, [ticket.id]: e.target.value }))}
                style={{ ...s.inp, cursor: 'pointer' }}>
                {['awaiting_payment', 'proof_uploaded', 'payment_confirmed', 'cancelled'].map(st => (
                  <option key={st} value={st}>{STATUS_LABELS[st]}</option>
                ))}
              </select>
              <button onClick={() => updateStatus(ticket.id)} disabled={saving === ticket.id}
                style={{ background: '#22C55E', color: '#000', border: 'none', borderRadius: 8, padding: '8px 16px', ...F, fontWeight: 700, fontSize: 13, letterSpacing: 1, cursor: 'pointer', opacity: saving === ticket.id ? 0.5 : 1 }}>
                {saving === ticket.id ? '...' : 'SAVE'}
              </button>
              <button onClick={() => deleteTicket(ticket.id)}
                style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 8, padding: '8px 14px', ...F, fontWeight: 700, fontSize: 13, color: '#DC2626', cursor: 'pointer' }}>
                DELETE
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
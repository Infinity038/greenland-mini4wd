'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const F = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
const FB = { fontFamily: "'DM Sans', sans-serif" } as const;

const STATUSES = ['upcoming', 'ongoing', 'completed', 'cancelled'];
const STATUS_COLORS: Record<string, string> = { upcoming: '#3B82F6', ongoing: '#22C55E', completed: '#6B7280', cancelled: '#DC2626' };

interface Tournament {
  id?: string;
  name: string;
  date: string;
  location: string;
  type: string;
  ticket_price_dkk: number;
  max_participants: number;
  status: string;
}

const DEMO: Tournament[] = [
  { id: '1', name: 'Arctic Sprint #1', date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16), location: 'Nuuk Community Hall', type: 'box_stock', ticket_price_dkk: 60, max_participants: 16, status: 'upcoming' },
  { id: '2', name: 'Arctic Sprint #2', date: new Date(Date.now() + 21 * 86400000).toISOString().slice(0, 16), location: 'Nuuk Community Hall', type: 'box_stock', ticket_price_dkk: 60, max_participants: 32, status: 'upcoming' },
];

const EMPTY: Tournament = { name: '', date: '', location: 'Nuuk Community Hall', type: 'box_stock', ticket_price_dkk: 60, max_participants: 16, status: 'upcoming' };

const inp = (extra?: object) => ({ width: '100%', background: '#050505', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '12px 14px', color: '#F5F5F5', fontFamily: "'DM Sans', sans-serif", fontSize: 14, outline: 'none', boxSizing: 'border-box' as const, ...extra });

export default function AdminTournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>(DEMO);
  const [editing, setEditing] = useState<Tournament | null>(null);
  const [saving, setSaving] = useState(false);
  const [useSupabase, setUseSupabase] = useState(false);
  const [rsvps, setRsvps] = useState<Record<string, any[]>>({});

  useEffect(() => { fetchTournaments(); }, []);

  const fetchTournaments = async () => {
    const { data, error } = await supabase.from('tournaments').select('*').order('date', { ascending: true });
    if (!error && data) { setTournaments(data); setUseSupabase(true); }
  };

  const fetchRsvps = async (id: string) => {
    const { data } = await supabase.from('race_tickets').select('*').eq('tournament_id', id);
    setRsvps(prev => ({ ...prev, [id]: data || [] }));
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    if (useSupabase) {
      if (editing.id) await supabase.from('tournaments').update(editing).eq('id', editing.id);
      else await supabase.from('tournaments').insert({ ...editing });
      await fetchTournaments();
    } else {
      if (editing.id) setTournaments(prev => prev.map(t => t.id === editing.id ? editing : t));
      else setTournaments(prev => [...prev, { ...editing, id: Date.now().toString() }]);
    }
    setEditing(null); setSaving(false);
  };

  const deleteTournament = async (id: string) => {
    if (!confirm('Delete this tournament?')) return;
    if (useSupabase) { await supabase.from('tournaments').delete().eq('id', id); await fetchTournaments(); }
    else setTournaments(prev => prev.filter(t => t.id !== id));
  };

  const quickStatus = async (t: Tournament, status: string) => {
    if (useSupabase) { await supabase.from('tournaments').update({ status }).eq('id', t.id!); await fetchTournaments(); }
    else setTournaments(prev => prev.map(x => x.id === t.id ? { ...x, status } : x));
  };

  return (
    <div style={{ minHeight: '100vh', background: '#050505', color: '#F5F5F5' }}>
      <div style={{ background: '#071426', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ ...F, fontSize: 11, letterSpacing: 4, color: '#DC2626' }}>ADMIN</div>
          <div style={{ ...F, fontWeight: 900, fontSize: 24, color: '#F5F5F5' }}>MANAGE TOURNAMENTS</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setEditing({ ...EMPTY })} style={{ background: '#DC2626', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', ...F, fontWeight: 700, fontSize: 15, letterSpacing: 1, cursor: 'pointer' }}>+ NEW TOURNAMENT</button>
          <a href="/admin" style={{ ...FB, fontSize: 13, color: '#B8C1CC', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 16px' }}>← Dashboard</a>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
        {!useSupabase && (
          <div style={{ background: 'rgba(250,204,21,0.08)', border: '1px solid rgba(250,204,21,0.2)', borderRadius: 10, padding: '12px 16px', ...FB, fontSize: 13, color: '#FACC15', marginBottom: 24 }}>
            ⚠️ Using demo data. Supabase <code>tournaments</code> table not connected yet.
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {tournaments.map(t => {
            const sc = STATUS_COLORS[t.status] || '#6B7280';
            const registrations = rsvps[t.id!]?.length || 0;
            return (
              <div key={t.id} style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ ...F, fontSize: 11, letterSpacing: 2, padding: '3px 10px', borderRadius: 4, background: sc + '22', color: sc }}>● {t.status.toUpperCase()}</span>
                    </div>
                    <div style={{ ...F, fontWeight: 900, fontSize: 24, color: '#F5F5F5', marginBottom: 2 }}>{t.name}</div>
                    <div style={{ ...FB, fontSize: 13, color: '#B8C1CC' }}>
                      📅 {t.date ? new Date(t.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }) : '—'} &nbsp;·&nbsp; 📍 {t.location}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setEditing(t)} style={{ ...F, fontSize: 12, letterSpacing: 1, padding: '8px 16px', borderRadius: 6, background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#F5F5F5', cursor: 'pointer' }}>EDIT</button>
                    <button onClick={() => deleteTournament(t.id!)} style={{ ...F, fontSize: 12, letterSpacing: 1, padding: '8px 16px', borderRadius: 6, background: 'transparent', border: '1px solid rgba(220,38,38,0.3)', color: '#DC2626', cursor: 'pointer' }}>DELETE</button>
                  </div>
                </div>

                {/* Stats row */}
                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 16 }}>
                  {[
                    { label: 'TICKET PRICE', value: `${t.ticket_price_dkk} kr` },
                    { label: 'MAX SPOTS', value: String(t.max_participants) },
                    { label: 'TYPE', value: t.type },
                  ].map(s => (
                    <div key={s.label}>
                      <div style={{ ...F, fontSize: 10, letterSpacing: 3, color: '#B8C1CC' }}>{s.label}</div>
                      <div style={{ ...F, fontWeight: 700, fontSize: 16, color: '#F5F5F5' }}>{s.value}</div>
                    </div>
                  ))}
                </div>

                {/* Quick status */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {STATUSES.map(s => (
                    <button key={s} onClick={() => quickStatus(t, s)}
                      style={{ ...F, fontWeight: 700, fontSize: 11, letterSpacing: 1, padding: '6px 12px', borderRadius: 6, border: `1px solid ${STATUS_COLORS[s]}55`, background: t.status === s ? STATUS_COLORS[s] + '22' : 'transparent', color: STATUS_COLORS[s], cursor: 'pointer' }}>
                      {s.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
          {tournaments.length === 0 && <div style={{ textAlign: 'center', padding: 60, ...FB, color: '#B8C1CC' }}>No tournaments yet. Create one above.</div>}
        </div>
      </div>

      {/* Edit modal */}
      {editing && (
        <div onClick={() => setEditing(null)} style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px', overflowY: 'auto' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, width: '100%', maxWidth: 520, marginBottom: 24 }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ ...F, fontWeight: 900, fontSize: 22, color: '#F5F5F5', margin: 0 }}>{editing.id ? 'EDIT TOURNAMENT' : 'NEW TOURNAMENT'}</h2>
              <button onClick={() => setEditing(null)} style={{ background: 'none', border: 'none', color: '#B8C1CC', fontSize: 22, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ ...F, fontSize: 11, letterSpacing: 3, color: '#B8C1CC', display: 'block', marginBottom: 6 }}>TOURNAMENT NAME</label>
                <input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} style={inp()} />
              </div>
              <div>
                <label style={{ ...F, fontSize: 11, letterSpacing: 3, color: '#B8C1CC', display: 'block', marginBottom: 6 }}>DATE & TIME</label>
                <input type="datetime-local" value={editing.date} onChange={e => setEditing({ ...editing, date: e.target.value })} style={inp()} />
              </div>
              <div>
                <label style={{ ...F, fontSize: 11, letterSpacing: 3, color: '#B8C1CC', display: 'block', marginBottom: 6 }}>LOCATION</label>
                <input value={editing.location} onChange={e => setEditing({ ...editing, location: e.target.value })} style={inp()} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ ...F, fontSize: 11, letterSpacing: 3, color: '#B8C1CC', display: 'block', marginBottom: 6 }}>TICKET PRICE (DKK)</label>
                  <input type="number" value={editing.ticket_price_dkk} onChange={e => setEditing({ ...editing, ticket_price_dkk: Number(e.target.value) })} style={inp()} />
                </div>
                <div>
                  <label style={{ ...F, fontSize: 11, letterSpacing: 3, color: '#B8C1CC', display: 'block', marginBottom: 6 }}>MAX PARTICIPANTS</label>
                  <input type="number" value={editing.max_participants} onChange={e => setEditing({ ...editing, max_participants: Number(e.target.value) })} style={inp()} />
                </div>
              </div>
              <div>
                <label style={{ ...F, fontSize: 11, letterSpacing: 3, color: '#B8C1CC', display: 'block', marginBottom: 6 }}>STATUS</label>
                <select value={editing.status} onChange={e => setEditing({ ...editing, status: e.target.value })} style={inp()}>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <button onClick={save} disabled={saving} style={{ background: '#DC2626', color: '#fff', border: 'none', borderRadius: 10, padding: '14px 24px', ...F, fontWeight: 900, fontSize: 18, letterSpacing: 2, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'SAVING...' : 'SAVE TOURNAMENT'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
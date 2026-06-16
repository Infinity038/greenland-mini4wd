'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function checkAuth() {
  if (typeof window === 'undefined') return false;
  const session = localStorage.getItem('adminSession');
  if (!session) return false;
  try {
    const { expires } = JSON.parse(session);
    return Date.now() < expires;
  } catch { return false; }
}

function saveAuth() {
  localStorage.setItem('adminSession', JSON.stringify({ expires: Date.now() + 8 * 60 * 60 * 1000 }));
}

export default function AdminRaceResults() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState('');
  const [pwError, setPwError] = useState('');
  const [seasons, setSeasons] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [form, setForm] = useState({ season_id: '', member_id: '', member_name: '', race_date: '', position: '', lap_time_seconds: '', wins: '0', points_earned: '0', notes: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => { if (checkAuth()) { setAuthed(true); loadData(); } }, []);

  async function loadData() {
    const [s, m, r] = await Promise.all([
      supabase.from('seasons').select('*').order('created_at', { ascending: false }),
      supabase.from('members').select('id, first_name, last_name').order('first_name'),
      supabase.from('race_results').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    setSeasons(s.data || []);
    setMembers(m.data || []);
    setResults(r.data || []);
    const active = s.data?.find((x: any) => x.is_active);
    if (active) setForm(f => ({ ...f, season_id: active.id }));
  }

  function handleLogin() {
    if (pw === 'mini4wd2026') { saveAuth(); setAuthed(true); loadData(); }
    else setPwError('Wrong password');
  }

  function handleMemberSelect(id: string) {
    const m = members.find((x: any) => x.id === id);
    setForm(f => ({ ...f, member_id: id, member_name: m ? `${m.first_name} ${m.last_name}` : '' }));
  }

  async function handleSubmit() {
    if (!form.season_id || !form.member_id || !form.race_date) { setMsg('Fill in season, member, and date.'); return; }
    setSaving(true);
    const { error } = await supabase.from('race_results').insert({
      season_id: form.season_id,
      member_id: form.member_id,
      member_name: form.member_name,
      race_date: form.race_date,
      position: form.position ? parseInt(form.position) : null,
      lap_time_seconds: form.lap_time_seconds ? parseFloat(form.lap_time_seconds) : null,
      wins: parseInt(form.wins) || 0,
      points_earned: parseInt(form.points_earned) || 0,
      notes: form.notes,
    });
    if (error) { setMsg('Error: ' + error.message); }
    else { setMsg('✅ Result saved!'); setForm(f => ({ ...f, member_id: '', member_name: '', position: '', lap_time_seconds: '', wins: '0', points_earned: '0', notes: '' })); loadData(); }
    setSaving(false);
    setTimeout(() => setMsg(''), 3000);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this result?')) return;
    await supabase.from('race_results').delete().eq('id', id);
    loadData();
  }

  const s: Record<string, any> = {
    page: { background: '#050505', minHeight: '100vh', color: '#F5F5F5', fontFamily: "'DM Sans', sans-serif", padding: '32px 24px' },
    card: { background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '28px', maxWidth: '700px', margin: '0 auto 32px' },
    title: { fontSize: '24px', fontWeight: 800, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '2px', marginBottom: '24px', color: '#DC2626' },
    label: { display: 'block', fontSize: '11px', letterSpacing: '2px', color: '#6B7280', textTransform: 'uppercase' as const, marginBottom: '6px', marginTop: '16px' },
    input: { width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '10px 14px', color: '#F5F5F5', fontSize: '14px' },
    select: { width: '100%', background: '#050505', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '10px 14px', color: '#F5F5F5', fontSize: '14px' },
    btn: { marginTop: '20px', padding: '12px 28px', background: '#DC2626', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', letterSpacing: '1px' },
    msg: { marginTop: '12px', fontSize: '13px', color: '#FACC15' },
    row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
    table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: '13px' },
    th: { textAlign: 'left' as const, padding: '10px', fontSize: '11px', letterSpacing: '1px', color: '#6B7280', borderBottom: '1px solid rgba(255,255,255,0.06)', textTransform: 'uppercase' as const },
    td: { padding: '10px', borderBottom: '1px solid rgba(255,255,255,0.04)' },
    del: { background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.2)', color: '#DC2626', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
  };

  if (!authed) return (
    <div style={{ ...s.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ ...s.card, maxWidth: '360px' }}>
        <div style={s.title}>ADMIN LOGIN</div>
        <input style={s.input} type="password" placeholder="Password" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} />
        {pwError && <div style={{ color: '#DC2626', fontSize: '13px', marginTop: '8px' }}>{pwError}</div>}
        <button style={s.btn} onClick={handleLogin}>Enter</button>
      </div>
    </div>
  );

  return (
    <div style={s.page}>
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
          <a href="/admin" style={{ color: '#6B7280', fontSize: '13px', textDecoration: 'none' }}>← Admin</a>
          <div style={{ fontSize: '28px', fontWeight: 900, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '2px' }}>RACE RESULTS</div>
        </div>

        {/* ENTRY FORM */}
        <div style={s.card}>
          <div style={s.title}>ADD RESULT</div>

          <label style={s.label}>Season</label>
          <select style={s.select} value={form.season_id} onChange={e => setForm(f => ({ ...f, season_id: e.target.value }))}>
            <option value="">Select season...</option>
            {seasons.map((s: any) => <option key={s.id} value={s.id}>{s.name}{s.is_active ? ' (Active)' : ''}</option>)}
          </select>

          <label style={s.label}>Member</label>
          <select style={s.select} value={form.member_id} onChange={e => handleMemberSelect(e.target.value)}>
            <option value="">Select member...</option>
            {members.map((m: any) => <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>)}
          </select>

          <label style={s.label}>Race Date</label>
          <input style={s.input} type="date" value={form.race_date} onChange={e => setForm(f => ({ ...f, race_date: e.target.value }))} />

          <div style={s.row}>
            <div>
              <label style={s.label}>Position</label>
              <input style={s.input} type="number" placeholder="1" value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))} />
            </div>
            <div>
              <label style={s.label}>Lap Time (seconds)</label>
              <input style={s.input} type="number" step="0.001" placeholder="3.241" value={form.lap_time_seconds} onChange={e => setForm(f => ({ ...f, lap_time_seconds: e.target.value }))} />
            </div>
          </div>

          <div style={s.row}>
            <div>
              <label style={s.label}>Wins</label>
              <input style={s.input} type="number" value={form.wins} onChange={e => setForm(f => ({ ...f, wins: e.target.value }))} />
            </div>
            <div>
              <label style={s.label}>Points Earned</label>
              <input style={s.input} type="number" value={form.points_earned} onChange={e => setForm(f => ({ ...f, points_earned: e.target.value }))} />
            </div>
          </div>

          <label style={s.label}>Notes</label>
          <input style={s.input} placeholder="Optional notes..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />

          <button style={s.btn} onClick={handleSubmit} disabled={saving}>{saving ? 'Saving...' : 'SAVE RESULT'}</button>
          {msg && <div style={s.msg}>{msg}</div>}
        </div>

        {/* RESULTS TABLE */}
        <div style={s.card}>
          <div style={s.title}>RECENT RESULTS</div>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Member</th>
                <th style={s.th}>Date</th>
                <th style={s.th}>Pos</th>
                <th style={s.th}>Lap</th>
                <th style={s.th}>Wins</th>
                <th style={s.th}></th>
              </tr>
            </thead>
            <tbody>
              {results.map((r: any) => (
                <tr key={r.id}>
                  <td style={s.td}>{r.member_name}</td>
                  <td style={{ ...s.td, color: '#6B7280' }}>{r.race_date}</td>
                  <td style={s.td}>{r.position || '—'}</td>
                  <td style={{ ...s.td, color: '#60A5FA' }}>{r.lap_time_seconds ? `${r.lap_time_seconds}s` : '—'}</td>
                  <td style={{ ...s.td, color: '#FACC15' }}>{r.wins}</td>
                  <td style={s.td}><button style={s.del} onClick={() => handleDelete(r.id)}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
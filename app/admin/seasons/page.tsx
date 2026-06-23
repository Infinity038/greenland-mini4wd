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
  try { const { expires } = JSON.parse(session); return Date.now() < expires; }
  catch { return false; }
}
function saveAuth() {
  localStorage.setItem('adminSession', JSON.stringify({ expires: Date.now() + 8 * 60 * 60 * 1000 }));
}

// Date-only strings (e.g. "2026-07-01" from a <input type="date">) get parsed
// as UTC midnight by the JS Date constructor. Displaying that in a negative
// UTC-offset timezone (Greenland is UTC-2/-3) rolls it back a day. Parsing
// with an explicit local time component avoids the UTC interpretation entirely.
function parseLocalDate(dateStr: string): Date {
  if (!dateStr) return new Date(NaN);
  const datePart = dateStr.split('T')[0];
  return new Date(datePart + 'T00:00:00');
}

export default function AdminSeasons() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState('');
  const [pwError, setPwError] = useState('');
  const [seasons, setSeasons] = useState<any[]>([]);
  const [form, setForm] = useState({ name: '', start_date: '', end_date: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => { if (checkAuth()) { setAuthed(true); loadSeasons(); } }, []);

  async function loadSeasons() {
    const { data } = await supabase.from('seasons').select('*').order('created_at', { ascending: false });
    setSeasons(data || []);
  }

  function handleLogin() {
    if (pw === 'mini4wd2026') { saveAuth(); setAuthed(true); loadSeasons(); }
    else setPwError('Wrong password');
  }

  async function handleCreate() {
    if (!form.name || !form.start_date || !form.end_date) { setMsg('Fill all fields.'); return; }
    setSaving(true);
    const { error } = await supabase.from('seasons').insert({ ...form, is_active: false });
    if (error) setMsg('Error: ' + error.message);
    else { setMsg('✅ Season created!'); setForm({ name: '', start_date: '', end_date: '' }); loadSeasons(); }
    setSaving(false);
    setTimeout(() => setMsg(''), 3000);
  }

  async function setActive(id: string) {
    await supabase.from('seasons').update({ is_active: false }).neq('id', id);
    await supabase.from('seasons').update({ is_active: true }).eq('id', id);

    // Update member tiers based on current season standings
    const { data: standings } = await supabase.from('season_standings').select('*').eq('season_id', id).order('season_rank');
    if (standings) {
      for (const s of standings) {
        let tier = 'member';
        let rate = 2.00;
        if (s.season_rank === 1) { tier = 'season_1st'; rate = 5.00; }
        else if (s.season_rank === 2) { tier = 'season_2nd'; rate = 4.00; }
        else if (s.season_rank === 3) { tier = 'season_3rd'; rate = 3.00; }
        if (s.member_id) {
          await supabase.from('members').update({ loyalty_tier: tier, points_rate: rate }).eq('id', s.member_id);
          await supabase.from('loyalty_points').upsert({ member_id: s.member_id, member_name: s.member_name, tier, points_rate: rate }, { onConflict: 'member_id' });
        }
      }
    }
    setMsg('✅ Season activated and tiers updated!');
    loadSeasons();
    setTimeout(() => setMsg(''), 4000);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this season? Race results linked to it will also be deleted.')) return;
    await supabase.from('race_results').delete().eq('season_id', id);
    await supabase.from('seasons').delete().eq('id', id);
    loadSeasons();
  }

  const s: Record<string, any> = {
    page: { background: '#050505', minHeight: '100vh', color: '#F5F5F5', fontFamily: "'DM Sans', sans-serif", padding: '32px 24px' },
    card: { background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '24px', maxWidth: '700px', margin: '0 auto 24px' },
    title: { fontSize: '22px', fontWeight: 800, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '2px', marginBottom: '20px', color: '#DC2626' },
    label: { display: 'block', fontSize: '11px', letterSpacing: '2px', color: '#6B7280', textTransform: 'uppercase' as const, marginBottom: '6px', marginTop: '14px' },
    input: { width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '10px 14px', color: '#F5F5F5', fontSize: '14px' },
    btn: { padding: '10px 20px', background: '#DC2626', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', marginTop: '16px' },
    row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
    seasonRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' },
    activeBadge: { background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.3)', color: '#DC2626', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', letterSpacing: '1px' },
    activateBtn: { padding: '6px 14px', background: 'rgba(250,204,21,0.1)', border: '1px solid rgba(250,204,21,0.3)', color: '#FACC15', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', marginRight: '8px' },
    deleteBtn: { padding: '6px 14px', background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.2)', color: '#DC2626', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
    msg: { fontSize: '13px', color: '#FACC15', marginTop: '8px' },
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
          <div style={{ fontSize: '28px', fontWeight: 900, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '2px' }}>SEASONS</div>
        </div>

        {/* CREATE SEASON */}
        <div style={s.card}>
          <div style={s.title}>CREATE NEW SEASON</div>
          <label style={s.label}>Season Name</label>
          <input style={s.input} placeholder="Season 2 — Sep/Oct 2026" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <div style={s.row}>
            <div>
              <label style={s.label}>Start Date</label>
              <input style={s.input} type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
            </div>
            <div>
              <label style={s.label}>End Date</label>
              <input style={s.input} type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
            </div>
          </div>
          <button style={s.btn} onClick={handleCreate} disabled={saving}>{saving ? 'Creating...' : 'CREATE SEASON'}</button>
          {msg && <div style={s.msg}>{msg}</div>}
        </div>

        {/* SEASONS LIST */}
        <div style={s.card}>
          <div style={s.title}>ALL SEASONS</div>
          <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '16px' }}>
            Activating a season automatically recalculates and updates all member points tiers based on current standings.
          </div>
          {seasons.map((season: any) => (
            <div key={season.id} style={s.seasonRow}>
              <div>
                <div style={{ fontWeight: 600, marginBottom: '4px' }}>{season.name}</div>
                <div style={{ fontSize: '12px', color: '#6B7280' }}>
                  {parseLocalDate(season.start_date).toLocaleDateString('en-GB')} → {parseLocalDate(season.end_date).toLocaleDateString('en-GB')}
                </div>
                {season.is_active && <div style={{ ...s.activeBadge, display: 'inline-block', marginTop: '6px' }}>● ACTIVE</div>}
              </div>
              <div>
                {!season.is_active && (
                  <button style={s.activateBtn} onClick={() => setActive(season.id)}>Set Active</button>
                )}
                <button style={s.deleteBtn} onClick={() => handleDelete(season.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { checkAndUpdateHOF, getMemberLifetimeStat } from '@/lib/hallOfFame';

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

const TIER_ORDER: Record<string, number> = { non_member: 0, member: 1, season_3rd: 2, season_2nd: 3, season_1st: 4, hall_of_fame: 5 };
const RANK_TIER: Record<number, string> = { 1: 'season_1st', 2: 'season_2nd', 3: 'season_3rd' };

// season_standings is a live VIEW — total_wins/best_lap/races_attended/total_points/season_rank
// are already auto-computed from race_results. We only need to (1) apply the min-races gate
// the view doesn't know about, and (2) escalate the top 3 eligible members' loyalty_tier.
// Read-only against the view — never write to it.
async function syncSeasonTiers(seasonId: string) {
  const { data: cfg } = await supabase.from('admin_config').select('value').eq('key', 'min_races_for_ranking').single();
  const minRaces = cfg ? parseInt(cfg.value) : 3;

  const { data: standings } = await supabase.from('season_standings').select('*').eq('season_id', seasonId);
  if (!standings) return;

  const eligible = (standings as any[])
    .filter(s => s.races_attended >= minRaces)
    .sort((a, b) => a.season_rank - b.season_rank);

  for (let i = 0; i < Math.min(3, eligible.length); i++) {
    const targetTier = RANK_TIER[i + 1];
    const memberId = eligible[i].member_id;
    const { data: memberRow } = await supabase.from('members').select('loyalty_tier').eq('id', memberId).single();
    const currentOrder = TIER_ORDER[memberRow?.loyalty_tier || 'member'] ?? 1;
    const targetOrder = TIER_ORDER[targetTier];
    if (targetOrder > currentOrder) {
      await supabase.from('members').update({ loyalty_tier: targetTier }).eq('id', memberId);
    }
  }
}

export default function AdminRaceResults() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState('');
  const [pwError, setPwError] = useState('');
  const [seasons, setSeasons] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [form, setForm] = useState({ season_id: '', member_id: '', member_name: '', race_date: '', position: '', lap_time_seconds: '', qualifying_time_1: '', qualifying_time_2: '', round_2_result: '', wins: '0', points_earned: '0', notes: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [minRaces, setMinRaces] = useState(3);
  const [minRacesSaving, setMinRacesSaving] = useState(false);

  useEffect(() => { if (checkAuth()) { setAuthed(true); loadData(); } }, []);

  async function loadData() {
    const [s, m, r, cfg] = await Promise.all([
      supabase.from('seasons').select('*').order('created_at', { ascending: false }),
      supabase.from('members').select('id, name').order('name'),
      supabase.from('race_results').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('admin_config').select('value').eq('key', 'min_races_for_ranking').single(),
    ]);
    setSeasons(s.data || []);
    setMembers(m.data || []);
    setResults(r.data || []);
    if (cfg.data) setMinRaces(parseInt(cfg.data.value));
    const active = s.data?.find((x: any) => x.is_active);
    if (active) setForm(f => ({ ...f, season_id: active.id }));
  }

  async function saveMinRaces() {
    setMinRacesSaving(true);
    await supabase.from('admin_config').upsert({ key: 'min_races_for_ranking', value: String(minRaces) }, { onConflict: 'key' });
    setMinRacesSaving(false);
    setMsg('✅ Minimum races setting saved');
    setTimeout(() => setMsg(''), 2000);
  }

  function handleLogin() {
    if (pw === 'mini4wd2026') { saveAuth(); setAuthed(true); loadData(); }
    else setPwError('Wrong password');
  }

  function handleMemberSelect(id: string) {
    const m = members.find((x: any) => x.id === id);
    setForm(f => ({ ...f, member_id: id, member_name: m ? m.name : '' }));
  }

  async function handleSubmit() {
    if (!form.season_id || !form.member_id || !form.race_date) { setMsg('Fill in season, member, and date.'); return; }
    setSaving(true);

    const q1 = form.qualifying_time_1 ? parseFloat(form.qualifying_time_1) : null;
    const q2 = form.qualifying_time_2 ? parseFloat(form.qualifying_time_2) : null;
    const bestQual = [q1, q2].filter((v): v is number => v != null).sort((a, b) => a - b)[0];
    const lapTime = form.lap_time_seconds ? parseFloat(form.lap_time_seconds) : (bestQual ?? null);

    const { error } = await supabase.from('race_results').insert({
      season_id: form.season_id,
      member_id: form.member_id,
      member_name: form.member_name,
      race_date: form.race_date,
      position: form.position ? parseInt(form.position) : null,
      lap_time_seconds: lapTime,
      qualifying_time_1: q1,
      qualifying_time_2: q2,
      round_2_result: form.round_2_result || null,
      wins: parseInt(form.wins) || 0,
      points_earned: parseInt(form.points_earned) || 0,
      notes: form.notes,
    });

    let hofMsg = '';
    if (!error) {
      try {
        if (lapTime != null) {
          const r = await checkAndUpdateHOF('fastest_lap', form.member_id, form.member_name, lapTime, `${lapTime}s`, true);
          if (r.broke_record) hofMsg += ' 🏆 New fastest lap record!';
        }
        const lifetimeWins = await getMemberLifetimeStat(form.member_id, 'wins');
        if (lifetimeWins > 0) {
          const r = await checkAndUpdateHOF('most_wins', form.member_id, form.member_name, lifetimeWins, `${lifetimeWins} wins`, false);
          if (r.broke_record) hofMsg += ' 🏆 New Most Wins record!';
        }
        const lifetimePoints = await getMemberLifetimeStat(form.member_id, 'points_earned');
        if (lifetimePoints > 0) {
          const r = await checkAndUpdateHOF('most_points', form.member_id, form.member_name, lifetimePoints, `${lifetimePoints} pts`, false);
          if (r.broke_record) hofMsg += ' 🏆 New Most Points record!';
        }
      } catch (e: any) { hofMsg = ' ⚠️ HOF check failed: ' + e.message; }

      try {
        await syncSeasonTiers(form.season_id);
      } catch (e: any) { hofMsg += ' ⚠️ Tier sync failed: ' + e.message; }
    }

    if (error) { setMsg('Error: ' + error.message); }
    else { setMsg('✅ Result saved!' + hofMsg); setForm(f => ({ ...f, member_id: '', member_name: '', position: '', lap_time_seconds: '', qualifying_time_1: '', qualifying_time_2: '', round_2_result: '', wins: '0', points_earned: '0', notes: '' })); loadData(); }
    setSaving(false);
    setTimeout(() => setMsg(''), 6000);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this result?')) return;
    const row = results.find((r: any) => r.id === id);
    await supabase.from('race_results').delete().eq('id', id);
    if (row?.season_id) {
      try { await syncSeasonTiers(row.season_id); } catch { /* non-fatal */ }
    }
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

        {/* MIN RACES FOR RANKING */}
        <div style={{ ...s.card, border: '1px solid rgba(34,197,94,0.2)' }}>
          <div style={{ ...s.title, color: '#22C55E', marginBottom: 8 }}>🏁 MIN RACES FOR SEASON RANKING</div>
          <div style={{ fontSize: '13px', color: '#B8C1CC', marginBottom: 14 }}>Members need at least this many race results in a season before they qualify for a season rank (and the Pro/Elite/Champion tier that comes with it).</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => setMinRaces(v => Math.max(1, v - 1))} style={{ width: 32, height: 32, borderRadius: '50%', background: '#050505', border: '1px solid rgba(255,255,255,0.1)', color: '#F5F5F5', fontSize: 18, cursor: 'pointer' }}>−</button>
            <span style={{ fontSize: 28, fontWeight: 900, fontFamily: "'Barlow Condensed', sans-serif", color: '#22C55E', minWidth: 40, textAlign: 'center' }}>{minRaces}</span>
            <button onClick={() => setMinRaces(v => v + 1)} style={{ width: 32, height: 32, borderRadius: '50%', background: '#050505', border: '1px solid rgba(255,255,255,0.1)', color: '#F5F5F5', fontSize: 18, cursor: 'pointer' }}>+</button>
            <button onClick={saveMinRaces} disabled={minRacesSaving} style={{ marginLeft: 'auto', background: '#22C55E', color: '#000', border: 'none', borderRadius: 8, padding: '8px 18px', fontWeight: 700, fontSize: 13, letterSpacing: 1, cursor: 'pointer', opacity: minRacesSaving ? 0.5 : 1 }}>{minRacesSaving ? 'SAVING...' : 'SAVE'}</button>
          </div>
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
            {members.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>

          <label style={s.label}>Race Date</label>
          <input style={s.input} type="date" value={form.race_date} onChange={e => setForm(f => ({ ...f, race_date: e.target.value }))} />

          <div style={s.row}>
            <div>
              <label style={s.label}>Position</label>
              <input style={s.input} type="number" placeholder="1" value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))} />
            </div>
            <div>
              <label style={s.label}>Fastest Lap (seconds)</label>
              <input style={s.input} type="number" step="0.001" placeholder="auto from qualifying if blank" value={form.lap_time_seconds} onChange={e => setForm(f => ({ ...f, lap_time_seconds: e.target.value }))} />
            </div>
          </div>

          <div style={{ marginTop: 16, paddingTop: 4, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <label style={{ ...s.label, color: '#FACC15', marginTop: 16 }}>Round Format</label>
            <div style={s.row}>
              <div>
                <label style={s.label}>Qualifying Time 1 (sec) · 2 lives</label>
                <input style={s.input} type="number" step="0.001" placeholder="3.241" value={form.qualifying_time_1} onChange={e => setForm(f => ({ ...f, qualifying_time_1: e.target.value }))} />
              </div>
              <div>
                <label style={s.label}>Qualifying Time 2 (sec) · 2 lives</label>
                <input style={s.input} type="number" step="0.001" placeholder="3.198" value={form.qualifying_time_2} onChange={e => setForm(f => ({ ...f, qualifying_time_2: e.target.value }))} />
              </div>
            </div>
            <label style={s.label}>Round 2 Result · 1 life</label>
            <input style={s.input} placeholder="e.g. Won Final, Eliminated Semi-Final" value={form.round_2_result} onChange={e => setForm(f => ({ ...f, round_2_result: e.target.value }))} />
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
                <th style={s.th}>Q1/Q2</th>
                <th style={s.th}>Round 2</th>
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
                  <td style={{ ...s.td, color: '#A855F7', fontSize: 12 }}>{r.qualifying_time_1 || r.qualifying_time_2 ? `${r.qualifying_time_1 ?? '—'} / ${r.qualifying_time_2 ?? '—'}` : '—'}</td>
                  <td style={{ ...s.td, color: '#FACC15', fontSize: 12 }}>{r.round_2_result || '—'}</td>
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
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

const HOF_CATEGORIES = [
  { key: 'fastest_lap', label: '⚡ Fastest Lap', unit: 'seconds', lower_is_better: true },
  { key: 'most_wins', label: '🏆 Most Race Wins', unit: 'wins', lower_is_better: false },
  { key: 'most_championships', label: '👑 Most Championships', unit: 'titles', lower_is_better: false },
  { key: 'most_points', label: '⭐ Most Points Earned', unit: 'pts', lower_is_better: false },
];

export default function AdminHallOfFame() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState('');
  const [pwError, setPwError] = useState('');
  const [records, setRecords] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ member_id: '', member_name: '', record_value: '', record_label: '', achieved_at: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => { if (checkAuth()) { setAuthed(true); loadData(); } }, []);

  async function loadData() {
    const [r, h, m] = await Promise.all([
      supabase.from('hall_of_fame').select('*'),
      supabase.from('hall_of_fame_history').select('*').order('held_until', { ascending: false }).limit(20),
      supabase.from('members').select('id, first_name, last_name').order('first_name'),
    ]);
    setRecords(r.data || []);
    setHistory(h.data || []);
    setMembers(m.data || []);
  }

  function handleLogin() {
    if (pw === 'mini4wd2026') { saveAuth(); setAuthed(true); loadData(); }
    else setPwError('Wrong password');
  }

  function startEdit(record: any) {
    setEditing(record);
    setForm({
      member_id: record.member_id || '',
      member_name: record.member_name,
      record_value: record.record_value,
      record_label: record.record_label,
      achieved_at: record.achieved_at?.split('T')[0] || new Date().toISOString().split('T')[0],
    });
  }

  function handleMemberSelect(id: string) {
    const m = members.find((x: any) => x.id === id);
    setForm(f => ({ ...f, member_id: id, member_name: m ? `${m.first_name} ${m.last_name}` : '' }));
  }

  async function handleSave() {
    if (!editing) return;
    setSaving(true);

    // Archive previous record to history
    if (editing.member_name !== 'TBD') {
      await supabase.from('hall_of_fame_history').insert({
        category: editing.category,
        member_name: editing.member_name,
        record_value: editing.record_value,
        record_label: editing.record_label,
        held_from: editing.achieved_at,
        held_until: new Date().toISOString(),
      });
    }

    // Update current record
    const { error } = await supabase.from('hall_of_fame').update({
      member_id: form.member_id || null,
      member_name: form.member_name,
      record_value: parseFloat(form.record_value),
      record_label: form.record_label,
      achieved_at: form.achieved_at,
      previous_record_value: editing.record_value,
      previous_holder_name: editing.member_name !== 'TBD' ? editing.member_name : null,
      previous_achieved_at: editing.achieved_at,
    }).eq('id', editing.id);

    // Update member tier to hall_of_fame if member selected
    if (form.member_id) {
      await supabase.from('members').update({ loyalty_tier: 'hall_of_fame', points_rate: 8.00 }).eq('id', form.member_id);
      await supabase.from('loyalty_points').upsert({ member_id: form.member_id, member_name: form.member_name, tier: 'hall_of_fame', points_rate: 8.00 }, { onConflict: 'member_id' });
    }

    if (error) setMsg('Error: ' + error.message);
    else { setMsg('✅ Record updated!'); setEditing(null); loadData(); }
    setSaving(false);
    setTimeout(() => setMsg(''), 3000);
  }

  const s: Record<string, any> = {
    page: { background: '#050505', minHeight: '100vh', color: '#F5F5F5', fontFamily: "'DM Sans', sans-serif", padding: '32px 24px' },
    card: { background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '24px', marginBottom: '20px' },
    goldCard: { background: '#071426', border: '1px solid rgba(255,215,0,0.2)', borderRadius: '12px', padding: '24px', marginBottom: '16px' },
    title: { fontSize: '24px', fontWeight: 800, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '2px', marginBottom: '20px', color: '#FACC15' },
    label: { display: 'block', fontSize: '11px', letterSpacing: '2px', color: '#6B7280', textTransform: 'uppercase' as const, marginBottom: '6px', marginTop: '14px' },
    input: { width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '10px 14px', color: '#F5F5F5', fontSize: '14px' },
    select: { width: '100%', background: '#050505', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '10px 14px', color: '#F5F5F5', fontSize: '14px' },
    btn: { padding: '10px 20px', background: '#FACC15', color: '#000', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', marginTop: '16px' },
    editBtn: { padding: '6px 14px', background: 'rgba(250,204,21,0.1)', border: '1px solid rgba(250,204,21,0.3)', color: '#FACC15', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
    cancelBtn: { padding: '10px 20px', background: 'rgba(255,255,255,0.05)', color: '#B8C1CC', border: 'none', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', marginTop: '16px', marginLeft: '8px' },
    row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
    categoryLabel: { fontSize: '11px', letterSpacing: '3px', color: '#FACC15', textTransform: 'uppercase' as const, marginBottom: '8px' },
    recordName: { fontSize: '20px', fontWeight: 700, fontFamily: "'Barlow Condensed', sans-serif" },
    recordVal: { fontSize: '28px', fontWeight: 900, color: '#DC2626', fontFamily: "'Barlow Condensed', sans-serif" },
    meta: { fontSize: '12px', color: '#6B7280', marginTop: '6px' },
    msg: { fontSize: '13px', color: '#FACC15', marginTop: '8px' },
    histTh: { textAlign: 'left' as const, padding: '8px 10px', fontSize: '11px', color: '#6B7280', borderBottom: '1px solid rgba(255,255,255,0.06)', textTransform: 'uppercase' as const, letterSpacing: '1px' },
    histTd: { padding: '8px 10px', fontSize: '13px', borderBottom: '1px solid rgba(255,255,255,0.04)', color: '#B8C1CC' },
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
          <div style={{ fontSize: '28px', fontWeight: 900, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '2px' }}>🏛️ HALL OF FAME</div>
        </div>

        {/* EDIT FORM */}
        {editing && (
          <div style={{ ...s.card, border: '1px solid rgba(250,204,21,0.3)' }}>
            <div style={s.title}>UPDATE RECORD — {HOF_CATEGORIES.find(c => c.key === editing.category)?.label}</div>
            <label style={s.label}>Member</label>
            <select style={s.select} value={form.member_id} onChange={e => handleMemberSelect(e.target.value)}>
              <option value="">Select member...</option>
              {members.map((m: any) => <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>)}
            </select>
            <div style={s.row}>
              <div>
                <label style={s.label}>Record Value</label>
                <input style={s.input} type="number" step="0.001" value={form.record_value} onChange={e => setForm(f => ({ ...f, record_value: e.target.value }))} />
              </div>
              <div>
                <label style={s.label}>Display Label</label>
                <input style={s.input} placeholder="e.g. 3.241s or 47 wins" value={form.record_label} onChange={e => setForm(f => ({ ...f, record_label: e.target.value }))} />
              </div>
            </div>
            <label style={s.label}>Date Achieved</label>
            <input style={s.input} type="date" value={form.achieved_at} onChange={e => setForm(f => ({ ...f, achieved_at: e.target.value }))} />
            {msg && <div style={s.msg}>{msg}</div>}
            <div>
              <button style={s.btn} onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'SAVE RECORD'}</button>
              <button style={s.cancelBtn} onClick={() => setEditing(null)}>Cancel</button>
            </div>
          </div>
        )}

        {/* CURRENT RECORDS */}
        <div style={s.card}>
          <div style={s.title}>CURRENT RECORDS</div>
          {records.map((r: any) => {
            const cat = HOF_CATEGORIES.find(c => c.key === r.category);
            return (
              <div key={r.id} style={{ ...s.goldCard, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={s.categoryLabel}>{cat?.label || r.category}</div>
                  <div style={s.recordName}>{r.member_name === 'TBD' ? '— Unset —' : r.member_name}</div>
                  <div style={s.recordVal}>{r.record_label}</div>
                  {r.member_name !== 'TBD' && (
                    <div style={s.meta}>Set {new Date(r.achieved_at).toLocaleDateString('en-GB')}</div>
                  )}
                  {r.previous_holder_name && (
                    <div style={{ ...s.meta, marginTop: '4px' }}>Prev: {r.previous_holder_name} — {r.previous_record_value}</div>
                  )}
                </div>
                <button style={s.editBtn} onClick={() => startEdit(r)}>Edit</button>
              </div>
            );
          })}
        </div>

        {/* HISTORY */}
        {history.length > 0 && (
          <div style={s.card}>
            <div style={{ ...s.title, color: '#6B7280' }}>RECORD HISTORY</div>
            <table style={{ width: '100%', borderCollapse: 'collapse' as const }}>
              <thead>
                <tr>
                  <th style={s.histTh}>Category</th>
                  <th style={s.histTh}>Holder</th>
                  <th style={s.histTh}>Record</th>
                  <th style={s.histTh}>Held From</th>
                  <th style={s.histTh}>Held Until</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h: any) => (
                  <tr key={h.id}>
                    <td style={s.histTd}>{HOF_CATEGORIES.find(c => c.key === h.category)?.label || h.category}</td>
                    <td style={s.histTd}>{h.member_name}</td>
                    <td style={{ ...s.histTd, color: '#FACC15' }}>{h.record_label}</td>
                    <td style={s.histTd}>{new Date(h.held_from).toLocaleDateString('en-GB')}</td>
                    <td style={s.histTd}>{new Date(h.held_until).toLocaleDateString('en-GB')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
// @ts-nocheck
'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
export default function AdminProfileRequests() {
    const [requests, setRequests] = useState<any[]>([]);
    const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');
    const [busyId, setBusyId] = useState<string | null>(null);
    const [msg, setMsg] = useState('');
    // @ts-nocheck
    useEffect(() => {
        loadData();
    }, []);
    useEffect(() => { if (authed)
        loadData(); }, [filter]);
    async function loadData() {
        const { data } = await supabase.from('profile_edit_requests').select('*').eq('status', filter).order('created_at', { ascending: false });
        setRequests(data || []);
    }
    async function handleApprove(req: any) {
        setBusyId(req.id);
        const updates: any = {};
        if (req.requested_name)
            updates.name = req.requested_name;
        if (req.requested_avatar_url)
            updates.avatar_url = req.requested_avatar_url;
        if (Object.keys(updates).length > 0) {
            const { error } = await supabase.from('members').update(updates).eq('id', req.member_id);
            if (error) {
                setMsg('Error updating member: ' + error.message);
                setBusyId(null);
                return;
            }
        }
        await supabase.from('profile_edit_requests').update({ status: 'approved', reviewed_at: new Date().toISOString() }).eq('id', req.id);
        setMsg('✅ Approved and applied.');
        setBusyId(null);
        loadData();
        setTimeout(() => setMsg(''), 3000);
    }
    async function handleReject(req: any) {
        setBusyId(req.id);
        await supabase.from('profile_edit_requests').update({ status: 'rejected', reviewed_at: new Date().toISOString() }).eq('id', req.id);
        setMsg('Rejected.');
        setBusyId(null);
        loadData();
        setTimeout(() => setMsg(''), 3000);
    }
    const s: Record<string, any> = {
        page: { background: '#050505', minHeight: '100vh', color: '#F5F5F5', fontFamily: "'DM Sans', sans-serif", padding: '32px 24px' },
        card: { background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px', marginBottom: '14px' },
        title: { fontSize: '18px', fontWeight: 800, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '2px', color: '#DC2626' },
        input: { width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '8px 12px', color: '#F5F5F5', fontSize: '13px' },
        btn: { padding: '8px 18px', background: '#DC2626', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' },
        filterBtn: (active: boolean) => ({
            padding: '7px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
            border: active ? '1px solid rgba(220,38,38,0.4)' : '1px solid rgba(255,255,255,0.1)',
            background: active ? 'rgba(220,38,38,0.15)' : 'transparent', color: active ? '#DC2626' : '#B8C1CC',
        }),
        compareCol: { flex: 1, minWidth: 140 },
        avatarPreview: { width: 56, height: 56, borderRadius: '50%', objectFit: 'cover' as const, background: '#222' },
    };
    return (<div style={s.page}>
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          <a href="/admin" style={{ color: '#6B7280', fontSize: '13px', textDecoration: 'none' }}>← Admin</a>
          <div style={{ fontSize: '28px', fontWeight: 900, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '2px' }}>👤 PROFILE REQUESTS</div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {(['pending', 'approved', 'rejected'] as const).map(f => (<button key={f} style={s.filterBtn(filter === f)} onClick={() => setFilter(f)}>{f.toUpperCase()}</button>))}
        </div>

        {msg && <div style={{ color: '#FACC15', fontSize: 13, marginBottom: 14 }}>{msg}</div>}

        {requests.length === 0 ? (<div style={{ ...s.card, textAlign: 'center', padding: '50px 20px', color: '#4B5563' }}>
            No {filter} requests.
          </div>) : requests.map((req: any) => (<div key={req.id} style={s.card}>
            <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 14 }}>
              {req.member_email} · submitted {new Date(req.created_at).toLocaleDateString('en-GB')}
            </div>

            <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
              <div style={s.compareCol}>
                <div style={{ fontSize: 10, letterSpacing: 1, color: '#6B7280', marginBottom: 8, textTransform: 'uppercase' }}>Current</div>
                {req.current_avatar_url && <img src={req.current_avatar_url} style={{ ...s.avatarPreview, marginBottom: 8 }} alt="Current"/>}
                <div style={{ fontSize: 14, fontWeight: 600 }}>{req.current_name}</div>
              </div>
              <div style={{ ...s.compareCol, opacity: req.requested_name || req.requested_avatar_url ? 1 : 0.3 }}>
                <div style={{ fontSize: 10, letterSpacing: 1, color: '#FACC15', marginBottom: 8, textTransform: 'uppercase' }}>Requested</div>
                {req.requested_avatar_url ? (<img src={req.requested_avatar_url} style={{ ...s.avatarPreview, marginBottom: 8, border: '2px solid #FACC15' }} alt="Requested"/>) : (<div style={{ fontSize: 11, color: '#6B7280', marginBottom: 8 }}>(no photo change)</div>)}
                <div style={{ fontSize: 14, fontWeight: 700, color: req.requested_name ? '#FACC15' : '#6B7280' }}>
                  {req.requested_name || '(no name change)'}
                </div>
              </div>
            </div>

            {filter === 'pending' && (<div style={{ display: 'flex', gap: 10 }}>
                <button style={{ ...s.btn, background: '#22C55E', color: '#000', flex: 1 }} disabled={busyId === req.id} onClick={() => handleApprove(req)}>
                  {busyId === req.id ? '...' : '✓ APPROVE'}
                </button>
                <button style={{ ...s.btn, background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.3)', flex: 1 }} disabled={busyId === req.id} onClick={() => handleReject(req)}>
                  {busyId === req.id ? '...' : '✕ REJECT'}
                </button>
              </div>)}
          </div>))}
      </div>
    </div>);
}

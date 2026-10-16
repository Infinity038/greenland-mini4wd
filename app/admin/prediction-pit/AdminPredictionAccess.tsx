'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabaseAuth/browserClient';

type AccessRow = {
  member_id: string;
  member_name: string;
  member_email: string;
  auth_linked: boolean;
  allowed: boolean;
};

const client = createSupabaseBrowserClient();

export default function AdminPredictionAccess() {
  const [rows, setRows] = useState<AccessRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: fetchError } = await client.rpc('prediction_pit_admin_roster');
    if (fetchError) {
      setRows([]);
      setError('Access register unavailable or not configured. No permissions were changed.');
    } else {
      setRows((data || []) as AccessRow[]);
      setError('');
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function toggle(row: AccessRow, checked: boolean) {
    setSaving(row.member_id);
    setError('');
    const { error: updateError } = await client.rpc('set_prediction_pit_access', {
      target_member_id: row.member_id, new_allowed: checked,
    });
    if (updateError) setError('Permission change was rejected. Please verify owner permissions and retry.');
    await load();
    setSaving(null);
  }

  const filtered = rows.filter(row =>
    [row.member_name, row.member_email].some(v => v.toLowerCase().includes(search.toLowerCase()))
  );

  return <main style={{minHeight:'100vh',background:'#050505',color:'#f5f5f5',padding:'28px 16px',fontFamily:'DM Sans, sans-serif'}}>
    <div style={{maxWidth:900,margin:'auto'}}>
      <Link href="/admin" style={{color:'#facc15'}}>← Admin dashboard</Link>
      <h1 style={{fontFamily:'Barlow Condensed, sans-serif',fontSize:42,marginBottom:8}}>🔒 Prediction Pit Access</h1>
      <p style={{color:'#b8c1cc',lineHeight:1.6}}>Tick only the people you wish to invite. Access is denied by default. Ticking an account never grants coins or official race tickets. An approved person must also have a verified, linked Supabase Auth account before the private tab becomes available.</p>
      <p style={{color:'#facc15'}}>Access foundation only: the online gameplay and wallet migration are not deployed by this branch.</p>
      <label htmlFor="access-search" style={{display:'block',margin:'20px 0 8px'}}>Search existing members</label>
      <input id="access-search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Name or email" style={{width:'100%',padding:12,background:'#102033',color:'#fff',border:'1px solid #405065',borderRadius:8,boxSizing:'border-box'}} />
      {error && <p role="alert" style={{color:'#fecaca'}}>{error}</p>}
      {loading ? <p>Loading permissions…</p> : filtered.length === 0 ? <p>No matching members or access register unavailable.</p> :
        <div style={{display:'grid',gap:10,marginTop:20}}>
          {filtered.map(row=><div key={row.member_id} style={{border:'1px solid #2b4154',borderRadius:10,background:'#101f30',padding:14,display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
            <div style={{minWidth:0}}>
              <strong>{row.member_name}</strong>
              <div style={{color:'#b8c1cc',fontSize:12,overflowWrap:'anywhere'}}>{row.member_email}</div>
              <div style={{color:row.auth_linked?'#86efac':'#fcd34d',fontSize:12,marginTop:4}}>{row.auth_linked?'Verified account linked':'Secure sign-in linkage pending'}</div>
            </div>
            <label style={{display:'flex',alignItems:'center',gap:8,whiteSpace:'nowrap'}}>
              <input type="checkbox" aria-label={`Allow ${row.member_name} private Prediction Pit access`} checked={row.allowed} disabled={saving!==null} onChange={e=>void toggle(row,e.target.checked)} style={{width:22,height:22,accentColor:'#22c55e'}} />
              {row.allowed?'Invited':'Not invited'}
            </label>
          </div>)}
        </div>}
    </div>
  </main>;
}

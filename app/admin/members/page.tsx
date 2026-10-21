'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { MemberProfileModal } from '@/components/admin/MemberProfileModal';
import { createSupabaseBrowserClient } from '@/lib/supabaseAuth/browserClient';

const font = { fontFamily: "'DM Sans', sans-serif" } as const;
const heading = { fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900 } as const;
const MEMBER_FIELDS = 'id,name,first_name,last_name,email,phone,city,nationality,member_status,membership_expires_at,created_at,loyalty_tier,avatar_url,total_points,lifetime_spending,referral_code';

export default function AdminMembersPage() {
  const [members,setMembers] = useState<any[]>([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState('');
  const [selected,setSelected] = useState<any>(null);
  async function reload() {
    setLoading(true); setError('');
    try {
      const {data,error} = await new Promise<any>((resolve,reject)=>{
        const timer=setTimeout(()=>reject(new Error('Member request timed out')),7000);
        Promise.resolve(createSupabaseBrowserClient().from('members').select(MEMBER_FIELDS).order('created_at',{ascending:false})).then(
          result=>{clearTimeout(timer);resolve(result);},
          err=>{clearTimeout(timer);reject(err);}
        );
      });
      if(error) throw error;
      setMembers(data||[]);
    } catch {
      setMembers([]);
      setError('The live member list could not be verified. No member or payment records have been changed.');
    } finally {setLoading(false);}
  }
  useEffect(()=>{void reload();},[]);
  return <div style={{minHeight:'100vh',background:'#050505',color:'#F5F5F5',padding:'28px 20px',...font}}>
    <main style={{maxWidth:1020,margin:'0 auto'}}>
      <nav style={{display:'flex',gap:14,alignItems:'center',flexWrap:'wrap',marginBottom:22}}>
        <Link href="/admin" style={{color:'#B8C1CC'}}>← Dashboard</Link>
        <h1 style={{...heading,fontSize:32,margin:0,flex:1}}>MEMBERS</h1>
        <Link href="/admin/orders" style={{padding:'11px 15px',borderRadius:8,background:'#DC2626',color:'#fff',textDecoration:'none',...heading}}>OPEN PAYMENT DESK →</Link>
      </nav>
      <p style={{fontSize:13,color:'#B8C1CC',lineHeight:1.7}}>This is a read-only member directory. To review or confirm any product payment, use the single Orders & Payments desk. Payment confirmation must not be performed through a second member screen.</p>
      {error && <div role="alert" style={{padding:17,background:'#271319',border:'1px solid #DC2626',borderRadius:9,color:'#FCA5A5',marginBottom:16}}>{error} <button onClick={()=>void reload()} style={{marginLeft:12,background:'#FACC15',color:'#050505',border:0,borderRadius:6,padding:'7px 12px',fontWeight:800,cursor:'pointer'}}>Retry</button></div>}
      {loading ? <p>Loading verified member records…</p> : !error && members.length===0 ? <p>No member records returned.</p> : <div style={{display:'grid',gap:9}}>
        {members.map(m=><button type="button" key={m.id} onClick={()=>setSelected(m)} style={{width:'100%',textAlign:'left',padding:'15px 19px',background:'#071426',border:'1px solid #334155',borderRadius:11,color:'#F5F5F5',cursor:'pointer',display:'flex',justifyContent:'space-between',gap:16,alignItems:'center'}}>
          <span><strong style={{...heading,fontSize:19}}>{m.name || [m.first_name,m.last_name].filter(Boolean).join(' ') || 'Racer'}</strong><span style={{display:'block',fontSize:12,color:'#B8C1CC',marginTop:3}}>{m.email}</span></span>
          <span style={{fontSize:11,color:m.member_status==='official'?'#FACC15':'#B8C1CC'}}>{m.member_status==='official'?'OFFICIAL RACER':'REGISTERED RACER'} →</span>
        </button>)}
      </div>}
    </main>
    <MemberProfileModal member={selected} onClose={()=>setSelected(null)}/>
  </div>;
}

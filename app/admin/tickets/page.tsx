'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const ADMIN_PASSWORD = 'mini4wd2026';
const F = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
const FB = { fontFamily: "'DM Sans', sans-serif" } as const;
const TC: Record<string,string> = {paid:'#3B82F6',bonus:'#FACC15',referral:'#A855F7'};
const SC: Record<string,string> = {available:'#22C55E',used:'#6B7280',cancelled:'#DC2626'};

function checkAuth(){if(typeof window==='undefined')return false;const e=localStorage.getItem('gm4wd_admin_expiry');if(!e||Date.now()>parseInt(e))return false;return localStorage.getItem('gm4wd_admin_authed')==='1';}
function saveAuth(){localStorage.setItem('gm4wd_admin_authed','1');localStorage.setItem('gm4wd_admin_expiry',String(Date.now()+8*60*60*1000));}

function LoginScreen({title,onLogin}:{title:string;onLogin:()=>void}){
  const [pw,setPw]=useState('');const [error,setError]=useState(false);
  const login=()=>{if(pw===ADMIN_PASSWORD){saveAuth();onLogin();}else setError(true);};
  return(<div style={{minHeight:'100vh',background:'#050505',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}><div style={{width:'100%',maxWidth:380}}><div style={{textAlign:'center',marginBottom:28}}><a href="/admin" style={{textDecoration:'none'}}><div style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:48,height:48,background:'#DC2626',borderRadius:12,...F,fontWeight:900,fontSize:20,color:'#fff',marginBottom:12}}>4W</div></a><div style={{...F,fontWeight:900,fontSize:22,color:'#F5F5F5',letterSpacing:2}}>ADMIN ACCESS</div><div style={{...FB,fontSize:12,color:'#6B7280',marginTop:4}}>{title}</div></div><div style={{background:'#071426',border:'1px solid rgba(255,255,255,0.08)',borderRadius:18,padding:'28px 24px'}}><input type="password" value={pw} onChange={e=>{setPw(e.target.value);setError(false);}} onKeyDown={e=>e.key==='Enter'&&login()} placeholder="Admin password" autoFocus style={{width:'100%',background:'#050505',border:`1px solid ${error?'#DC2626':'rgba(255,255,255,0.1)'}`,borderRadius:10,padding:'13px 16px',color:'#F5F5F5',...FB,fontSize:14,outline:'none',boxSizing:'border-box',marginBottom:error?8:16}}/>{error&&<div style={{...FB,fontSize:13,color:'#DC2626',marginBottom:12}}>⚠ Incorrect password.</div>}<button onClick={login} style={{width:'100%',background:'#DC2626',color:'#fff',border:'none',borderRadius:10,padding:'13px',...F,fontWeight:900,fontSize:17,letterSpacing:2,cursor:'pointer'}}>LOGIN →</button><div style={{textAlign:'center',marginTop:12}}><a href="/admin" style={{...FB,fontSize:12,color:'#6B7280',textDecoration:'none'}}>← Dashboard</a></div></div></div></div>);
}

export default function AdminTicketsPage() {
  const [authed,setAuthed]=useState(false);const [checked,setChecked]=useState(false);
  const [tickets,setTickets]=useState<any[]>([]);const [search,setSearch]=useState('');const [filter,setFilter]=useState('all');const [loading,setLoading]=useState(false);

  useEffect(()=>{const ok=checkAuth();setAuthed(ok);setChecked(true);if(ok)fetchTickets();},[]);
  const fetchTickets=async()=>{setLoading(true);const{data}=await supabase.from('tickets').select('*').order('created_at',{ascending:false});setTickets(data||[]);setLoading(false);};
  const updateStatus=async(id:string,status:string)=>{await supabase.from('tickets').update({status}).eq('id',id);await fetchTickets();};
  const del=async(id:string)=>{if(!confirm('Delete?'))return;await supabase.from('tickets').delete().eq('id',id);await fetchTickets();};

  const filtered=tickets.filter(t=>{
    const ms=t.member_email?.toLowerCase().includes(search.toLowerCase())||t.member_name?.toLowerCase().includes(search.toLowerCase());
    const mf=filter==='all'||t.status===filter||t.ticket_type===filter;
    return ms&&mf;
  });

  if(!checked)return null;
  if(!authed)return<LoginScreen title="Manage Tickets" onLogin={()=>{setAuthed(true);fetchTickets();}}/>;

  return(
    <div style={{minHeight:'100vh',background:'#050505',color:'#F5F5F5'}}>
      <div style={{background:'#071426',borderBottom:'1px solid rgba(255,255,255,0.06)',padding:'0 20px',height:56,display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:50}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <a href="/admin" style={{textDecoration:'none'}}><div style={{width:28,height:28,background:'#DC2626',borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',...F,fontWeight:900,fontSize:12,color:'#fff'}}>4W</div></a>
          <div style={{...F,fontWeight:900,fontSize:18,color:'#F5F5F5',letterSpacing:1}}>MANAGE TICKETS</div>
        </div>
        <a href="/admin" style={{...FB,fontSize:12,color:'#B8C1CC',textDecoration:'none',border:'1px solid rgba(255,255,255,0.08)',borderRadius:6,padding:'6px 12px'}}>← Dashboard</a>
      </div>
      <div style={{maxWidth:900,margin:'0 auto',padding:'24px 20px'}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(120px,1fr))',gap:10,marginBottom:20}}>
          {[{l:'Total',v:tickets.length,c:'#F5F5F5'},{l:'Available',v:tickets.filter(t=>t.status==='available').length,c:'#22C55E'},{l:'Used',v:tickets.filter(t=>t.status==='used').length,c:'#6B7280'},{l:'Bonus',v:tickets.filter(t=>t.ticket_type==='bonus').length,c:'#FACC15'}].map(s=>(
            <div key={s.l} style={{background:'#071426',border:'1px solid rgba(255,255,255,0.06)',borderRadius:10,padding:'12px 14px'}}>
              <div style={{...F,fontWeight:900,fontSize:28,color:s.c}}>{s.v}</div>
              <div style={{...F,fontSize:11,letterSpacing:1,color:'#B8C1CC'}}>{s.l}</div>
            </div>
          ))}
        </div>
        <div style={{display:'flex',gap:10,marginBottom:16,flexWrap:'wrap'}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search member..." style={{flex:1,minWidth:180,background:'#071426',border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,padding:'11px 14px',color:'#F5F5F5',...FB,fontSize:14,outline:'none'}}/>
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            {['all','available','used','paid','bonus','cancelled'].map(f=>(
              <button key={f} onClick={()=>setFilter(f)} style={{...F,fontWeight:700,fontSize:11,letterSpacing:1,padding:'8px 12px',borderRadius:8,border:filter===f?'none':'1px solid rgba(255,255,255,0.08)',background:filter===f?'#DC2626':'#071426',color:filter===f?'#fff':'#B8C1CC',cursor:'pointer',whiteSpace:'nowrap' as const}}>{f.toUpperCase()}</button>
            ))}
          </div>
        </div>
        {loading?<div style={{textAlign:'center',padding:60,...FB,color:'#B8C1CC'}}>Loading...</div>
        :<div style={{display:'flex',flexDirection:'column',gap:8}}>
          {filtered.map(t=>{
            const sc=SC[t.status]||'#6B7280';const tc=TC[t.ticket_type]||'#6B7280';
            return(
              <div key={t.id} style={{background:'#071426',border:'1px solid rgba(255,255,255,0.07)',borderRadius:10,padding:'14px 18px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>
                <div>
                  <div style={{display:'flex',gap:6,marginBottom:4}}>
                    <span style={{...F,fontSize:10,letterSpacing:2,padding:'2px 8px',borderRadius:4,background:tc+'22',color:tc}}>{(t.ticket_type||'').toUpperCase()}</span>
                    <span style={{...F,fontSize:10,letterSpacing:2,padding:'2px 8px',borderRadius:4,background:sc+'22',color:sc}}>● {(t.status||'').toUpperCase()}</span>
                  </div>
                  <div style={{...F,fontWeight:700,fontSize:16,color:'#F5F5F5'}}>{t.member_name||t.member_email}</div>
                  <div style={{...FB,fontSize:11,color:'#6B7280'}}>{t.member_email} · {t.created_at?new Date(t.created_at).toLocaleDateString():'—'}</div>
                </div>
                <div style={{display:'flex',gap:6}}>
                  <select value={t.status} onChange={e=>updateStatus(t.id,e.target.value)} style={{background:'#050505',border:'1px solid rgba(255,255,255,0.1)',borderRadius:6,padding:'7px 10px',color:'#F5F5F5',...F,fontSize:12,cursor:'pointer',outline:'none'}}>
                    <option value="available">available</option>
                    <option value="used">used</option>
                    <option value="cancelled">cancelled</option>
                  </select>
                  <button onClick={()=>del(t.id)} style={{...F,fontSize:12,padding:'7px 12px',borderRadius:6,background:'transparent',border:'1px solid rgba(220,38,38,0.3)',color:'#DC2626',cursor:'pointer'}}>DEL</button>
                </div>
              </div>
            );
          })}
          {filtered.length===0&&<div style={{textAlign:'center',padding:60,...FB,color:'#B8C1CC'}}>No tickets found.</div>}
        </div>}
      </div>
    </div>
  );
}
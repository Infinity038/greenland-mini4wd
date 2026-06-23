'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const ADMIN_PASSWORD = 'mini4wd2026';
const F = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
const FB = { fontFamily: "'DM Sans', sans-serif" } as const;
// Must match the public /blog page's filter tabs exactly (minus "All", which is
// a UI-only filter, not a real category) — otherwise posts never show up under
// any filter the visitor clicks.
const CATS = ['Community','Racing','Guide','Event','News'];
const inp = (x?:any) => ({width:'100%',background:'#050505',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,padding:'11px 14px',color:'#F5F5F5',fontFamily:"'DM Sans',sans-serif",fontSize:14,outline:'none',boxSizing:'border-box' as const,...x});
const DEMO = [{id:'1',title:'Welcome to Greenland Mini 4WD Club',summary:'The first Tamiya Mini 4WD community in Greenland is officially open!',body:'',image_url:'',category:'News',published:true,created_at:new Date().toISOString()},{id:'2',title:'What is Box Stock Racing?',summary:'Everything you need to know about box stock rules.',body:'',image_url:'',category:'Guide',published:true,created_at:new Date().toISOString()}];

function checkAuth(){if(typeof window==='undefined')return false;const s=localStorage.getItem('adminSession');if(!s)return false;try{const{expires}=JSON.parse(s);return Date.now()<expires;}catch{return false;}}
function saveAuth(){localStorage.setItem('adminSession',JSON.stringify({expires:Date.now()+8*60*60*1000}));}

function LoginScreen({title,onLogin}:{title:string;onLogin:()=>void}){
  const [pw,setPw]=useState('');const [error,setError]=useState(false);
  const login=()=>{if(pw===ADMIN_PASSWORD){saveAuth();onLogin();}else setError(true);};
  return(<div style={{minHeight:'100vh',background:'#050505',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}><div style={{width:'100%',maxWidth:380}}><div style={{textAlign:'center',marginBottom:28}}><a href="/admin" style={{textDecoration:'none'}}><div style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:48,height:48,background:'#DC2626',borderRadius:12,...F,fontWeight:900,fontSize:20,color:'#fff',marginBottom:12}}>4W</div></a><div style={{...F,fontWeight:900,fontSize:22,color:'#F5F5F5',letterSpacing:2}}>ADMIN ACCESS</div><div style={{...FB,fontSize:12,color:'#6B7280',marginTop:4}}>{title}</div></div><div style={{background:'#071426',border:'1px solid rgba(255,255,255,0.08)',borderRadius:18,padding:'28px 24px'}}><input type="password" value={pw} onChange={e=>{setPw(e.target.value);setError(false);}} onKeyDown={e=>e.key==='Enter'&&login()} placeholder="Admin password" autoFocus style={{width:'100%',background:'#050505',border:`1px solid ${error?'#DC2626':'rgba(255,255,255,0.1)'}`,borderRadius:10,padding:'13px 16px',color:'#F5F5F5',...FB,fontSize:14,outline:'none',boxSizing:'border-box',marginBottom:error?8:16}}/>{error&&<div style={{...FB,fontSize:13,color:'#DC2626',marginBottom:12}}>⚠ Incorrect password.</div>}<button onClick={login} style={{width:'100%',background:'#DC2626',color:'#fff',border:'none',borderRadius:10,padding:'13px',...F,fontWeight:900,fontSize:17,letterSpacing:2,cursor:'pointer'}}>LOGIN →</button><div style={{textAlign:'center',marginTop:12}}><a href="/admin" style={{...FB,fontSize:12,color:'#6B7280',textDecoration:'none'}}>← Dashboard</a></div></div></div></div>);
}

export default function AdminNewsPage() {
  const [authed,setAuthed]=useState(false);const [checked,setChecked]=useState(false);
  const [posts,setPosts]=useState<any[]>(DEMO);const [editing,setEditing]=useState<any>(null);const [saving,setSaving]=useState(false);const [useDb,setUseDb]=useState(false);

  useEffect(()=>{const ok=checkAuth();setAuthed(ok);setChecked(true);if(ok)fetchPosts();},[]);
  const fetchPosts=async()=>{const{data,error}=await supabase.from('news_posts').select('*').order('created_at',{ascending:false});if(!error&&data){setPosts(data);setUseDb(true);}};
  const save=async()=>{
    if(!editing)return;setSaving(true);
    if(useDb){if(editing.id&&!DEMO.find(d=>d.id===editing.id))await supabase.from('news_posts').update(editing).eq('id',editing.id);else await supabase.from('news_posts').insert({...editing,created_at:new Date().toISOString()});await fetchPosts();}
    else{if(editing.id)setPosts(p=>p.map(x=>x.id===editing.id?editing:x));else setPosts(p=>[{...editing,id:Date.now().toString(),created_at:new Date().toISOString()},...p]);}
    setEditing(null);setSaving(false);
  };
  const del=async(id:string)=>{if(!confirm('Delete?'))return;if(useDb){await supabase.from('news_posts').delete().eq('id',id);await fetchPosts();}else setPosts(p=>p.filter(x=>x.id!==id));};
  const toggle=async(post:any)=>{const u={...post,published:!post.published};if(useDb){await supabase.from('news_posts').update({published:u.published}).eq('id',post.id);await fetchPosts();}else setPosts(p=>p.map(x=>x.id===post.id?u:x));};

  if(!checked)return null;
  if(!authed)return<LoginScreen title="Manage News" onLogin={()=>{setAuthed(true);fetchPosts();}}/>;

  return(
    <div style={{minHeight:'100vh',background:'#050505',color:'#F5F5F5'}}>
      <div style={{background:'#071426',borderBottom:'1px solid rgba(255,255,255,0.06)',padding:'0 20px',height:56,display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:50}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <a href="/admin" style={{textDecoration:'none'}}><div style={{width:28,height:28,background:'#DC2626',borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',...F,fontWeight:900,fontSize:12,color:'#fff'}}>4W</div></a>
          <div style={{...F,fontWeight:900,fontSize:18,color:'#F5F5F5',letterSpacing:1}}>MANAGE NEWS</div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={()=>setEditing({title:'',summary:'',body:'',image_url:'',category:'News',published:false})} style={{background:'#DC2626',color:'#fff',border:'none',borderRadius:8,padding:'8px 16px',...F,fontWeight:700,fontSize:14,letterSpacing:1,cursor:'pointer'}}>+ NEW POST</button>
          <a href="/admin" style={{...FB,fontSize:12,color:'#B8C1CC',textDecoration:'none',border:'1px solid rgba(255,255,255,0.08)',borderRadius:6,padding:'6px 12px'}}>← Dashboard</a>
        </div>
      </div>
      <div style={{maxWidth:900,margin:'0 auto',padding:'24px 20px'}}>
        {!useDb&&<div style={{background:'rgba(250,204,21,0.08)',border:'1px solid rgba(250,204,21,0.2)',borderRadius:10,padding:'12px 16px',...FB,fontSize:13,color:'#FACC15',marginBottom:20}}>⚠️ Using demo data. Create Supabase table: <code>news_posts</code></div>}
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {posts.map(post=>(
            <div key={post.id} style={{background:'#071426',border:'1px solid rgba(255,255,255,0.07)',borderRadius:12,padding:'16px 20px'}}>
              <div style={{display:'flex',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>
                <div style={{flex:1}}>
                  <div style={{display:'flex',gap:6,marginBottom:6,flexWrap:'wrap'}}>
                    <span style={{...F,fontSize:10,letterSpacing:2,padding:'2px 8px',borderRadius:4,background:'rgba(255,255,255,0.06)',color:'#B8C1CC'}}>{post.category}</span>
                    <span style={{...F,fontSize:10,letterSpacing:2,padding:'2px 8px',borderRadius:4,background:post.published?'rgba(34,197,94,0.15)':'rgba(255,255,255,0.06)',color:post.published?'#22C55E':'#6B7280'}}>{post.published?'● PUBLISHED':'○ DRAFT'}</span>
                    {post.tournament_id && <span style={{...F,fontSize:10,letterSpacing:2,padding:'2px 8px',borderRadius:4,background:'rgba(220,38,38,0.12)',color:'#FCA5A5'}}>🏁 LINKED TO RACE</span>}
                  </div>
                  <div style={{...F,fontWeight:900,fontSize:18,color:'#F5F5F5',marginBottom:3}}>{post.title}</div>
                  <div style={{...FB,fontSize:13,color:'#B8C1CC'}}>{post.summary}</div>
                </div>
                <div style={{display:'flex',gap:6,flexShrink:0,flexWrap:'wrap'}}>
                  <button onClick={()=>toggle(post)} style={{...F,fontSize:11,letterSpacing:1,padding:'6px 12px',borderRadius:6,background:'transparent',border:`1px solid ${post.published?'#6B7280':'#22C55E'}55`,color:post.published?'#6B7280':'#22C55E',cursor:'pointer'}}>{post.published?'UNPUBLISH':'PUBLISH'}</button>
                  <button onClick={()=>setEditing(post)} style={{...F,fontSize:11,letterSpacing:1,padding:'6px 12px',borderRadius:6,background:'transparent',border:'1px solid rgba(255,255,255,0.15)',color:'#F5F5F5',cursor:'pointer'}}>EDIT</button>
                  <button onClick={()=>del(post.id)} style={{...F,fontSize:11,letterSpacing:1,padding:'6px 12px',borderRadius:6,background:'transparent',border:'1px solid rgba(220,38,38,0.3)',color:'#DC2626',cursor:'pointer'}}>DEL</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {editing&&(
        <div onClick={()=>setEditing(null)} style={{position:'fixed',inset:0,zIndex:50,background:'rgba(0,0,0,0.85)',display:'flex',alignItems:'flex-start',justifyContent:'center',padding:'20px 16px',overflowY:'auto'}}>
          <div onClick={e=>e.stopPropagation()} style={{background:'#071426',border:'1px solid rgba(255,255,255,0.1)',borderRadius:18,width:'100%',maxWidth:580,marginBottom:24}}>
            <div style={{padding:'18px 22px',borderBottom:'1px solid rgba(255,255,255,0.07)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div style={{...F,fontWeight:900,fontSize:20,color:'#F5F5F5'}}>{editing.id?'EDIT POST':'NEW POST'}</div>
              <button onClick={()=>setEditing(null)} style={{background:'none',border:'none',color:'#B8C1CC',fontSize:20,cursor:'pointer'}}>✕</button>
            </div>
            <div style={{padding:22,display:'flex',flexDirection:'column',gap:14}}>
              {editing.tournament_id && (
                <div style={{ background:'rgba(220,38,38,0.08)', border:'1px solid rgba(220,38,38,0.2)', borderRadius:8, padding:'10px 14px', ...FB, fontSize:12, color:'#FCA5A5' }}>
                  🏁 This post is linked to a race event — editing the tournament in Manage Tournaments will overwrite the title/summary/photo here automatically.
                </div>
              )}
              <div><label style={{...F,fontSize:11,letterSpacing:3,color:'#B8C1CC',display:'block',marginBottom:6}}>TITLE</label><input value={editing.title} onChange={e=>setEditing({...editing,title:e.target.value})} style={inp()}/></div>
              <div><label style={{...F,fontSize:11,letterSpacing:3,color:'#B8C1CC',display:'block',marginBottom:6}}>SUMMARY</label><input value={editing.summary} onChange={e=>setEditing({...editing,summary:e.target.value})} style={inp()}/></div>
              <div><label style={{...F,fontSize:11,letterSpacing:3,color:'#B8C1CC',display:'block',marginBottom:6}}>BODY</label><textarea value={editing.body} onChange={e=>setEditing({...editing,body:e.target.value})} rows={5} style={inp({resize:'vertical'})}/></div>
              <div><label style={{...F,fontSize:11,letterSpacing:3,color:'#B8C1CC',display:'block',marginBottom:6}}>IMAGE URL</label><input value={editing.image_url} onChange={e=>setEditing({...editing,image_url:e.target.value})} placeholder="https://..." style={inp()}/></div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                <div><label style={{...F,fontSize:11,letterSpacing:3,color:'#B8C1CC',display:'block',marginBottom:6}}>CATEGORY</label><select value={editing.category} onChange={e=>setEditing({...editing,category:e.target.value})} style={inp()}>{CATS.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
                <div style={{display:'flex',alignItems:'center',gap:10,paddingTop:22}}><input type="checkbox" id="pub" checked={editing.published} onChange={e=>setEditing({...editing,published:e.target.checked})} style={{width:18,height:18,accentColor:'#DC2626',cursor:'pointer'}}/><label htmlFor="pub" style={{...FB,fontSize:14,color:'#F5F5F5',cursor:'pointer'}}>Published</label></div>
              </div>
              <button onClick={save} disabled={saving} style={{background:'#DC2626',color:'#fff',border:'none',borderRadius:10,padding:'13px',...F,fontWeight:900,fontSize:17,letterSpacing:2,cursor:'pointer',opacity:saving?0.6:1}}>{saving?'SAVING...':'SAVE POST'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
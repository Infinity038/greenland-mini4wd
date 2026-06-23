'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

const ADMIN_PASSWORD = 'mini4wd2026';
const F = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
const FB = { fontFamily: "'DM Sans', sans-serif" } as const;
const SC: Record<string,string> = {upcoming:'#3B82F6',ongoing:'#22C55E',completed:'#6B7280',cancelled:'#DC2626'};
const STATUSES = ['upcoming','ongoing','completed','cancelled'];
const RACE_CLASSES = ['Box Stock','Open Box Stock','B-Max','Open Class'];
const CLASS_COLORS: Record<string,string> = {'Box Stock':'#22C55E','Open Box Stock':'#3B82F6','B-Max':'#F97316','Open Class':'#DC2626'};
const CLASS_ICONS: Record<string,string> = {'Box Stock':'📦','Open Box Stock':'🔓','B-Max':'⚡','Open Class':'🔥'};
// Must match the public /blog page's filter tabs exactly (no "All" — that's a UI-only filter, not a real category).
const NEWS_CATEGORIES = ['Community','Racing','Guide','Event','News'];
const inp = (x?:any) => ({width:'100%',background:'#050505',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,padding:'11px 14px',color:'#F5F5F5',fontFamily:"'DM Sans',sans-serif",fontSize:14,outline:'none',boxSizing:'border-box' as const,...x});

function checkAuth(){if(typeof window==='undefined')return false;const s=localStorage.getItem('adminSession');if(!s)return false;try{const{expires}=JSON.parse(s);return Date.now()<expires;}catch{return false;}}
function saveAuth(){localStorage.setItem('adminSession',JSON.stringify({expires:Date.now()+8*60*60*1000}));}

function LoginScreen({title,onLogin}:{title:string;onLogin:()=>void}){
  const [pw,setPw]=useState('');const [error,setError]=useState(false);
  const login=()=>{if(pw===ADMIN_PASSWORD){saveAuth();onLogin();}else setError(true);};
  return(<div style={{minHeight:'100vh',background:'#050505',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}><div style={{width:'100%',maxWidth:380}}><div style={{textAlign:'center',marginBottom:28}}><a href="/admin" style={{textDecoration:'none'}}><div style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:48,height:48,background:'#DC2626',borderRadius:12,...F,fontWeight:900,fontSize:20,color:'#fff',marginBottom:12}}>4W</div></a><div style={{...F,fontWeight:900,fontSize:22,color:'#F5F5F5',letterSpacing:2}}>ADMIN ACCESS</div><div style={{...FB,fontSize:12,color:'#6B7280',marginTop:4}}>{title}</div></div><div style={{background:'#071426',border:'1px solid rgba(255,255,255,0.08)',borderRadius:18,padding:'28px 24px'}}><input type="password" value={pw} onChange={e=>{setPw(e.target.value);setError(false);}} onKeyDown={e=>e.key==='Enter'&&login()} placeholder="Admin password" autoFocus style={{width:'100%',background:'#050505',border:`1px solid ${error?'#DC2626':'rgba(255,255,255,0.1)'}`,borderRadius:10,padding:'13px 16px',color:'#F5F5F5',...FB,fontSize:14,outline:'none',boxSizing:'border-box',marginBottom:error?8:16}}/>{error&&<div style={{...FB,fontSize:13,color:'#DC2626',marginBottom:12}}>⚠ Incorrect password.</div>}<button onClick={login} style={{width:'100%',background:'#DC2626',color:'#fff',border:'none',borderRadius:10,padding:'13px',...F,fontWeight:900,fontSize:17,letterSpacing:2,cursor:'pointer'}}>LOGIN →</button><div style={{textAlign:'center',marginTop:12}}><a href="/admin" style={{...FB,fontSize:12,color:'#6B7280',textDecoration:'none'}}>← Dashboard</a></div></div></div></div>);
}

export default function AdminTournamentsPage() {
  const [authed,setAuthed]=useState(false);const [checked,setChecked]=useState(false);
  const [tournaments,setTournaments]=useState<any[]>([]);const [editing,setEditing]=useState<any>(null);const [saving,setSaving]=useState(false);
  const imageFileRef = useRef<HTMLInputElement>(null);
  const EMPTY={name:'',date:'',location:'Nuuk Community Hall',race_categories:['Box Stock'],ticket_type:'weekly',ticket_price_dkk:150,max_participants:16,status:'upcoming',description:'',image_url:'',auto_publish_news:true,news_category:'Event'};

  useEffect(()=>{const ok=checkAuth();setAuthed(ok);setChecked(true);if(ok)loadData();},[]);
  const loadData=async()=>{const{data}=await supabase.from('tournaments').select('*').order('date',{ascending:true});setTournaments(data||[]);};

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const r = new FileReader();
    r.onloadend = () => setEditing((prev: any) => ({ ...prev, image_url: r.result as string }));
    r.readAsDataURL(file);
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    const { auto_publish_news, news_category, ...tournamentFields } = editing;
    let tournamentId = editing.id;
    let err: any = null;

    if (tournamentId) {
      const { error } = await supabase.from('tournaments').update(tournamentFields).eq('id', tournamentId);
      err = error;
    } else {
      const { data, error } = await supabase.from('tournaments').insert({ ...tournamentFields }).select().single();
      err = error;
      if (!error && data) tournamentId = data.id;
    }

    // Auto-publish/sync the matching News & Updates post for this race event.
    if (!err && auto_publish_news && tournamentId) {
      const { data: existingPost } = await supabase.from('news_posts').select('id').eq('tournament_id', tournamentId).maybeSingle();
      const dateLabel = tournamentFields.date ? new Date(tournamentFields.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
      const postPayload: any = {
        title: tournamentFields.name,
        summary: `${tournamentFields.name}${dateLabel ? ` — ${dateLabel}` : ''}${tournamentFields.location ? ` at ${tournamentFields.location}` : ''}.`,
        body: tournamentFields.description || `Race categories: ${(tournamentFields.race_categories || []).join(', ') || 'TBA'}. Ticket: ${tournamentFields.ticket_price_dkk} DKK.`,
        image_url: tournamentFields.image_url || '',
        category: news_category || 'Event',
        published: true,
        tournament_id: tournamentId,
      };
      if (existingPost) {
        await supabase.from('news_posts').update(postPayload).eq('id', existingPost.id);
      } else {
        await supabase.from('news_posts').insert({ ...postPayload, created_at: new Date().toISOString() });
      }
    }

    await loadData();
    setEditing(null);
    setSaving(false);
  };

  const del=async(id:string)=>{if(!confirm('Delete?'))return;await supabase.from('tournaments').delete().eq('id',id);await loadData();};
  const qs=async(id:string,status:string)=>{await supabase.from('tournaments').update({status}).eq('id',id);await loadData();};

  const openEdit = async (t: any) => {
    let d = t.date || '';
    if (d && d.length > 16) d = d.slice(0, 16);
    let newsCategory = 'Event';
    const { data: linkedPost } = await supabase.from('news_posts').select('category').eq('tournament_id', t.id).maybeSingle();
    if (linkedPost?.category) newsCategory = linkedPost.category;
    setEditing({ ...EMPTY, ...t, date: d, race_categories: t.race_categories || ['Box Stock'], auto_publish_news: true, news_category: newsCategory });
  };

  const toggleCategory = (cat: string) => {
    const current: string[] = editing.race_categories || [];
    const next = current.includes(cat) ? current.filter((c:string) => c !== cat) : [...current, cat];
    setEditing({...editing, race_categories: next});
  };

  if(!checked)return null;
  if(!authed)return<LoginScreen title="Manage Tournaments" onLogin={()=>{setAuthed(true);loadData();}}/>;

  return(
    <div style={{minHeight:'100vh',background:'#050505',color:'#F5F5F5'}}>
      <div style={{background:'#071426',borderBottom:'1px solid rgba(255,255,255,0.06)',padding:'0 20px',height:56,display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:50}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <a href="/admin" style={{textDecoration:'none'}}><div style={{width:28,height:28,background:'#DC2626',borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',...F,fontWeight:900,fontSize:12,color:'#fff'}}>4W</div></a>
          <div style={{...F,fontWeight:900,fontSize:18,color:'#F5F5F5',letterSpacing:1}}>MANAGE TOURNAMENTS</div>
        </div>
        <a href="/admin" style={{...FB,fontSize:12,color:'#B8C1CC',textDecoration:'none',border:'1px solid rgba(255,255,255,0.08)',borderRadius:6,padding:'6px 12px'}}>← Dashboard</a>
      </div>
      <div style={{maxWidth:900,margin:'0 auto',padding:'24px 20px'}}>
        <button onClick={()=>setEditing({...EMPTY})} style={{background:'#DC2626',color:'#fff',border:'none',borderRadius:8,padding:'10px 20px',...F,fontWeight:700,fontSize:15,letterSpacing:1,cursor:'pointer',marginBottom:20}}>+ NEW TOURNAMENT</button>
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          {tournaments.map(t=>{
            const c=SC[t.status]||'#6B7280';
            const cats: string[] = t.race_categories || [];
            return(
              <div key={t.id} style={{background:'#071426',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14,overflow:'hidden'}}>
                {t.image_url && (
                  <div style={{ height: 120, overflow: 'hidden' }}>
                    <img src={t.image_url} alt={t.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                )}
                <div style={{padding:'20px'}}>
                <div style={{display:'flex',justifyContent:'space-between',gap:12,flexWrap:'wrap',marginBottom:12}}>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6,flexWrap:'wrap'}}>
                      <span style={{...F,fontSize:10,letterSpacing:2,padding:'2px 10px',borderRadius:20,background:c+'22',color:c}}>● {t.status.toUpperCase()}</span>
                      {cats.map((cat:string) => (
                        <span key={cat} style={{...F,fontSize:9,letterSpacing:1,padding:'2px 8px',borderRadius:20,background:(CLASS_COLORS[cat]||'#6B7280')+'22',color:CLASS_COLORS[cat]||'#6B7280',border:`1px solid ${CLASS_COLORS[cat]||'#6B7280'}44`}}>{CLASS_ICONS[cat]?CLASS_ICONS[cat]+' ':''}{cat.toUpperCase()}</span>
                      ))}
                    </div>
                    <div style={{...F,fontWeight:900,fontSize:22,color:'#F5F5F5',marginBottom:4}}>{t.name}</div>
                    <div style={{...FB,fontSize:13,color:'#B8C1CC'}}>📅 {t.date?new Date(t.date).toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'long',year:'numeric'}):'—'} · 📍 {t.location}</div>
                    <div style={{display:'flex',gap:16,marginTop:8,flexWrap:'wrap'}}>
                      <div><span style={{...F,fontSize:10,letterSpacing:2,color:'#B8C1CC'}}>TICKET </span><span style={{...F,fontWeight:700,fontSize:14,color:'#FACC15'}}>{t.ticket_price_dkk} kr</span></div>
                      <div><span style={{...F,fontSize:10,letterSpacing:2,color:'#B8C1CC'}}>MAX </span><span style={{...F,fontWeight:700,fontSize:14,color:'#F5F5F5'}}>{t.max_participants}</span></div>
                      {t.ticket_type && <div><span style={{...F,fontSize:10,letterSpacing:2,color:'#B8C1CC'}}>TYPE </span><span style={{...F,fontWeight:700,fontSize:14,color:'#B8C1CC'}}>{t.ticket_type}</span></div>}
                    </div>
                    {t.description && <div style={{...FB,fontSize:12,color:'#6B7280',marginTop:8}}>{t.description}</div>}
                  </div>
                  <div style={{display:'flex',gap:6}}>
                    <button onClick={()=>openEdit(t)} style={{...F,fontSize:12,letterSpacing:1,padding:'8px 14px',borderRadius:6,background:'transparent',border:'1px solid rgba(255,255,255,0.15)',color:'#F5F5F5',cursor:'pointer'}}>EDIT</button>
                    <button onClick={()=>del(t.id)} style={{...F,fontSize:12,letterSpacing:1,padding:'8px 14px',borderRadius:6,background:'transparent',border:'1px solid rgba(220,38,38,0.3)',color:'#DC2626',cursor:'pointer'}}>DEL</button>
                  </div>
                </div>
                <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                  {STATUSES.map(s=><button key={s} onClick={()=>qs(t.id,s)} style={{...F,fontWeight:700,fontSize:11,letterSpacing:1,padding:'5px 12px',borderRadius:6,border:`1px solid ${SC[s]}55`,background:t.status===s?SC[s]+'22':'transparent',color:SC[s],cursor:'pointer'}}>{s.toUpperCase()}</button>)}
                </div>
                </div>
              </div>
            );
          })}
          {tournaments.length===0&&<div style={{textAlign:'center',padding:60,...FB,color:'#B8C1CC'}}>No tournaments yet.</div>}
        </div>
      </div>

      {editing&&(
        <div onClick={()=>setEditing(null)} style={{position:'fixed',inset:0,zIndex:50,background:'rgba(0,0,0,0.85)',display:'flex',alignItems:'flex-start',justifyContent:'center',padding:'20px 16px',overflowY:'auto'}}>
          <div onClick={e=>e.stopPropagation()} style={{background:'#071426',border:'1px solid rgba(255,255,255,0.1)',borderRadius:18,width:'100%',maxWidth:520,marginBottom:24}}>
            <div style={{padding:'18px 22px',borderBottom:'1px solid rgba(255,255,255,0.07)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div style={{...F,fontWeight:900,fontSize:20,color:'#F5F5F5'}}>{editing.id?'EDIT TOURNAMENT':'NEW TOURNAMENT'}</div>
              <button onClick={()=>setEditing(null)} style={{background:'none',border:'none',color:'#B8C1CC',fontSize:20,cursor:'pointer'}}>✕</button>
            </div>
            <div style={{padding:22,display:'flex',flexDirection:'column',gap:14}}>
              <div><label style={{...F,fontSize:11,letterSpacing:3,color:'#B8C1CC',display:'block',marginBottom:6}}>NAME</label><input value={editing.name} onChange={e=>setEditing({...editing,name:e.target.value})} style={inp()}/></div>
              <div><label style={{...F,fontSize:11,letterSpacing:3,color:'#B8C1CC',display:'block',marginBottom:6}}>DATE & TIME</label><input type="datetime-local" value={editing.date} onChange={e=>setEditing({...editing,date:e.target.value})} style={inp()}/></div>
              <div><label style={{...F,fontSize:11,letterSpacing:3,color:'#B8C1CC',display:'block',marginBottom:6}}>LOCATION</label><input value={editing.location} onChange={e=>setEditing({...editing,location:e.target.value})} style={inp()}/></div>

              <div>
                <label style={{...F,fontSize:11,letterSpacing:3,color:'#B8C1CC',display:'block',marginBottom:6}}>RACE TRACK / EVENT PHOTO</label>
                <div onClick={() => imageFileRef.current?.click()} style={{ border: '2px dashed rgba(255,255,255,0.12)', borderRadius: 10, padding: editing.image_url ? 10 : '28px 16px', textAlign: 'center', cursor: 'pointer', background: '#050505' }}>
                  {editing.image_url ? (
                    <img src={editing.image_url} alt="Event preview" style={{ maxHeight: 140, maxWidth: '100%', borderRadius: 8, margin: '0 auto', display: 'block' }} />
                  ) : (
                    <>
                      <div style={{ fontSize: 30, marginBottom: 6 }}>📷</div>
                      <div style={{ ...F, fontWeight: 700, fontSize: 14, color: '#F5F5F5' }}>Tap to upload a photo</div>
                      <div style={{ ...FB, fontSize: 11, color: '#6B7280', marginTop: 4 }}>JPG, PNG, HEIC</div>
                    </>
                  )}
                </div>
                <input ref={imageFileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageFile} />
                {editing.image_url && (
                  <button type="button" onClick={() => setEditing({ ...editing, image_url: '' })} style={{ ...FB, fontSize: 11, color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', marginTop: 6, padding: 0 }}>Remove photo</button>
                )}
              </div>

              <div>
                <label style={{...F,fontSize:11,letterSpacing:3,color:'#B8C1CC',display:'block',marginBottom:10}}>RACE CATEGORIES</label>
                <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                  {RACE_CLASSES.map(cat => {
                    const selected = (editing.race_categories||[]).includes(cat);
                    const color = CLASS_COLORS[cat]||'#6B7280';
                    return(
                      <button key={cat} onClick={()=>toggleCategory(cat)}
                        style={{...F,fontWeight:700,fontSize:12,letterSpacing:1,padding:'7px 14px',borderRadius:20,border:`1.5px solid ${selected?color:color+'44'}`,background:selected?color+'22':'transparent',color:selected?color:'rgba(255,255,255,0.3)',cursor:'pointer',transition:'all 0.15s'}}>
                        {cat}
                      </button>
                    );
                  })}
                </div>
                <div style={{...FB,fontSize:11,color:'#6B7280',marginTop:6}}>Selected: {(editing.race_categories||[]).join(', ') || 'none'}</div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div>
                  <label style={{...F,fontSize:11,letterSpacing:3,color:'#B8C1CC',display:'block',marginBottom:6}}>TICKET TYPE</label>
                  <select value={editing.ticket_type||'weekly'} onChange={e=>setEditing({...editing,ticket_type:e.target.value})} style={inp()}>
                    <option value="weekly_earlybird">Early Bird (130 DKK)</option>
                    <option value="weekly">Weekly (150 DKK)</option>
                    <option value="season">Season (500 DKK)</option>
                  </select>
                </div>
                <div><label style={{...F,fontSize:11,letterSpacing:3,color:'#B8C1CC',display:'block',marginBottom:6}}>TICKET (DKK)</label><input type="number" value={editing.ticket_price_dkk} onChange={e=>setEditing({...editing,ticket_price_dkk:Number(e.target.value)})} style={inp()}/></div>
              </div>
              <div><label style={{...F,fontSize:11,letterSpacing:3,color:'#B8C1CC',display:'block',marginBottom:6}}>MAX SPOTS</label><input type="number" value={editing.max_participants} onChange={e=>setEditing({...editing,max_participants:Number(e.target.value)})} style={inp()}/></div>
              <div><label style={{...F,fontSize:11,letterSpacing:3,color:'#B8C1CC',display:'block',marginBottom:6}}>DESCRIPTION (optional)</label><textarea value={editing.description||''} onChange={e=>setEditing({...editing,description:e.target.value})} rows={2} style={inp({resize:'vertical'})}/></div>
              <div><label style={{...F,fontSize:11,letterSpacing:3,color:'#B8C1CC',display:'block',marginBottom:6}}>STATUS</label><select value={editing.status} onChange={e=>setEditing({...editing,status:e.target.value})} style={inp()}>{STATUSES.map(s=><option key={s} value={s}>{s}</option>)}</select></div>

              <div style={{ background:'#050505', border:'1px solid rgba(255,255,255,0.06)', borderRadius:10, padding:14 }}>
                <div onClick={()=>setEditing({...editing, auto_publish_news: !editing.auto_publish_news})} style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', marginBottom: editing.auto_publish_news ? 14 : 0 }}>
                  <input type="checkbox" checked={!!editing.auto_publish_news} onChange={e=>setEditing({...editing, auto_publish_news: e.target.checked})} onClick={e=>e.stopPropagation()} style={{ width:18, height:18, cursor:'pointer', flexShrink:0 }} />
                  <div>
                    <div style={{ ...F, fontSize:13, color:'#FACC15', letterSpacing:1 }}>📰 ALSO PUBLISH TO NEWS & UPDATES</div>
                    <div style={{ ...FB, fontSize:11, color:'#6B7280', marginTop:2 }}>Auto-creates (or updates) a matching public post using this event's name, date, and photo.</div>
                  </div>
                </div>
                {editing.auto_publish_news && (
                  <div>
                    <label style={{...F,fontSize:11,letterSpacing:3,color:'#B8C1CC',display:'block',marginBottom:6}}>POST CATEGORY</label>
                    <select value={editing.news_category||'Event'} onChange={e=>setEditing({...editing,news_category:e.target.value})} style={inp()}>
                      {NEWS_CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                )}
              </div>

              <button onClick={save} disabled={saving} style={{background:'#DC2626',color:'#fff',border:'none',borderRadius:10,padding:'13px',...F,fontWeight:900,fontSize:17,letterSpacing:2,cursor:'pointer',opacity:saving?0.6:1}}>{saving?'SAVING...':'SAVE TOURNAMENT'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
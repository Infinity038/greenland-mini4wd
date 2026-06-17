'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const ADMIN_PASSWORD = 'mini4wd2026';
const F = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
const FB = { fontFamily: "'DM Sans', sans-serif" } as const;
const STATUS_COLORS: Record<string,string> = {'in stock':'#22C55E','preorder only':'#3B82F6','limited':'#FACC15','sold out':'#DC2626','coming soon':'#6B7280'};
const STATUSES = ['in stock','preorder only','limited','sold out','coming soon'];
const CHASSIS = ['AR','MA','VS','MS','FM-A','S2','Other'];
const TYPES = ['boxed','built','preorder'];
const inp = (x?: any) => ({ width:'100%', background:'#050505', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, padding:'11px 14px', color:'#F5F5F5', fontFamily:"'DM Sans',sans-serif", fontSize:14, outline:'none', boxSizing:'border-box' as const, ...x });

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

function ProductThumb({ url, size = 56 }: { url: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const first = url?.split(',')[0]?.trim();
  if (!first || failed) return (
    <div style={{ width: size, height: size, borderRadius: 8, background: '#050505', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span style={{ ...F, fontSize: 10, color: 'rgba(255,255,255,0.15)' }}>NO IMG</span>
    </div>
  );
  return <img src={first} alt="" onError={() => setFailed(true)} style={{ width: size, height: size, objectFit: 'contain', borderRadius: 8, background: '#050505', border: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }} />;
}

function LoginScreen({ title, onLogin }: { title: string; onLogin: () => void }) {
  const [pw, setPw] = useState(''); const [error, setError] = useState(false);
  const login = () => { if (pw === ADMIN_PASSWORD) { saveAuth(); onLogin(); } else setError(true); };
  return (
    <div style={{ minHeight:'100vh', background:'#050505', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ width:'100%', maxWidth:380 }}>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <a href="/admin" style={{ textDecoration:'none' }}><div style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:48, height:48, background:'#DC2626', borderRadius:12, ...F, fontWeight:900, fontSize:20, color:'#fff', marginBottom:12 }}>4W</div></a>
          <div style={{ ...F, fontWeight:900, fontSize:22, color:'#F5F5F5', letterSpacing:2 }}>ADMIN ACCESS</div>
          <div style={{ ...FB, fontSize:12, color:'#6B7280', marginTop:4 }}>{title}</div>
        </div>
        <div style={{ background:'#071426', border:'1px solid rgba(255,255,255,0.08)', borderRadius:18, padding:'28px 24px' }}>
          <input type="password" value={pw} onChange={e=>{setPw(e.target.value);setError(false);}} onKeyDown={e=>e.key==='Enter'&&login()} placeholder="Admin password" autoFocus
            style={{ width:'100%', background:'#050505', border:`1px solid ${error?'#DC2626':'rgba(255,255,255,0.1)'}`, borderRadius:10, padding:'13px 16px', color:'#F5F5F5', ...FB, fontSize:14, outline:'none', boxSizing:'border-box', marginBottom:error?8:16 }} />
          {error && <div style={{ ...FB, fontSize:13, color:'#DC2626', marginBottom:12 }}>⚠ Incorrect password.</div>}
          <button onClick={login} style={{ width:'100%', background:'#DC2626', color:'#fff', border:'none', borderRadius:10, padding:'13px', ...F, fontWeight:900, fontSize:17, letterSpacing:2, cursor:'pointer' }}>LOGIN →</button>
          <div style={{ textAlign:'center', marginTop:12 }}><a href="/admin" style={{ ...FB, fontSize:12, color:'#6B7280', textDecoration:'none' }}>← Dashboard</a></div>
        </div>
      </div>
    </div>
  );
}

export default function AdminProductsPage() {
  const [authed, setAuthed] = useState(false);
  const [checked, setChecked] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [imgPreviewFailed, setImgPreviewFailed] = useState(false);
  const EMPTY = { name:'', chassis:'AR', category:'kit', type:'boxed', price_dkk:0, stock_qty:0, status:'in stock', description:'', image_url:'', available:true };

  useEffect(() => { const ok = checkAuth(); setAuthed(ok); setChecked(true); if (ok) fetchProducts(); }, []);
  const fetchProducts = async () => { const { data } = await supabase.from('products').select('*').order('created_at',{ascending:false}); setProducts(data||[]); };
  const save = async () => {
    if (!editing) return; setSaving(true);
    if (editing.id) await supabase.from('products').update(editing).eq('id', editing.id);
    else await supabase.from('products').insert({...editing, created_at: new Date().toISOString()});
    await fetchProducts(); setEditing(null); setSaving(false);
  };
  const del = async (id:string) => { if(!confirm('Delete?'))return; await supabase.from('products').delete().eq('id',id); await fetchProducts(); };
  const quickStatus = async (p:any, status:string) => { await supabase.from('products').update({status}).eq('id',p.id); await fetchProducts(); };

  if (!checked) return null;
  if (!authed) return <LoginScreen title="Manage Products" onLogin={() => { setAuthed(true); fetchProducts(); }} />;

  const editPreviewUrl = editing?.image_url?.split(',')[0]?.trim();

  return (
    <div style={{ minHeight:'100vh', background:'#050505', color:'#F5F5F5' }}>
      <div style={{ background:'#071426', borderBottom:'1px solid rgba(255,255,255,0.06)', padding:'0 20px', height:56, display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:50 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <a href="/admin" style={{ textDecoration:'none' }}><div style={{ width:28, height:28, background:'#DC2626', borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center', ...F, fontWeight:900, fontSize:12, color:'#fff' }}>4W</div></a>
          <div style={{ ...F, fontWeight:900, fontSize:18, color:'#F5F5F5', letterSpacing:1 }}>MANAGE PRODUCTS</div>
        </div>
        <a href="/admin" style={{ ...FB, fontSize:12, color:'#B8C1CC', textDecoration:'none', border:'1px solid rgba(255,255,255,0.08)', borderRadius:6, padding:'6px 12px' }}>← Dashboard</a>
      </div>
      <div style={{ maxWidth:1000, margin:'0 auto', padding:'24px 20px' }}>
        <button onClick={() => { setEditing({...EMPTY}); setImgPreviewFailed(false); }} style={{ background:'#DC2626', color:'#fff', border:'none', borderRadius:8, padding:'10px 20px', ...F, fontWeight:700, fontSize:15, letterSpacing:1, cursor:'pointer', marginBottom:20 }}>+ ADD PRODUCT</button>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {products.map(p => {
            const sc = STATUS_COLORS[p.status]||'#6B7280';
            return (
              <div key={p.id} style={{ background:'#071426', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, padding:'16px 20px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
                  <div style={{ display:'flex', gap:14, flex:1, alignItems:'flex-start' }}>
                    <ProductThumb url={p.image_url} size={64} />
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', gap:6, marginBottom:6, flexWrap:'wrap' }}>
                        <span style={{ ...F, fontSize:10, letterSpacing:2, padding:'2px 8px', borderRadius:4, background:'rgba(255,255,255,0.06)', color:'#B8C1CC' }}>{p.chassis}</span>
                        <span style={{ ...F, fontSize:10, letterSpacing:2, padding:'2px 8px', borderRadius:4, background:sc+'18', color:sc }}>● {(p.status||'').toUpperCase()}</span>
                      </div>
                      <div style={{ ...F, fontWeight:900, fontSize:18, color:'#F5F5F5', marginBottom:2 }}>{p.name}</div>
                      <div style={{ ...FB, fontSize:12, color:'#B8C1CC', marginBottom:6, lineHeight:1.4 }}>{p.description?.slice(0,80)}{p.description?.length > 80 ? '...' : ''}</div>
                      <div style={{ display:'flex', gap:16 }}>
                        <div><span style={{ ...F, fontSize:10, letterSpacing:2, color:'#B8C1CC' }}>PRICE </span><span style={{ ...F, fontWeight:900, fontSize:16, color:'#FACC15' }}>{p.price_dkk} kr</span></div>
                        <div><span style={{ ...F, fontSize:10, letterSpacing:2, color:'#B8C1CC' }}>STOCK </span><span style={{ ...F, fontWeight:700, fontSize:16, color:p.stock_qty>0?'#22C55E':'#DC2626' }}>{p.stock_qty}</span></div>
                      </div>
                    </div>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    <select value={p.status} onChange={e=>quickStatus(p,e.target.value)} style={{ background:'#050505', border:'1px solid rgba(255,255,255,0.1)', borderRadius:6, padding:'7px 10px', color:'#F5F5F5', ...F, fontSize:12, cursor:'pointer', outline:'none' }}>
                      {STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
                    </select>
                    <div style={{ display:'flex', gap:6 }}>
                      <button onClick={()=>{ setEditing(p); setImgPreviewFailed(false); }} style={{ flex:1, ...F, fontSize:12, letterSpacing:1, padding:'7px 12px', borderRadius:6, background:'transparent', border:'1px solid rgba(255,255,255,0.15)', color:'#F5F5F5', cursor:'pointer' }}>EDIT</button>
                      <button onClick={()=>del(p.id)} style={{ flex:1, ...F, fontSize:12, letterSpacing:1, padding:'7px 12px', borderRadius:6, background:'transparent', border:'1px solid rgba(220,38,38,0.3)', color:'#DC2626', cursor:'pointer' }}>DEL</button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {products.length===0&&<div style={{ textAlign:'center', padding:60, ...FB, color:'#B8C1CC' }}>No products yet.</div>}
        </div>
      </div>

      {/* EDIT MODAL */}
      {editing && (
        <div onClick={()=>setEditing(null)} style={{ position:'fixed', inset:0, zIndex:50, background:'rgba(0,0,0,0.85)', display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'20px 16px', overflowY:'auto' }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:'#071426', border:'1px solid rgba(255,255,255,0.1)', borderRadius:18, width:'100%', maxWidth:520, marginBottom:24 }}>
            <div style={{ padding:'18px 22px', borderBottom:'1px solid rgba(255,255,255,0.07)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ ...F, fontWeight:900, fontSize:20, color:'#F5F5F5' }}>{editing.id?'EDIT PRODUCT':'ADD PRODUCT'}</div>
              <button onClick={()=>setEditing(null)} style={{ background:'none', border:'none', color:'#B8C1CC', fontSize:20, cursor:'pointer' }}>✕</button>
            </div>
            <div style={{ padding:22, display:'flex', flexDirection:'column', gap:14 }}>
              <div><label style={{ ...F, fontSize:11, letterSpacing:3, color:'#B8C1CC', display:'block', marginBottom:6 }}>NAME</label><input value={editing.name} onChange={e=>setEditing({...editing,name:e.target.value})} style={inp()} /></div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div><label style={{ ...F, fontSize:11, letterSpacing:3, color:'#B8C1CC', display:'block', marginBottom:6 }}>CHASSIS</label><select value={editing.chassis} onChange={e=>setEditing({...editing,chassis:e.target.value})} style={inp()}>{CHASSIS.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
                <div><label style={{ ...F, fontSize:11, letterSpacing:3, color:'#B8C1CC', display:'block', marginBottom:6 }}>TYPE</label><select value={editing.type} onChange={e=>setEditing({...editing,type:e.target.value})} style={inp()}>{TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
                <div><label style={{ ...F, fontSize:11, letterSpacing:3, color:'#B8C1CC', display:'block', marginBottom:6 }}>PRICE (DKK)</label><input type="number" value={editing.price_dkk} onChange={e=>setEditing({...editing,price_dkk:Number(e.target.value)})} style={inp()} /></div>
                <div><label style={{ ...F, fontSize:11, letterSpacing:3, color:'#B8C1CC', display:'block', marginBottom:6 }}>STOCK QTY</label><input type="number" value={editing.stock_qty} onChange={e=>setEditing({...editing,stock_qty:Number(e.target.value)})} style={inp()} /></div>
              </div>
              <div><label style={{ ...F, fontSize:11, letterSpacing:3, color:'#B8C1CC', display:'block', marginBottom:6 }}>STATUS</label><select value={editing.status} onChange={e=>setEditing({...editing,status:e.target.value})} style={inp()}>{STATUSES.map(s=><option key={s} value={s}>{s}</option>)}</select></div>
              <div><label style={{ ...F, fontSize:11, letterSpacing:3, color:'#B8C1CC', display:'block', marginBottom:6 }}>DESCRIPTION</label><textarea value={editing.description} onChange={e=>setEditing({...editing,description:e.target.value})} rows={3} style={inp({resize:'vertical'})} /></div>
              <div>
                <label style={{ ...F, fontSize:11, letterSpacing:3, color:'#B8C1CC', display:'block', marginBottom:6 }}>IMAGE URL(S)</label>
                <input value={editing.image_url} onChange={e=>{ setEditing({...editing,image_url:e.target.value}); setImgPreviewFailed(false); }} placeholder="https://... (separate multiple with commas)" style={inp()} />
                <div style={{ ...FB, fontSize:11, color:'#6B7280', marginTop:4 }}>Tip: paste multiple URLs separated by commas for slideshow</div>
                {/* Live preview */}
                {editPreviewUrl && !imgPreviewFailed && (
                  <div style={{ marginTop:12, background:'#050505', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, padding:12, display:'flex', alignItems:'center', justifyContent:'center', minHeight:120 }}>
                    <img src={editPreviewUrl} alt="preview" onError={()=>setImgPreviewFailed(true)}
                      style={{ maxHeight:120, maxWidth:'100%', objectFit:'contain', borderRadius:6 }} />
                  </div>
                )}
                {editPreviewUrl && imgPreviewFailed && (
                  <div style={{ marginTop:12, background:'rgba(220,38,38,0.08)', border:'1px solid rgba(220,38,38,0.2)', borderRadius:10, padding:10, ...FB, fontSize:12, color:'#FCA5A5' }}>
                    ⚠ Image URL failed to load. Check the URL is a direct image link (not a page URL).
                  </div>
                )}
              </div>
              <button onClick={save} disabled={saving} style={{ background:'#DC2626', color:'#fff', border:'none', borderRadius:10, padding:'13px', ...F, fontWeight:900, fontSize:17, letterSpacing:2, cursor:'pointer', opacity:saving?0.6:1 }}>{saving?'SAVING...':'SAVE PRODUCT'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
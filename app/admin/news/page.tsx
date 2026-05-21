'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

const ADMIN_PASSWORD = 'mini4wd2026';
const F = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
const FB = { fontFamily: "'DM Sans', sans-serif" } as const;
const CATEGORIES = ['race day', 'builds', 'community', 'AI promo', 'events'];
const inp = (extra?: any) => ({ width: '100%', background: '#050505', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '11px 14px', color: '#F5F5F5', fontFamily: "'DM Sans',sans-serif", fontSize: 14, outline: 'none', boxSizing: 'border-box' as const, ...extra });

const DEMO_ITEMS = [
  { id: '1', title: 'Arctic Sprint #1 Race Day', caption: 'Our first ever race event in Nuuk!', image_url: '/IMG_5374.png', category: 'race day' },
  { id: '2', title: 'AR Chassis Build', caption: 'Member build showcase', image_url: '/IMG_5375.png', category: 'builds' },
  { id: '3', title: 'Community Gathering', caption: 'First meetup at the community hall', image_url: '/IMG_5376.png', category: 'community' },
];

export default function AdminGalleryPage() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState('');
  const [items, setItems] = useState<any[]>(DEMO_ITEMS);
  const [editing, setEditing] = useState<any>(null);
  const [filter, setFilter] = useState('all');
  const [saving, setSaving] = useState(false);
  const [useDb, setUseDb] = useState(false);
  const [preview, setPreview] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const login = () => { if (pw === ADMIN_PASSWORD) { setAuthed(true); fetchItems(); } };

  const fetchItems = async () => {
    const { data, error } = await supabase.from('gallery_items').select('*').order('created_at', { ascending: false });
    if (!error && data) { setItems(data); setUseDb(true); }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file || !editing) return;
    const r = new FileReader();
    r.onloadend = () => { const url = r.result as string; setPreview(url); setEditing({ ...editing, image_url: url }); };
    r.readAsDataURL(file);
  };

  const save = async () => {
    if (!editing) return; setSaving(true);
    if (useDb) {
      if (editing.id && !DEMO_ITEMS.find(d => d.id === editing.id)) await supabase.from('gallery_items').update(editing).eq('id', editing.id);
      else await supabase.from('gallery_items').insert({ ...editing, created_at: new Date().toISOString() });
      await fetchItems();
    } else {
      if (editing.id) setItems(p => p.map(x => x.id === editing.id ? editing : x));
      else setItems(p => [{ ...editing, id: Date.now().toString() }, ...p]);
    }
    setEditing(null); setPreview(''); setSaving(false);
  };

  const del = async (id: string) => {
    if (!confirm('Delete?')) return;
    if (useDb) { await supabase.from('gallery_items').delete().eq('id', id); await fetchItems(); }
    else setItems(p => p.filter(x => x.id !== id));
  };

  const filtered = filter === 'all' ? items : items.filter(i => i.category === filter);

  if (!authed) return (
    <div style={{ minHeight: '100vh', background: '#050505', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, padding: '32px 28px', width: '100%', maxWidth: 380 }}>
        <div style={{ ...F, fontWeight: 900, fontSize: 24, color: '#F5F5F5', marginBottom: 24 }}>ADMIN ACCESS</div>
        <input type="password" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === 'Enter' && login()} placeholder="Password"
          style={{ width: '100%', background: '#050505', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '13px 16px', color: '#F5F5F5', ...FB, fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 14 }} />
        <button onClick={login} style={{ width: '100%', background: '#DC2626', color: '#fff', border: 'none', borderRadius: 10, padding: '13px', ...F, fontWeight: 900, fontSize: 17, letterSpacing: 2, cursor: 'pointer' }}>LOGIN →</button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#050505', color: '#F5F5F5' }}>
      <div style={{ background: '#071426', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 20px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <a href="/admin" style={{ textDecoration: 'none' }}><div style={{ width: 28, height: 28, background: '#DC2626', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', ...F, fontWeight: 900, fontSize: 12, color: '#fff' }}>4W</div></a>
          <div style={{ ...F, fontWeight: 900, fontSize: 18, color: '#F5F5F5', letterSpacing: 1 }}>MANAGE GALLERY</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => { setEditing({ title: '', caption: '', image_url: '', category: 'race day' }); setPreview(''); }} style={{ background: '#DC2626', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', ...F, fontWeight: 700, fontSize: 14, letterSpacing: 1, cursor: 'pointer' }}>+ ADD PHOTO</button>
          <a href="/admin" style={{ ...FB, fontSize: 12, color: '#B8C1CC', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '6px 12px' }}>← Dashboard</a>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 20px' }}>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 20, paddingBottom: 4 }}>
          {['all', ...CATEGORIES].map(c => (
            <button key={c} onClick={() => setFilter(c)} style={{ ...F, fontWeight: 700, fontSize: 11, letterSpacing: 1, padding: '7px 14px', borderRadius: 8, border: filter === c ? 'none' : '1px solid rgba(255,255,255,0.08)', background: filter === c ? '#DC2626' : '#071426', color: filter === c ? '#fff' : '#B8C1CC', cursor: 'pointer', whiteSpace: 'nowrap' as const, flexShrink: 0 }}>
              {c.toUpperCase()}
            </button>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
          {filtered.map(item => (
            <div key={item.id} style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ height: 150, background: '#050505', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
                {item.image_url
                  ? <img src={item.image_url} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: 36 }}>🖼️</span>
                }
                <span style={{ position: 'absolute', top: 8, left: 8, ...F, fontSize: 9, letterSpacing: 2, padding: '2px 8px', borderRadius: 4, background: 'rgba(0,0,0,0.7)', color: '#B8C1CC' }}>{item.category}</span>
              </div>
              <div style={{ padding: '12px 14px' }}>
                <div style={{ ...F, fontWeight: 700, fontSize: 15, color: '#F5F5F5', marginBottom: 3 }}>{item.title}</div>
                <div style={{ ...FB, fontSize: 12, color: '#B8C1CC', marginBottom: 10 }}>{item.caption}</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => { setEditing(item); setPreview(item.image_url); }} style={{ flex: 1, ...F, fontSize: 11, padding: '6px 0', borderRadius: 6, background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#F5F5F5', cursor: 'pointer' }}>EDIT</button>
                  <button onClick={() => del(item.id)} style={{ flex: 1, ...F, fontSize: 11, padding: '6px 0', borderRadius: 6, background: 'transparent', border: '1px solid rgba(220,38,38,0.3)', color: '#DC2626', cursor: 'pointer' }}>DEL</button>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 60, ...FB, color: '#B8C1CC' }}>No photos yet.</div>}
        </div>
      </div>

      {editing && (
        <div onClick={() => setEditing(null)} style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '20px 16px', overflowY: 'auto' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 18, width: '100%', maxWidth: 480, marginBottom: 24 }}>
            <div style={{ padding: '18px 22px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ ...F, fontWeight: 900, fontSize: 20, color: '#F5F5F5' }}>{editing.id ? 'EDIT PHOTO' : 'ADD PHOTO'}</div>
              <button onClick={() => setEditing(null)} style={{ background: 'none', border: 'none', color: '#B8C1CC', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div onClick={() => fileRef.current?.click()} style={{ height: 150, background: '#050505', border: '2px dashed rgba(255,255,255,0.1)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden' }}>
                {preview || editing.image_url
                  ? <img src={preview || editing.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ textAlign: 'center' }}><div style={{ fontSize: 28, marginBottom: 6 }}>📷</div><div style={{ ...F, fontSize: 13, color: '#B8C1CC' }}>TAP TO UPLOAD</div></div>
                }
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
              <div><label style={{ ...F, fontSize: 11, letterSpacing: 3, color: '#B8C1CC', display: 'block', marginBottom: 6 }}>OR IMAGE URL</label><input value={editing.image_url} onChange={e => { setEditing({ ...editing, image_url: e.target.value }); setPreview(''); }} placeholder="https://..." style={inp()} /></div>
              <div><label style={{ ...F, fontSize: 11, letterSpacing: 3, color: '#B8C1CC', display: 'block', marginBottom: 6 }}>TITLE</label><input value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} style={inp()} /></div>
              <div><label style={{ ...F, fontSize: 11, letterSpacing: 3, color: '#B8C1CC', display: 'block', marginBottom: 6 }}>CAPTION</label><input value={editing.caption} onChange={e => setEditing({ ...editing, caption: e.target.value })} style={inp()} /></div>
              <div><label style={{ ...F, fontSize: 11, letterSpacing: 3, color: '#B8C1CC', display: 'block', marginBottom: 6 }}>CATEGORY</label>
                <select value={editing.category} onChange={e => setEditing({ ...editing, category: e.target.value })} style={inp()}>{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
              <button onClick={save} disabled={saving} style={{ background: '#DC2626', color: '#fff', border: 'none', borderRadius: 10, padding: '13px', ...F, fontWeight: 900, fontSize: 17, letterSpacing: 2, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'SAVING...' : 'SAVE PHOTO'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
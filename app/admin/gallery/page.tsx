'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

const F = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
const FB = { fontFamily: "'DM Sans', sans-serif" } as const;

const CATEGORIES = ['race day', 'builds', 'community', 'AI promo', 'events'];

interface GalleryItem {
  id?: string;
  title: string;
  caption: string;
  image_url: string;
  category: string;
  created_at?: string;
}

const DEMO: GalleryItem[] = [
  { id: '1', title: 'Arctic Sprint #1 Race Day', caption: 'Our first ever race event in Nuuk!', image_url: '/IMG_5374.png', category: 'race day', created_at: new Date().toISOString() },
  { id: '2', title: 'AR Chassis Build', caption: 'Member build showcase — clean AR setup', image_url: '/IMG_5375.png', category: 'builds', created_at: new Date().toISOString() },
  { id: '3', title: 'Community Gathering', caption: 'First meetup at the community hall', image_url: '/IMG_5376.png', category: 'community', created_at: new Date().toISOString() },
];

const inp = (extra?: object) => ({ width: '100%', background: '#050505', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '12px 14px', color: '#F5F5F5', fontFamily: "'DM Sans', sans-serif", fontSize: 14, outline: 'none', boxSizing: 'border-box' as const, ...extra });

export default function AdminGalleryPage() {
  const [items, setItems] = useState<GalleryItem[]>(DEMO);
  const [editing, setEditing] = useState<GalleryItem | null>(null);
  const [filter, setFilter] = useState('all');
  const [saving, setSaving] = useState(false);
  const [useSupabase, setUseSupabase] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string>('');

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    const { data, error } = await supabase.from('gallery_items').select('*').order('created_at', { ascending: false });
    if (!error && data) { setItems(data); setUseSupabase(true); }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editing) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const url = reader.result as string;
      setPreview(url);
      setEditing({ ...editing, image_url: url });
    };
    reader.readAsDataURL(file);
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    if (useSupabase) {
      if (editing.id) await supabase.from('gallery_items').update(editing).eq('id', editing.id);
      else await supabase.from('gallery_items').insert({ ...editing, created_at: new Date().toISOString() });
      await fetchItems();
    } else {
      if (editing.id) setItems(prev => prev.map(i => i.id === editing.id ? editing : i));
      else setItems(prev => [{ ...editing, id: Date.now().toString(), created_at: new Date().toISOString() }, ...prev]);
    }
    setEditing(null); setPreview(''); setSaving(false);
  };

  const deleteItem = async (id: string) => {
    if (!confirm('Delete this item?')) return;
    if (useSupabase) { await supabase.from('gallery_items').delete().eq('id', id); await fetchItems(); }
    else setItems(prev => prev.filter(i => i.id !== id));
  };

  const filtered = filter === 'all' ? items : items.filter(i => i.category === filter);
  const EMPTY: GalleryItem = { title: '', caption: '', image_url: '', category: 'race day' };

  return (
    <div style={{ minHeight: '100vh', background: '#050505', color: '#F5F5F5' }}>
      <div style={{ background: '#071426', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ ...F, fontSize: 11, letterSpacing: 4, color: '#DC2626' }}>ADMIN</div>
          <div style={{ ...F, fontWeight: 900, fontSize: 24, color: '#F5F5F5' }}>MANAGE GALLERY</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => { setEditing({ ...EMPTY }); setPreview(''); }} style={{ background: '#DC2626', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', ...F, fontWeight: 700, fontSize: 15, letterSpacing: 1, cursor: 'pointer' }}>+ ADD PHOTO</button>
          <a href="/admin" style={{ ...FB, fontSize: 13, color: '#B8C1CC', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 16px' }}>← Dashboard</a>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
        {!useSupabase && (
          <div style={{ background: 'rgba(250,204,21,0.08)', border: '1px solid rgba(250,204,21,0.2)', borderRadius: 10, padding: '12px 16px', ...FB, fontSize: 13, color: '#FACC15', marginBottom: 24 }}>
            ⚠️ Using demo data. Create Supabase table: <code>gallery_items</code>
          </div>
        )}

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 24, paddingBottom: 4 }}>
          {['all', ...CATEGORIES].map(c => (
            <button key={c} onClick={() => setFilter(c)} style={{ ...F, fontWeight: 700, fontSize: 12, letterSpacing: 1, padding: '8px 16px', border: filter === c ? 'none' : '1px solid rgba(255,255,255,0.1)', borderRadius: 8, background: filter === c ? '#DC2626' : '#071426', color: filter === c ? '#fff' : '#B8C1CC', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
              {c.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Photo grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
          {filtered.map(item => (
            <div key={item.id} style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ height: 160, background: '#050505', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {item.image_url
                  ? <img src={item.image_url} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: 40 }}>🖼️</span>
                }
                <span style={{ position: 'absolute', top: 8, left: 8, ...F, fontSize: 10, letterSpacing: 2, padding: '3px 8px', borderRadius: 4, background: 'rgba(0,0,0,0.7)', color: '#B8C1CC' }}>{item.category}</span>
              </div>
              <div style={{ padding: 16 }}>
                <div style={{ ...F, fontWeight: 700, fontSize: 16, color: '#F5F5F5', marginBottom: 4 }}>{item.title}</div>
                <div style={{ ...FB, fontSize: 12, color: '#B8C1CC', marginBottom: 12 }}>{item.caption}</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => { setEditing(item); setPreview(item.image_url); }} style={{ flex: 1, ...F, fontSize: 12, letterSpacing: 1, padding: '7px 0', borderRadius: 6, background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#F5F5F5', cursor: 'pointer' }}>EDIT</button>
                  <button onClick={() => deleteItem(item.id!)} style={{ flex: 1, ...F, fontSize: 12, letterSpacing: 1, padding: '7px 0', borderRadius: 6, background: 'transparent', border: '1px solid rgba(220,38,38,0.3)', color: '#DC2626', cursor: 'pointer' }}>DELETE</button>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 60, ...FB, color: '#B8C1CC' }}>No photos in this category yet.</div>
          )}
        </div>
      </div>

      {/* Edit modal */}
      {editing && (
        <div onClick={() => setEditing(null)} style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px', overflowY: 'auto' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, width: '100%', maxWidth: 520, marginBottom: 24 }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ ...F, fontWeight: 900, fontSize: 22, color: '#F5F5F5', margin: 0 }}>{editing.id ? 'EDIT PHOTO' : 'ADD PHOTO'}</h2>
              <button onClick={() => setEditing(null)} style={{ background: 'none', border: 'none', color: '#B8C1CC', fontSize: 22, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Image upload */}
              <div onClick={() => fileRef.current?.click()} style={{ height: 160, background: '#050505', border: '2px dashed rgba(255,255,255,0.1)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden' }}>
                {preview || editing.image_url
                  ? <img src={preview || editing.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ textAlign: 'center' }}><div style={{ fontSize: 32, marginBottom: 8 }}>📷</div><div style={{ ...F, fontSize: 13, color: '#B8C1CC' }}>TAP TO UPLOAD PHOTO</div></div>
                }
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
              <div>
                <label style={{ ...F, fontSize: 11, letterSpacing: 3, color: '#B8C1CC', display: 'block', marginBottom: 6 }}>OR IMAGE URL</label>
                <input value={editing.image_url} onChange={e => { setEditing({ ...editing, image_url: e.target.value }); setPreview(''); }} placeholder="https://..." style={inp()} />
              </div>
              <div>
                <label style={{ ...F, fontSize: 11, letterSpacing: 3, color: '#B8C1CC', display: 'block', marginBottom: 6 }}>TITLE</label>
                <input value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} style={inp()} />
              </div>
              <div>
                <label style={{ ...F, fontSize: 11, letterSpacing: 3, color: '#B8C1CC', display: 'block', marginBottom: 6 }}>CAPTION</label>
                <input value={editing.caption} onChange={e => setEditing({ ...editing, caption: e.target.value })} style={inp()} />
              </div>
              <div>
                <label style={{ ...F, fontSize: 11, letterSpacing: 3, color: '#B8C1CC', display: 'block', marginBottom: 6 }}>CATEGORY</label>
                <select value={editing.category} onChange={e => setEditing({ ...editing, category: e.target.value })} style={inp()}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <button onClick={save} disabled={saving} style={{ background: '#DC2626', color: '#fff', border: 'none', borderRadius: 10, padding: '14px 24px', ...F, fontWeight: 900, fontSize: 18, letterSpacing: 2, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'SAVING...' : 'SAVE PHOTO'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
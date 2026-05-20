'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const F = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
const FB = { fontFamily: "'DM Sans', sans-serif" } as const;

const CATEGORIES = ['announcement', 'race recap', 'community', 'tips & tricks', 'event'];

interface NewsPost {
  id?: string;
  title: string;
  summary: string;
  body: string;
  image_url: string;
  category: string;
  published: boolean;
  created_at?: string;
}

const EMPTY: NewsPost = { title: '', summary: '', body: '', image_url: '', category: 'announcement', published: false };

// Demo data fallback
const DEMO: NewsPost[] = [
  { id: '1', title: 'Welcome to Greenland Mini 4WD Club', summary: 'The first Tamiya Mini 4WD community in Greenland is officially open!', body: 'Full article body here...', image_url: '', category: 'announcement', published: true, created_at: new Date().toISOString() },
  { id: '2', title: 'What is Box Stock Racing?', summary: 'Everything you need to know about box stock rules and why we love it.', body: 'Full article body here...', image_url: '', category: 'tips & tricks', published: true, created_at: new Date().toISOString() },
];

const inp = (extra?: object) => ({ width: '100%', background: '#050505', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '12px 14px', color: '#F5F5F5', ...FB, fontSize: 14, outline: 'none', boxSizing: 'border-box' as const, ...extra });

export default function AdminNewsPage() {
  const [posts, setPosts] = useState<NewsPost[]>(DEMO);
  const [editing, setEditing] = useState<NewsPost | null>(null);
  const [saving, setSaving] = useState(false);
  const [useSupabase, setUseSupabase] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    const { data, error } = await supabase.from('news_posts').select('*').order('created_at', { ascending: false });
    if (!error && data && data.length >= 0) { setPosts(data); setUseSupabase(true); }
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    if (useSupabase) {
      if (editing.id) {
        await supabase.from('news_posts').update(editing).eq('id', editing.id);
      } else {
        await supabase.from('news_posts').insert({ ...editing, created_at: new Date().toISOString() });
      }
      await fetchPosts();
    } else {
      if (editing.id) {
        setPosts(prev => prev.map(p => p.id === editing.id ? editing : p));
      } else {
        setPosts(prev => [{ ...editing, id: Date.now().toString(), created_at: new Date().toISOString() }, ...prev]);
      }
    }
    setEditing(null);
    setSaving(false);
  };

  const deletePost = async (id: string) => {
    if (!confirm('Delete this post?')) return;
    if (useSupabase) { await supabase.from('news_posts').delete().eq('id', id); await fetchPosts(); }
    else setPosts(prev => prev.filter(p => p.id !== id));
  };

  const togglePublish = async (post: NewsPost) => {
    const updated = { ...post, published: !post.published };
    if (useSupabase) { await supabase.from('news_posts').update({ published: updated.published }).eq('id', post.id!); await fetchPosts(); }
    else setPosts(prev => prev.map(p => p.id === post.id ? updated : p));
  };

  return (
    <div style={{ minHeight: '100vh', background: '#050505', color: '#F5F5F5' }}>
      {/* Top bar */}
      <div style={{ background: '#071426', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ ...F, fontSize: 11, letterSpacing: 4, color: '#DC2626' }}>ADMIN</div>
          <div style={{ ...F, fontWeight: 900, fontSize: 24, color: '#F5F5F5' }}>MANAGE NEWS</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setEditing({ ...EMPTY })} style={{ background: '#DC2626', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', ...F, fontWeight: 700, fontSize: 15, letterSpacing: 1, cursor: 'pointer' }}>+ NEW POST</button>
          <a href="/admin" style={{ ...FB, fontSize: 13, color: '#B8C1CC', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 16px' }}>← Dashboard</a>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
        {!useSupabase && (
          <div style={{ background: 'rgba(250,204,21,0.08)', border: '1px solid rgba(250,204,21,0.2)', borderRadius: 10, padding: '12px 16px', ...FB, fontSize: 13, color: '#FACC15', marginBottom: 24 }}>
            ⚠️ Using demo data. Run Supabase schema to enable persistent storage. Create table: <code>news_posts</code>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {posts.map(post => (
            <div key={post.id} style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                    <span style={{ ...F, fontSize: 11, letterSpacing: 2, padding: '3px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.06)', color: '#B8C1CC' }}>{post.category}</span>
                    <span style={{ ...F, fontSize: 11, letterSpacing: 2, padding: '3px 8px', borderRadius: 4, background: post.published ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)', color: post.published ? '#22C55E' : '#6B7280' }}>
                      {post.published ? '● PUBLISHED' : '○ DRAFT'}
                    </span>
                  </div>
                  <div style={{ ...F, fontWeight: 900, fontSize: 20, color: '#F5F5F5', marginBottom: 4 }}>{post.title}</div>
                  <div style={{ ...FB, fontSize: 13, color: '#B8C1CC' }}>{post.summary}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button onClick={() => togglePublish(post)} style={{ ...F, fontSize: 12, letterSpacing: 1, padding: '7px 14px', borderRadius: 6, background: 'transparent', border: `1px solid ${post.published ? '#6B7280' : '#22C55E'}`, color: post.published ? '#6B7280' : '#22C55E', cursor: 'pointer' }}>
                    {post.published ? 'UNPUBLISH' : 'PUBLISH'}
                  </button>
                  <button onClick={() => setEditing(post)} style={{ ...F, fontSize: 12, letterSpacing: 1, padding: '7px 14px', borderRadius: 6, background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#F5F5F5', cursor: 'pointer' }}>EDIT</button>
                  <button onClick={() => deletePost(post.id!)} style={{ ...F, fontSize: 12, letterSpacing: 1, padding: '7px 14px', borderRadius: 6, background: 'transparent', border: '1px solid rgba(220,38,38,0.3)', color: '#DC2626', cursor: 'pointer' }}>DELETE</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit modal */}
      {editing && (
        <div onClick={() => setEditing(null)} style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px', overflowY: 'auto' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, width: '100%', maxWidth: 640, marginBottom: 24 }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ ...F, fontWeight: 900, fontSize: 22, color: '#F5F5F5', margin: 0 }}>{editing.id ? 'EDIT POST' : 'NEW POST'}</h2>
              <button onClick={() => setEditing(null)} style={{ background: 'none', border: 'none', color: '#B8C1CC', fontSize: 22, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ ...F, fontSize: 11, letterSpacing: 3, color: '#B8C1CC', display: 'block', marginBottom: 6 }}>TITLE</label>
                <input value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} style={inp()} />
              </div>
              <div>
                <label style={{ ...F, fontSize: 11, letterSpacing: 3, color: '#B8C1CC', display: 'block', marginBottom: 6 }}>SUMMARY</label>
                <input value={editing.summary} onChange={e => setEditing({ ...editing, summary: e.target.value })} style={inp()} />
              </div>
              <div>
                <label style={{ ...F, fontSize: 11, letterSpacing: 3, color: '#B8C1CC', display: 'block', marginBottom: 6 }}>BODY</label>
                <textarea value={editing.body} onChange={e => setEditing({ ...editing, body: e.target.value })} rows={6} style={inp({ resize: 'vertical' })} />
              </div>
              <div>
                <label style={{ ...F, fontSize: 11, letterSpacing: 3, color: '#B8C1CC', display: 'block', marginBottom: 6 }}>IMAGE URL</label>
                <input value={editing.image_url} onChange={e => setEditing({ ...editing, image_url: e.target.value })} placeholder="https://..." style={inp()} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ ...F, fontSize: 11, letterSpacing: 3, color: '#B8C1CC', display: 'block', marginBottom: 6 }}>CATEGORY</label>
                  <select value={editing.category} onChange={e => setEditing({ ...editing, category: e.target.value })} style={inp()}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 24 }}>
                  <input type="checkbox" id="pub" checked={editing.published} onChange={e => setEditing({ ...editing, published: e.target.checked })} style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#DC2626' }} />
                  <label htmlFor="pub" style={{ ...FB, fontSize: 14, color: '#F5F5F5', cursor: 'pointer' }}>Published</label>
                </div>
              </div>
              <button onClick={save} disabled={saving} style={{ background: '#DC2626', color: '#fff', border: 'none', borderRadius: 10, padding: '14px 24px', ...F, fontWeight: 900, fontSize: 18, letterSpacing: 2, cursor: 'pointer', opacity: saving ? 0.6 : 1, marginTop: 8 }}>
                {saving ? 'SAVING...' : 'SAVE POST'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
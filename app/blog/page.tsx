'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Post {
  id: string;
  title: string;
  summary: string;
  body: string;
  image_url: string;
  category: string;
  published: boolean;
  created_at: string;
}

const CATEGORIES = ['All', 'Community', 'Racing', 'Guide', 'Event', 'News'];

export default function BlogPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [selected, setSelected] = useState<Post | null>(null);
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchPosts(); }, []);

  async function fetchPosts() {
    setLoading(true);
    const { data } = await supabase
      .from('news_posts')
      .select('*')
      .eq('published', true)
      .order('created_at', { ascending: false });
    setPosts(data || []);
    setLoading(false);
  }

  const filtered = filter === 'All' ? posts : posts.filter(p => p.category === filter);

  const s: Record<string, any> = {
    page: { background: '#050505', minHeight: '100vh', color: '#F5F5F5', fontFamily: "'DM Sans', sans-serif" },
    hero: { background: 'linear-gradient(135deg, #071426 0%, #050505 100%)', borderBottom: '1px solid rgba(220,38,38,0.2)', padding: '64px 24px 40px' },
    heroInner: { maxWidth: '900px', margin: '0 auto' },
    eyebrow: { fontSize: '11px', letterSpacing: '4px', color: '#DC2626', textTransform: 'uppercase' as const, marginBottom: '8px', fontFamily: "'Barlow Condensed', sans-serif" },
    title: { fontSize: '48px', fontWeight: 900, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '2px', lineHeight: 1, marginBottom: '8px' },
    sub: { color: '#B8C1CC', fontSize: '15px' },
    filters: { display: 'flex', gap: '8px', flexWrap: 'wrap' as const, marginTop: '28px' },
    filterBtn: (active: boolean) => ({
      padding: '7px 18px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
      letterSpacing: '1px', cursor: 'pointer', border: 'none',
      background: active ? '#DC2626' : 'rgba(255,255,255,0.06)',
      color: active ? '#fff' : '#B8C1CC',
      fontFamily: "'Barlow Condensed', sans-serif",
    }),
    body: { maxWidth: '900px', margin: '0 auto', padding: '40px 24px' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' },
    card: { background: '#071426', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', overflow: 'hidden', cursor: 'pointer', transition: 'border-color 0.2s' },
    cardImg: { width: '100%', height: '180px', objectFit: 'cover' as const, display: 'block', background: '#0a0a0a' },
    cardBody: { padding: '18px' },
    cardCat: { fontSize: '10px', letterSpacing: '3px', color: '#DC2626', textTransform: 'uppercase' as const, marginBottom: '8px', fontFamily: "'Barlow Condensed', sans-serif" },
    cardTitle: { fontSize: '18px', fontWeight: 700, fontFamily: "'Barlow Condensed', sans-serif", marginBottom: '8px', lineHeight: 1.2 },
    cardSummary: { fontSize: '13px', color: '#B8C1CC', lineHeight: 1.6, marginBottom: '12px' },
    cardDate: { fontSize: '11px', color: '#4B5563' },
    empty: { textAlign: 'center' as const, padding: '80px 20px', color: '#4B5563' },
    overlay: { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 20px', overflowY: 'auto' as const },
    modal: { background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', maxWidth: '700px', width: '100%', overflow: 'hidden' },
    modalImg: { width: '100%', height: '280px', objectFit: 'cover' as const, display: 'block', background: '#0a0a0a' },
    modalBody: { padding: '28px' },
    modalCat: { fontSize: '11px', letterSpacing: '3px', color: '#DC2626', textTransform: 'uppercase' as const, marginBottom: '10px', fontFamily: "'Barlow Condensed', sans-serif" },
    modalTitle: { fontSize: '32px', fontWeight: 900, fontFamily: "'Barlow Condensed', sans-serif", marginBottom: '8px', lineHeight: 1.1 },
    modalDate: { fontSize: '12px', color: '#6B7280', marginBottom: '20px' },
    modalText: { fontSize: '15px', color: '#B8C1CC', lineHeight: 1.8, whiteSpace: 'pre-wrap' as const },
    closeBtn: { display: 'block', marginTop: '24px', padding: '10px 20px', background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '6px', color: '#B8C1CC', cursor: 'pointer', fontSize: '13px' },
  };

  return (
    <div style={s.page}>
      <Navbar />
      <div style={s.hero}>
        <div style={s.heroInner}>
          <div style={s.eyebrow}>Greenland Mini 4WD Club</div>
          <div style={s.title}>NEWS & UPDATES</div>
          <div style={s.sub}>Race reports, club updates, and community stories</div>
          <div style={s.filters}>
            {CATEGORIES.map(c => (
              <button key={c} style={s.filterBtn(filter === c)} onClick={() => setFilter(c)}>{c}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={s.body}>
        {loading ? (
          <div style={s.empty}>Loading posts...</div>
        ) : filtered.length === 0 ? (
          <div style={s.empty}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📰</div>
            <div>No posts yet. Check back soon.</div>
          </div>
        ) : (
          <div style={s.grid}>
            {filtered.map(post => (
              <div key={post.id} style={s.card}
                onClick={() => setSelected(post)}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(220,38,38,0.3)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'}>
                {post.image_url && <img src={post.image_url} alt={post.title} style={s.cardImg} />}
                <div style={s.cardBody}>
                  <div style={s.cardCat}>{post.category}</div>
                  <div style={s.cardTitle}>{post.title}</div>
                  <div style={s.cardSummary}>{post.summary}</div>
                  <div style={s.cardDate}>{new Date(post.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <div style={s.overlay} onClick={() => setSelected(null)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            {selected.image_url && <img src={selected.image_url} alt={selected.title} style={s.modalImg} />}
            <div style={s.modalBody}>
              <div style={s.modalCat}>{selected.category}</div>
              <div style={s.modalTitle}>{selected.title}</div>
              <div style={s.modalDate}>{new Date(selected.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
              <div style={s.modalText}>{selected.body || selected.summary}</div>
              <button style={s.closeBtn} onClick={() => setSelected(null)}>← Back to News</button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
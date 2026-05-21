'use client';
import { useEffect, useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { supabase } from '@/lib/supabase';

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

const DEMO_POSTS: Post[] = [
  {
    id: 'd1',
    title: 'Welcome to Greenland Mini 4WD Club',
    summary: 'The first Tamiya Mini 4WD community in Greenland is officially here. Here\'s how it all started.',
    body: '',
    image_url: '/IMG_5374.png',
    category: 'Community',
    published: true,
    created_at: '2026-04-01',
  },
  {
    id: 'd2',
    title: 'What Is Box Stock Racing?',
    summary: 'No mods, no tuning — just skill and strategy. Learn why box stock is the fairest and most exciting format.',
    body: '',
    image_url: '/IMG_5375.png',
    category: 'Racing',
    published: true,
    created_at: '2026-04-10',
  },
  {
    id: 'd3',
    title: 'Chassis Guide: Which Mini 4WD Is Right for You?',
    summary: 'From Super-II to MA, we break down every chassis and help beginners pick their first car.',
    body: '',
    image_url: '/IMG_5376.png',
    category: 'Guide',
    published: true,
    created_at: '2026-04-20',
  },
  {
    id: 'd4',
    title: 'The Arctic Hustle Story',
    summary: 'Why a Filipino entrepreneur brought Mini 4WD racing to the Arctic — and what it means for the community.',
    body: '',
    image_url: '/IMG_5377.png',
    category: 'Community',
    published: true,
    created_at: '2026-05-01',
  },
];

const CAT_COLORS: Record<string, string> = {
  Community: '#22C55E',
  Racing: '#DC2626',
  Guide: '#FACC15',
  News: '#3B82F6',
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function BlogPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [selected, setSelected] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('news_posts')
        .select('*')
        .eq('published', true)
        .order('created_at', { ascending: false });
      setPosts(data && data.length > 0 ? data : DEMO_POSTS);
      setLoading(false);
    }
    load();
  }, []);

  if (selected) {
    return (
      <>
        <Navbar />
        <main style={{ background: '#050505', color: '#F5F5F5', minHeight: '100vh', padding: '80px 24px 80px' }}>
          <div style={{ maxWidth: 720, margin: '0 auto' }}>
            <button
              onClick={() => setSelected(null)}
              style={{ background: 'none', border: 'none', color: '#DC2626', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 16, letterSpacing: 2, cursor: 'pointer', marginBottom: 32, padding: 0 }}
            >
              ← BACK TO BLOG
            </button>
            <div style={{
              display: 'inline-block',
              background: CAT_COLORS[selected.category] || '#DC2626',
              color: selected.category === 'Guide' ? '#000' : '#fff',
              fontSize: 10, fontWeight: 700, letterSpacing: 2,
              padding: '3px 10px', borderRadius: 4,
              fontFamily: "'Barlow Condensed', sans-serif",
              marginBottom: 16,
            }}>
              {selected.category?.toUpperCase()}
            </div>
            <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 'clamp(32px, 7vw, 56px)', fontWeight: 900, lineHeight: 1.1, margin: '0 0 12px' }}>
              {selected.title}
            </h1>
            <div style={{ color: '#B8C1CC', fontSize: 13, marginBottom: 32 }}>{formatDate(selected.created_at)}</div>
            {selected.image_url && (
              <img src={selected.image_url} alt={selected.title} style={{ width: '100%', borderRadius: 8, marginBottom: 32, objectFit: 'cover', maxHeight: 360 }} />
            )}
            <p style={{ color: '#B8C1CC', fontSize: 17, lineHeight: 1.8 }}>
              {selected.body || selected.summary}
            </p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main style={{ background: '#050505', color: '#F5F5F5', minHeight: '100vh' }}>

        {/* Header */}
        <section style={{ padding: '80px 24px 40px', textAlign: 'center' }}>
          <div style={{ fontSize: 12, letterSpacing: 4, color: '#DC2626', fontFamily: "'Barlow Condensed', sans-serif", marginBottom: 12 }}>
            NEWS & STORIES
          </div>
          <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 'clamp(48px, 10vw, 80px)', fontWeight: 900, lineHeight: 1, margin: '0 0 16px' }}>
            THE <span style={{ color: '#DC2626' }}>BLOG</span>
          </h1>
          <p style={{ color: '#B8C1CC', fontSize: 16, maxWidth: 480, margin: '0 auto' }}>
            Racing guides, community stories, and updates from the Arctic.
          </p>
        </section>

        {/* Posts Grid */}
        <section style={{ padding: '0 16px 80px', maxWidth: 1100, margin: '0 auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#B8C1CC' }}>Loading...</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
              {posts.map((post, i) => (
                <div
                  key={post.id}
                  onClick={() => setSelected(post)}
                  style={{
                    background: '#071426',
                    borderRadius: 10,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    border: '1px solid #1a2a3a',
                    transition: 'border-color 0.2s',
                  }}
                >
                  {post.image_url && (
                    <div style={{ aspectRatio: '16/9', overflow: 'hidden' }}>
                      <img src={post.image_url} alt={post.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    </div>
                  )}
                  <div style={{ padding: '20px 20px 24px' }}>
                    <div style={{
                      display: 'inline-block',
                      background: CAT_COLORS[post.category] || '#DC2626',
                      color: post.category === 'Guide' ? '#000' : '#fff',
                      fontSize: 10, fontWeight: 700, letterSpacing: 2,
                      padding: '2px 8px', borderRadius: 4,
                      fontFamily: "'Barlow Condensed', sans-serif",
                      marginBottom: 10,
                    }}>
                      {post.category?.toUpperCase()}
                    </div>
                    <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 22, fontWeight: 800, margin: '0 0 8px', lineHeight: 1.2 }}>
                      {post.title}
                    </h2>
                    <p style={{ color: '#B8C1CC', fontSize: 14, lineHeight: 1.6, margin: '0 0 16px' }}>
                      {post.summary}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#555', fontSize: 12 }}>{formatDate(post.created_at)}</span>
                      <span style={{ color: '#DC2626', fontSize: 13, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 1 }}>READ →</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
// app/gallery/page.tsx — full file replacement
// @ts-nocheck
'use client';
import { useEffect, useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { supabase } from '@/lib/supabase';

const F  = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
const FB = { fontFamily: "'DM Sans', sans-serif" } as const;
const CATS = ['race day', 'builds', 'community', 'AI promo', 'events'];

const PLACEHOLDERS = [
  { id: 'p1', title: 'Race Day',      caption: 'Photos coming soon', category: 'race day', image_url: null, emoji: '🏎️', bg: 'linear-gradient(135deg,#3b0000,#1a0000)' },
  { id: 'p2', title: 'Custom Builds', caption: 'Photos coming soon', category: 'builds',    image_url: null, emoji: '🔧', bg: 'linear-gradient(135deg,#001a3b,#00082b)' },
  { id: 'p3', title: 'Team Photo',    caption: 'Photos coming soon', category: 'community', image_url: null, emoji: '📸', bg: 'linear-gradient(135deg,#003b1a,#001a0a)' },
  { id: 'p4', title: 'Workshop',      caption: 'Photos coming soon', category: 'builds',    image_url: null, emoji: '🛠️', bg: 'linear-gradient(135deg,#3b2e00,#1a1500)' },
  { id: 'p5', title: 'Track Setup',   caption: 'Photos coming soon', category: 'events',    image_url: null, emoji: '🏁', bg: 'linear-gradient(135deg,#1a003b,#0a001a)' },
  { id: 'p6', title: 'Awards Night',  caption: 'Photos coming soon', category: 'events',    image_url: null, emoji: '🏆', bg: 'linear-gradient(135deg,#003b3b,#001a1a)' },
];

export default function GalleryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const [lightbox, setLightbox] = useState<any>(null);

  useEffect(() => {
    supabase.from('gallery_items').select('*').order('created_at', { ascending: false })
      .then(({ data }: { data: any[] | null }) => setItems(data || []));
  }, []);

  const display  = items.length > 0 ? items : PLACEHOLDERS;
  const filtered = filter === 'all' ? display : display.filter(i => i.category === filter);

  return (
    <>
      <Navbar />
      <main style={{ background: '#050505', color: '#F5F5F5', paddingTop: 60 }}>

        <section style={{ background: 'linear-gradient(180deg, #071426 0%, #050505 100%)', borderBottom: '1px solid rgba(220,38,38,0.2)', padding: '64px 24px 48px', textAlign: 'center' }}>
          <div style={{ ...F, fontSize: 11, letterSpacing: 5, color: '#DC2626', marginBottom: 12 }}>COMMUNITY</div>
          <h1 style={{ ...F, fontWeight: 900, fontSize: 'clamp(40px, 9vw, 80px)', lineHeight: 0.95, margin: '0 0 16px' }}>PHOTO GALLERY</h1>
          <p style={{ ...FB, fontSize: 16, color: '#B8C1CC', maxWidth: 520, margin: '0 auto' }}>Race day, builds, and everything in between. Race. Connect. Build.</p>
        </section>

        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px 80px' }}>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 28, paddingBottom: 4 }}>
            {['all', ...CATS].map(c => (
              <button key={c} onClick={() => setFilter(c)}
                style={{ ...F, fontWeight: 700, fontSize: 11, letterSpacing: 1, padding: '8px 16px', borderRadius: 8, border: filter === c ? 'none' : '1px solid rgba(255,255,255,0.1)', background: filter === c ? '#DC2626' : '#071426', color: filter === c ? '#fff' : '#B8C1CC', cursor: 'pointer', whiteSpace: 'nowrap' as const, flexShrink: 0 }}>
                {c.toUpperCase()}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', ...FB, color: '#6B7280' }}>No photos in this category yet.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
              {filtered.map(item => (
                <div key={item.id} onClick={() => setLightbox(item)}
                  style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden', cursor: 'pointer' }}>
                  <div style={{ height: 200, background: item.image_url ? '#050505' : (item.bg || '#0a0f1a'), display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
                    {item.image_url
                      ? <img src={item.image_url} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ fontSize: 40 }}>{item.emoji || '🖼️'}</span>}
                    <span style={{ position: 'absolute', top: 10, left: 10, ...F, fontSize: 9, letterSpacing: 2, padding: '3px 9px', borderRadius: 20, background: 'rgba(0,0,0,0.7)', color: '#FACC15' }}>{(item.category || '').toUpperCase()}</span>
                  </div>
                  <div style={{ padding: '14px 16px' }}>
                    <div style={{ ...F, fontWeight: 700, fontSize: 16, color: '#F5F5F5', marginBottom: 4 }}>{item.title}</div>
                    {item.caption && <div style={{ ...FB, fontSize: 13, color: '#B8C1CC' }}>{item.caption}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {lightbox && (
          <div onClick={() => setLightbox(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div style={{ maxWidth: 720, width: '100%' }} onClick={e => e.stopPropagation()}>
              <div style={{ background: lightbox.image_url ? '#050505' : (lightbox.bg || '#0a0f1a'), borderRadius: 14, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 280 }}>
                {lightbox.image_url
                  ? <img src={lightbox.image_url} alt={lightbox.title} style={{ width: '100%', maxHeight: '70vh', objectFit: 'contain' }} />
                  : <span style={{ fontSize: 64 }}>{lightbox.emoji || '🖼️'}</span>}
              </div>
              <div style={{ marginTop: 16, textAlign: 'center' }}>
                <div style={{ ...F, fontWeight: 900, fontSize: 22, color: '#F5F5F5' }}>{lightbox.title}</div>
                {lightbox.caption && <div style={{ ...FB, fontSize: 14, color: '#B8C1CC', marginTop: 6 }}>{lightbox.caption}</div>}
                <button onClick={() => setLightbox(null)} style={{ marginTop: 20, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '10px 24px', ...F, fontWeight: 700, fontSize: 13, letterSpacing: 2, color: '#F5F5F5', cursor: 'pointer' }}>CLOSE ✕</button>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
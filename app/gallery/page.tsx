'use client';
import { useEffect, useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { supabase } from '@/lib/supabase';

interface GalleryItem {
  id: string;
  title: string;
  caption: string;
  image_url: string;
  category: string;
}

const LOCAL_IMAGES: GalleryItem[] = [
  { id: 'l1', title: 'Race Day', caption: 'First race session in Nuuk', image_url: '/IMG_5374.png', category: 'Race Day' },
  { id: 'l2', title: 'Race Day', caption: 'Cars lined up at the start', image_url: '/IMG_5375.png', category: 'Race Day' },
  { id: 'l3', title: 'Community', caption: 'Club members gathering', image_url: '/IMG_5376.png', category: 'Community' },
  { id: 'l4', title: 'Builds', caption: 'Custom chassis build', image_url: '/IMG_5377.png', category: 'Builds' },
  { id: 'l5', title: 'Community', caption: 'Arctic Hustle crew', image_url: '/IMG_5378.png', category: 'Community' },
];

const CATEGORIES = ['All', 'Race Day', 'Builds', 'Community'];

const CAT_COLORS: Record<string, string> = {
  'Race Day': '#DC2626',
  'Builds': '#FACC15',
  'Community': '#22C55E',
};

export default function GalleryPage() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [filter, setFilter] = useState('All');
  const [lightbox, setLightbox] = useState<GalleryItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('gallery_items')
        .select('*')
        .order('created_at', { ascending: false });
      setItems(data && data.length > 0 ? data : LOCAL_IMAGES);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = filter === 'All' ? items : items.filter(i => i.category === filter);

  return (
    <>
      <Navbar />
      <main style={{ background: '#050505', color: '#F5F5F5', minHeight: '100vh' }}>

        {/* Header */}
        <section style={{ padding: '80px 24px 40px', textAlign: 'center' }}>
          <div style={{ fontSize: 12, letterSpacing: 4, color: '#DC2626', fontFamily: "'Barlow Condensed', sans-serif", marginBottom: 12 }}>
            GREENLAND MINI 4WD CLUB
          </div>
          <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 'clamp(48px, 10vw, 80px)', fontWeight: 900, lineHeight: 1, margin: '0 0 16px' }}>
            PHOTO <span style={{ color: '#DC2626' }}>GALLERY</span>
          </h1>
          <p style={{ color: '#B8C1CC', fontSize: 16, maxWidth: 480, margin: '0 auto' }}>
            Race days, builds, and community moments from Nuuk, Greenland.
          </p>
        </section>

        {/* Filter Tabs */}
        <section style={{ padding: '0 24px 32px', display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              style={{
                padding: '8px 20px',
                borderRadius: 999,
                border: filter === cat ? 'none' : '1px solid #333',
                background: filter === cat ? '#DC2626' : 'transparent',
                color: filter === cat ? '#fff' : '#B8C1CC',
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: 2,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {cat.toUpperCase()}
            </button>
          ))}
        </section>

        {/* Grid */}
        <section style={{ padding: '0 16px 80px', maxWidth: 1100, margin: '0 auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#B8C1CC' }}>Loading...</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#B8C1CC' }}>No photos yet in this category.</div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 12,
            }}>
              {filtered.map(item => (
                <div
                  key={item.id}
                  onClick={() => setLightbox(item)}
                  style={{
                    position: 'relative',
                    aspectRatio: '4/3',
                    borderRadius: 8,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    background: '#071426',
                  }}
                >
                  <img
                    src={item.image_url}
                    alt={item.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                  {/* Category badge */}
                  <div style={{
                    position: 'absolute',
                    top: 10,
                    left: 10,
                    background: CAT_COLORS[item.category] || '#DC2626',
                    color: '#fff',
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: 2,
                    padding: '3px 8px',
                    borderRadius: 4,
                    fontFamily: "'Barlow Condensed', sans-serif",
                  }}>
                    {item.category?.toUpperCase()}
                  </div>
                  {/* Hover overlay */}
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)',
                    display: 'flex',
                    alignItems: 'flex-end',
                    padding: 12,
                  }}>
                    <span style={{ color: '#fff', fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>{item.caption}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Lightbox */}
        {lightbox && (
          <div
            onClick={() => setLightbox(null)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.92)',
              zIndex: 1000,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
            }}
          >
            <button
              onClick={() => setLightbox(null)}
              style={{
                position: 'absolute',
                top: 20,
                right: 20,
                background: 'none',
                border: 'none',
                color: '#fff',
                fontSize: 32,
                cursor: 'pointer',
                lineHeight: 1,
              }}
            >✕</button>
            <img
              src={lightbox.image_url}
              alt={lightbox.title}
              style={{ maxWidth: '100%', maxHeight: '75vh', borderRadius: 8, objectFit: 'contain' }}
              onClick={e => e.stopPropagation()}
            />
            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <div style={{
                display: 'inline-block',
                background: CAT_COLORS[lightbox.category] || '#DC2626',
                color: '#fff',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 2,
                padding: '3px 10px',
                borderRadius: 4,
                fontFamily: "'Barlow Condensed', sans-serif",
                marginBottom: 8,
              }}>
                {lightbox.category?.toUpperCase()}
              </div>
              <p style={{ color: '#B8C1CC', fontSize: 14, margin: 0 }}>{lightbox.caption}</p>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
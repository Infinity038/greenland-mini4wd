'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const F  = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
const FB = { fontFamily: "'DM Sans', sans-serif" } as const;

const PLACEHOLDERS = [
  { emoji: '🏎️', label: 'Race Day',      bg: 'linear-gradient(135deg,#3b0000,#1a0000)' },
  { emoji: '🔧', label: 'Custom Builds', bg: 'linear-gradient(135deg,#001a3b,#00082b)' },
  { emoji: '📸', label: 'Team Photo',    bg: 'linear-gradient(135deg,#003b1a,#001a0a)' },
  { emoji: '🛠️', label: 'Workshop',      bg: 'linear-gradient(135deg,#3b2e00,#1a1500)' },
  { emoji: '🏁', label: 'Track Setup',   bg: 'linear-gradient(135deg,#1a003b,#0a001a)' },
  { emoji: '🏆', label: 'Awards Night',  bg: 'linear-gradient(135deg,#003b3b,#001a1a)' },
];

export default function Gallery() {
  const [items, setItems] = useState<any[]>([]);
  const [lightbox, setLightbox] = useState<string|null>(null);

  useEffect(() => {
    supabase.from('gallery_items').select('*').eq('published', true).order('created_at', { ascending: false }).limit(6)
      .then(({ data }) => setItems(data || []));
  }, []);

  const display = items.length > 0 ? items : PLACEHOLDERS.map((p,i) => ({ id: i, image_url: null, ...p }));

  return (
    <section id="gallery" style={{ background: '#050505', borderTop: '1px solid rgba(255,255,255,0.05)', padding: '80px 20px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <p style={{ ...F, fontSize: 12, fontWeight: 600, color: '#DC2626', letterSpacing: '0.3em', marginBottom: 8 }}>COMMUNITY</p>
          <h2 style={{ ...F, fontWeight: 900, color: '#F5F5F5', lineHeight: 1, margin: 0, fontSize: 'clamp(38px,6vw,58px)' }}>PHOTO GALLERY</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
          {display.map((item, i) => (
            <div key={item.id ?? i}
              onClick={() => item.image_url && setLightbox(item.image_url)}
              style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', aspectRatio: '1/1', gridColumn: i===0?'span 2':'span 1', gridRow: i===0?'span 2':'span 1', cursor: item.image_url ? 'pointer' : 'default', minHeight: i===0?220:100 }}>
              {item.image_url ? (
                <img src={item.image_url} alt={item.label||''} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              ) : (
                <div style={{ width:'100%', height:'100%', background: item.bg||'#111', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8 }}>
                  <span style={{ fontSize: i===0?40:20 }}>{item.emoji||'📷'}</span>
                  <span style={{ ...F, fontWeight:600, color:'rgba(255,255,255,0.5)', letterSpacing:'0.2em', fontSize: i===0?12:9 }}>{(item.label||'').toUpperCase()}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <a href="/gallery" style={{ ...F, fontWeight:700, fontSize:14, color:'#DC2626', letterSpacing:'0.2em', textDecoration:'none' }}>VIEW FULL GALLERY →</a>
        </div>
      </div>

      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.95)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <img src={lightbox} alt="" style={{ maxWidth:'90vw', maxHeight:'90vh', borderRadius:8 }} />
        </div>
      )}
    </section>
  );
}
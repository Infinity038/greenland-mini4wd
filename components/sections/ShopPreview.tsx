'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const F  = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
const FB = { fontFamily: "'DM Sans', sans-serif" } as const;

const FALLBACK = [
  { id:1, name:'Tamiya Avante',      category:'Chassis Kit', price:299, emoji:'🚗' },
  { id:2, name:'Club Racing Tires',  category:'Parts',       price:89,  emoji:'🔩' },
  { id:3, name:'Motor Upgrade Set',  category:'Parts',       price:149, emoji:'⚡' },
  { id:4, name:'GM4WD Club Jersey',  category:'Apparel',     price:199, emoji:'👕' },
];

export default function ShopPreview() {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('products').select('*').eq('status', 'available').order('created_at', { ascending: false }).limit(4)
      .then(({ data }: { data: any[] | null }) => setItems(data && data.length > 0 ? data : FALLBACK));
  }, []);

  const display = items.length > 0 ? items : FALLBACK;

  return (
    <section id="shop" style={{ background:'#050505', borderTop:'1px solid rgba(255,255,255,0.05)', padding:'80px 20px' }}>
      <div style={{ maxWidth:1100, margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:48 }}>
          <p style={{ ...F, fontSize:12, fontWeight:600, color:'#DC2626', letterSpacing:'0.3em', marginBottom:8 }}>TAMIYA MINI 4WD</p>
          <h2 style={{ ...F, fontWeight:900, color:'#F5F5F5', lineHeight:1, margin:'0 0 16px', fontSize:'clamp(38px,6vw,58px)' }}>CLUB SHOP</h2>
          <p style={{ ...FB, fontSize:16, color:'#B8C1CC', maxWidth:440, margin:'0 auto' }}>Cars, parts, apparel, and accessories — delivered to Nuuk and across Greenland.</p>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:16, marginBottom:40 }}>
          {display.map(item => {
            const imgs = item.image_urls ? item.image_urls.split(',') : [];
            const firstImg = imgs[0]?.trim();
            return (
              <a key={item.id} href="/shop" style={{ textDecoration:'none', display:'block', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, overflow:'hidden', transition:'border-color 0.2s' }}>
                <div style={{ height:160, background:'#0d0d0d', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
                  {firstImg ? (
                    <img src={firstImg} alt={item.name} style={{ width:'100%', height:'100%', objectFit:'contain', padding:12 }} />
                  ) : (
                    <span style={{ fontSize:40 }}>{item.emoji||'🚗'}</span>
                  )}
                </div>
                <div style={{ padding:16 }}>
                  <p style={{ ...FB, fontSize:10, color:'#6B7280', letterSpacing:'0.2em', textTransform:'uppercase', marginBottom:4 }}>{item.category}</p>
                  <p style={{ ...F, fontWeight:700, fontSize:18, color:'#F5F5F5', lineHeight:1.2, marginBottom:8 }}>{item.name}</p>
                  <p style={{ ...F, fontWeight:900, fontSize:22, color:'#DC2626' }}>{item.price} DKK</p>
                </div>
              </a>
            );
          })}
        </div>

        <div style={{ textAlign:'center' }}>
          <a href="/shop" style={{ display:'inline-block', background:'#DC2626', color:'#fff', padding:'14px 40px', borderRadius:8, ...F, fontWeight:900, fontSize:16, letterSpacing:'0.2em', textDecoration:'none' }}>
            VISIT THE SHOP →
          </a>
        </div>
      </div>
    </section>
  );
}
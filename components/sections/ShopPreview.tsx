'use client';
import { useEffect, useState } from 'react';
import type { PostgrestError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { readCachedProducts, writeCachedProducts } from '@/lib/productCache';
import { parseImages } from '@/lib/images';

const CATALOG_CACHE_KEY = 'home_shop_preview';

const F  = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
const FB = { fontFamily: "'DM Sans', sans-serif" } as const;

interface PreviewItem {
  id: number | string;
  name: string;
  category?: string | null;
  subcategory?: string | null;
  chassis?: string | null;
  price_dkk?: number;
  unbuilt_price_dkk?: number;
  unbuilt_case_price_dkk?: number;
  built_price_dkk?: number;
  built_case_price_dkk?: number;
  image_url?: string | null;
  emoji?: string;
}

const FALLBACK: PreviewItem[] = [
  { id: 1, name: 'Tamiya Avante',     category: 'cars',        subcategory: null,            price_dkk: 299, emoji: '🚗' },
  { id: 2, name: 'Club Racing Tires', category: 'parts',       subcategory: 'Wheels/Tires',  price_dkk: 89,  emoji: '🛞' },
  { id: 3, name: 'Motor Upgrade Set', category: 'parts',       subcategory: 'Motors',        price_dkk: 149, emoji: '⚡' },
  { id: 4, name: 'GM4WD Club Jersey', category: 'merchandise', subcategory: 'Jersey',        price_dkk: 199, emoji: '👕' },
];

function cheapestPrice(p: PreviewItem): number {
  if (p.category !== 'cars') return p.price_dkk || 0;
  const vals = [p.unbuilt_price_dkk, p.unbuilt_case_price_dkk, p.built_price_dkk, p.built_case_price_dkk]
    .filter((v): v is number => typeof v === 'number' && v > 0);
  return vals.length ? Math.min(...vals) : (p.price_dkk || 0);
}

function shopLink(item: PreviewItem): string {
  if (!item.category || item.category === 'cars') return '/shop';
  if (item.subcategory) return `/shop?tab=${item.category}&filter=${encodeURIComponent(item.subcategory)}`;
  return `/shop?tab=${item.category}`;
}

export default function ShopPreview() {
  const [items, setItems] = useState<PreviewItem[]>(() => readCachedProducts<PreviewItem>(CATALOG_CACHE_KEY)?.data ?? []);

  useEffect(() => {
    // Pull real, sellable products (cars, parts, merch) — prioritizes whatever's most
    // recently added, which right now means your Collector's Vault cars.
    supabase.from('products').select('*').in('status', ['in stock', 'limited', 'preorder only']).order('created_at', { ascending: false }).limit(4)
      .then(({ data, error }: { data: PreviewItem[] | null; error: PostgrestError | null }) => {
        if (error) {
          // Keep whatever's already shown (cached or previous state) rather than
          // masking a real fetch failure as if it were live data.
          console.error('[home] shop preview refresh failed:', error.message);
          return;
        }
        if (data && data.length > 0) {
          setItems(data);
          writeCachedProducts(CATALOG_CACHE_KEY, data);
        }
      });
  }, []);

  const display = items.length > 0 ? items : FALLBACK;

  return (
    <section id="shop" style={{ background: '#050505', borderTop: '1px solid rgba(255,255,255,0.05)', padding: '80px 20px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <p style={{ ...F, fontSize: 12, fontWeight: 600, color: '#DC2626', letterSpacing: '0.3em', marginBottom: 8 }}>TAMIYA MINI 4WD</p>
          <h2 style={{ ...F, fontWeight: 900, color: '#F5F5F5', lineHeight: 1, margin: '0 0 16px', fontSize: 'clamp(38px,6vw,58px)' }}>CLUB SHOP</h2>
          <p style={{ ...FB, fontSize: 16, color: '#B8C1CC', maxWidth: 440, margin: '0 auto' }}>Cars, parts, apparel, and accessories — delivered to Nuuk and across Greenland.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 16, marginBottom: 40 }}>
          {display.map(item => {
            const firstImg = parseImages(item.image_url)[0] || '';
            const label = item.subcategory || item.category || item.chassis || '';
            return (
              <a key={item.id} href={shopLink(item)} style={{ textDecoration: 'none', display: 'block', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden', transition: 'border-color 0.2s' }}>
                <div style={{ height: 160, background: '#0d0d0d', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {firstImg ? (
                    <img src={firstImg} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 12 }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  ) : (
                    <span style={{ fontSize: 40 }}>{item.emoji || '🚗'}</span>
                  )}
                </div>
                <div style={{ padding: 16 }}>
                  <p style={{ ...FB, fontSize: 10, color: '#6B7280', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 4 }}>{label}</p>
                  <p style={{ ...F, fontWeight: 700, fontSize: 18, color: '#F5F5F5', lineHeight: 1.2, marginBottom: 8 }}>{item.name}</p>
                  <p style={{ ...F, fontWeight: 900, fontSize: 22, color: '#DC2626' }}>{cheapestPrice(item)} DKK</p>
                </div>
              </a>
            );
          })}
        </div>

        <div style={{ textAlign: 'center' }}>
          <a href="/shop" style={{ display: 'inline-block', background: '#DC2626', color: '#fff', padding: '14px 40px', borderRadius: 8, ...F, fontWeight: 900, fontSize: 16, letterSpacing: '0.2em', textDecoration: 'none' }}>VISIT THE SHOP →</a>
        </div>
      </div>
    </section>
  );
}

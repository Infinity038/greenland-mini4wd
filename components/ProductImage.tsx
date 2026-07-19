'use client';
import { useState } from 'react';
import { parseImages } from '@/lib/images';

const F = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
const FB = { fontFamily: "'DM Sans', sans-serif" } as const;

const CATEGORY_ICONS: Record<string, string> = {
  cars: '🏎️',
  parts: '🔧',
  merchandise: '👕',
};

interface FallbackProps {
  category?: string | null;
  itemNo?: string | null;
  chassis?: string | null;
}

// Durable fallback shown whenever a product has no image or its image failed to
// load — a product must never be hidden merely because its image is broken/missing.
export function ProductImageFallback({ category, itemNo, chassis }: FallbackProps) {
  const icon = CATEGORY_ICONS[category || 'cars'] || CATEGORY_ICONS.cars;
  const meta = [chassis, itemNo ? `#${itemNo}` : null].filter(Boolean).join(' · ');
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, padding: 8, textAlign: 'center' }}>
      <span style={{ fontSize: 28, opacity: 0.35 }}>{icon}</span>
      {meta && <span style={{ ...F, fontWeight: 900, fontSize: 13, color: 'rgba(255,255,255,0.28)', letterSpacing: 1 }}>{meta}</span>}
      <span style={{ ...FB, fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>Image being prepared</span>
    </div>
  );
}

interface ProductImageProps extends FallbackProps {
  imageUrl?: string | null;
  name: string;
  onClick?: () => void;
}

export function ProductImage({ imageUrl, name, category, itemNo, chassis, onClick }: ProductImageProps) {
  const images = parseImages(imageUrl);
  const [idx, setIdx] = useState(0);
  const [failed, setFailed] = useState<Record<number, boolean>>({});

  const current = images[idx];
  const isFailed = failed[idx];

  if (!current || isFailed) {
    return <ProductImageFallback category={category} itemNo={itemNo} chassis={chassis} />;
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <img
        src={current}
        alt={name}
        onError={() => setFailed(f => ({ ...f, [idx]: true }))}
        onClick={onClick}
        style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain', cursor: onClick ? 'zoom-in' : 'default' }}
      />
      {images.length > 1 && (
        <div style={{ position: 'absolute', bottom: 4, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 4 }}>
          {images.map((_, i) => (
            <button key={i} onClick={e => { e.stopPropagation(); setIdx(i); }}
              style={{ width: i === idx ? 16 : 6, height: 6, borderRadius: 3, border: 'none', background: i === idx ? '#DC2626' : 'rgba(255,255,255,0.3)', cursor: 'pointer', padding: 0, transition: 'all 0.2s' }} />
          ))}
        </div>
      )}
      {images.length > 1 && idx > 0 && (
        <button onClick={e => { e.stopPropagation(); setIdx(i => i - 1); }}
          style={{ position: 'absolute', left: 4, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
      )}
      {images.length > 1 && idx < images.length - 1 && (
        <button onClick={e => { e.stopPropagation(); setIdx(i => i + 1); }}
          style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
      )}
    </div>
  );
}

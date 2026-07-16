'use client';
// Searchable product combobox — not a plain <select>. Filters the mock
// catalog by name, Tamiya item number, barcode, category and chassis as the
// staff member types, and shows a rich result row per match.
import { useState } from 'react';
import { searchProducts, type PosProduct, type PosProductAvailability } from '@/lib/posCatalog';

const F  = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
const FB = { fontFamily: "'DM Sans', sans-serif" } as const;

const AVAILABILITY_LABELS: Record<PosProductAvailability, string> = {
  in_stock: 'In stock',
  low_stock: 'Low stock',
  preorder: 'Preorder',
  out_of_stock: 'Out of stock',
};
const AVAILABILITY_COLORS: Record<PosProductAvailability, string> = {
  in_stock: '#22C55E',
  low_stock: '#FACC15',
  preorder: '#3B82F6',
  out_of_stock: '#DC2626',
};

export default function ProductSearchCombobox({ onSelect, onClose }: { onSelect: (product: PosProduct) => void; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const results = searchProducts(query);

  return (
    <div style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ ...F, fontWeight: 700, fontSize: 12, letterSpacing: 2, color: '#B8C1CC' }}>SEARCH PRODUCTS</div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#B8C1CC', cursor: 'pointer', fontSize: 16 }}>✕</button>
      </div>
      <input
        autoFocus
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search by name, item number, barcode, category, or chassis"
        style={{ width: '100%', boxSizing: 'border-box', background: '#050505', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', color: '#F5F5F5', ...FB, fontSize: 14, marginBottom: 10 }}
      />
      <div role="listbox" style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 320, overflowY: 'auto' }}>
        {results.length === 0 ? (
          <div style={{ ...FB, fontSize: 13, color: '#6B7280', textAlign: 'center', padding: '16px 0' }}>No matching products.</div>
        ) : results.map(product => (
          <button
            key={product.barcode}
            role="option"
            aria-selected={false}
            onClick={() => onSelect(product)}
            style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '10px 12px', cursor: 'pointer', textAlign: 'left', width: '100%' }}
          >
            <div style={{ width: 40, height: 40, borderRadius: 6, background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
              {product.imageUrl ? <img src={product.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 16 }}>📦</span>}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ ...F, fontWeight: 700, fontSize: 14, color: '#F5F5F5' }}>{product.name}</div>
              <div style={{ ...FB, fontSize: 11, color: '#6B7280' }}>
                {product.tamiyaItemNumber ? `Item #${product.tamiyaItemNumber} · ` : ''}{product.barcode} · {product.category}
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ ...F, fontWeight: 900, fontSize: 15, color: '#FACC15' }}>{product.unitPriceDkk} DKK</div>
              <div style={{ ...FB, fontSize: 10, color: AVAILABILITY_COLORS[product.availability] }}>
                {AVAILABILITY_LABELS[product.availability]}{product.availability !== 'preorder' ? ` (${product.stockQuantity})` : ''}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

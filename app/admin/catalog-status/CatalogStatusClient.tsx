'use client';
// Preview-only admin catalog-status / restock view
// (docs/CATALOG-COSTING-AND-FREIGHT.md §"Admin restock view"). Reads the
// bundled curated catalog (lib/pricing/catalogProducts.ts) and the shared
// in-memory restock-interest store (lib/pricing/restockInterest.ts) — zero
// Supabase reads or writes anywhere in this file. This is an administrative
// planning tool only: it never places a supplier order automatically.

import { useMemo, useState } from 'react';
import { getAllCatalogItems, type PublicCatalogItem } from '@/lib/pricing/catalogProducts';
import { restockInterestStore } from '@/lib/pricing/restockInterest';

const F = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
const FB = { fontFamily: "'DM Sans', sans-serif" } as const;

type QuickFilter = 'all' | 'out_of_stock' | 'price_pending' | 'core' | 'expansion' | 'special_order' | 'has_restock_interest' | 'never_stocked';

const QUICK_FILTERS: { key: QuickFilter; label: string }[] = [
  { key: 'all', label: 'ALL' },
  { key: 'out_of_stock', label: 'OUT OF STOCK' },
  { key: 'price_pending', label: 'PRICE PENDING' },
  { key: 'core', label: 'CORE STOCK' },
  { key: 'expansion', label: 'EXPANSION STOCK' },
  { key: 'special_order', label: 'SPECIAL ORDER' },
  { key: 'has_restock_interest', label: 'HAS RESTOCK INTEREST' },
  { key: 'never_stocked', label: 'NEVER STOCKED' },
];

// Administrative planning heuristic only — a manual suggestion for staff to
// review, never an automatic supplier order. Deliberately simple and
// transparent: enough to cover the open restock-interest requests, or a
// small starter quantity for a never-stocked item with real demonstrated
// interest. Zero when there is nothing to suggest.
function suggestedReorderQty(item: PublicCatalogItem, interestCount: number): number {
  if (!item.visible) return 0;
  if (item.raw.stock_qty > 0) return 0;
  if (interestCount > 0) return interestCount;
  if (item.raw.stock_qty === 0 && item.raw.pricing_source !== 'unverified') return 1;
  return 0;
}

export default function CatalogStatusClient() {
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<'' | 'cars' | 'parts' | 'accessories'>('');
  const [chassisFilter, setChassisFilter] = useState('');
  const [search, setSearch] = useState('');
  const [restockVersion, setRestockVersion] = useState(0); // bump to re-render interest counts after a fire_trigger-style refresh

  const allItems = useMemo(() => getAllCatalogItems(), []);
  const chassisOptions = useMemo(
    () => Array.from(new Set(allItems.map(i => i.raw.chassis).filter(Boolean))).sort(),
    [allItems]
  );

  const rows = useMemo(() => {
    void restockVersion; // dependency-only: forces recompute after ↻ REFRESH INTEREST COUNTS, since the store is a plain mutable class, not React state
    return allItems
      .map(item => ({ item, interestCount: restockInterestStore.countForProduct(item.raw.id) }))
      .filter(({ item, interestCount }) => {
        if (categoryFilter && item.raw.category !== categoryFilter) return false;
        if (chassisFilter && item.raw.chassis !== chassisFilter) return false;
        const q = search.trim().toLowerCase();
        if (q && !item.raw.name.toLowerCase().includes(q) && !item.raw.item_no.toLowerCase().includes(q)) return false;

        switch (quickFilter) {
          case 'out_of_stock': return item.publicState === 'OUT_OF_STOCK';
          case 'price_pending': return item.publicState === 'PRICE_PENDING';
          case 'core': return item.raw.catalog_tier === 'core';
          case 'expansion': return item.raw.catalog_tier === 'expansion';
          case 'special_order': return item.raw.catalog_tier === 'special_order';
          case 'has_restock_interest': return interestCount > 0;
          case 'never_stocked': return item.raw.stock_qty === 0 && item.raw.status !== 'in stock';
          default: return true;
        }
      })
      .sort((a, b) => a.item.raw.catalog_order - b.item.raw.catalog_order);
  }, [allItems, categoryFilter, chassisFilter, search, quickFilter, restockVersion]);

  const tierLabel = { core: 'CORE STOCK', expansion: 'EXPANSION STOCK', special_order: 'SPECIAL ORDER' } as const;

  return (
    <div style={{ background: '#050505', minHeight: '100vh', color: '#F5F5F5' }}>
      <div style={{ background: '#7f1d1d', color: '#fff', padding: '14px 18px', textAlign: 'center', ...F, fontWeight: 900, fontSize: 16, letterSpacing: 2 }}>
        PREVIEW — CATALOG STATUS &amp; RESTOCK ADMIN — MOCK DATA — DISABLED IN PRODUCTION
      </div>

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 20px 80px' }}>
        <div style={{ ...FB, fontSize: 13, color: '#B8C1CC', marginBottom: 20, lineHeight: 1.7 }}>
          Reads the bundled curated catalog ({allItems.length} items) and the in-memory restock-interest store — nothing
          here is read from or written to Supabase. This is an administrative planning tool only: reorder quantities
          below are suggestions for staff review and are never automatically placed with a supplier.
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          {QUICK_FILTERS.map(f => (
            <button key={f.key} onClick={() => setQuickFilter(f.key)}
              style={{ background: quickFilter === f.key ? '#DC2626' : 'transparent', color: quickFilter === f.key ? '#fff' : '#B8C1CC', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '6px 12px', ...F, fontWeight: 700, fontSize: 11, letterSpacing: 1, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {f.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value as '' | 'cars' | 'parts' | 'accessories')} style={selectStyle}>
            <option value="">All categories</option>
            <option value="cars">Cars</option>
            <option value="parts">Parts</option>
            <option value="accessories">Accessories</option>
          </select>
          <select value={chassisFilter} onChange={e => setChassisFilter(e.target.value)} style={selectStyle}>
            <option value="">All chassis</option>
            {chassisOptions.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or item no..." style={{ ...selectStyle, flex: 1, minWidth: 220 }} />
          <button onClick={() => setRestockVersion(v => v + 1)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '8px 14px', ...F, fontWeight: 700, fontSize: 11, color: '#F5F5F5', cursor: 'pointer' }}>↻ REFRESH INTEREST COUNTS</button>
        </div>

        <div style={{ ...FB, fontSize: 12, color: '#6B7280', marginBottom: 10 }}>{rows.length} of {allItems.length} catalog items</div>

        <div style={{ overflowX: 'auto', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', ...FB, fontSize: 12 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: '#6B7280', borderBottom: '1px solid rgba(255,255,255,0.1)', background: '#071426' }}>
                {['Product', 'SKU', 'Category', 'Chassis', 'Tier', 'Public state', 'Stock', 'Supplier cost', 'Currency', 'Source note', 'Retail price', 'Pricing status', 'Restock interest', 'Suggested reorder', 'Missing-data reason'].map(h => (
                  <th key={h} style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ item, interestCount }) => {
                const p = item.raw;
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '8px 10px', color: '#F5F5F5', fontWeight: 700 }}>{p.name}{p.is_collectors_vault && <span style={{ color: '#FACC15' }}> ★</span>}</td>
                    <td style={{ padding: '8px 10px' }}>#{p.item_no}</td>
                    <td style={{ padding: '8px 10px', textTransform: 'capitalize' }}>{p.category}</td>
                    <td style={{ padding: '8px 10px' }}>{p.chassis || '—'}</td>
                    <td style={{ padding: '8px 10px' }}>{tierLabel[p.catalog_tier]}</td>
                    <td style={{ padding: '8px 10px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 20, background: '#3B82F622', color: '#3B82F6', fontSize: 11 }}>{item.publicState.replace(/_/g, ' ')}</span>
                    </td>
                    <td style={{ padding: '8px 10px' }}>{p.stock_qty}</td>
                    <td style={{ padding: '8px 10px', color: '#6B7280' }}>not yet recorded</td>
                    <td style={{ padding: '8px 10px', color: '#6B7280' }}>—</td>
                    <td style={{ padding: '8px 10px', color: '#6B7280' }}>—</td>
                    <td style={{ padding: '8px 10px', color: item.priceDkk != null ? '#22C55E' : '#6B7280' }}>{item.priceDkk != null ? `${item.priceDkk.toLocaleString()} kr` : '—'}</td>
                    <td style={{ padding: '8px 10px' }}>{p.pricing_source.replace(/_/g, ' ')}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>{interestCount}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center', color: '#FACC15' }}>{suggestedReorderQty(item, interestCount) || '—'}</td>
                    <td style={{ padding: '8px 10px', color: '#F97316' }}>{item.missingDataReason ?? '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  background: '#071426',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8,
  padding: '8px 12px',
  color: '#F5F5F5',
  ...FB,
  fontSize: 13,
  outline: 'none',
};

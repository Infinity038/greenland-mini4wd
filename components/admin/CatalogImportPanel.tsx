'use client';
import { useMemo, useState } from 'react';
import { BMAX_INITIAL_CATALOG, type BmaxCatalogProduct, type CatalogTier } from '@/app/data/bmaxCatalog';

const F = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
const FB = { fontFamily: "'DM Sans', sans-serif" } as const;

const TIERS: { key: CatalogTier; label: string }[] = [
  { key: 'core', label: 'Core Stock' },
  { key: 'expansion', label: 'Expansion Stock' },
  { key: 'special_order', label: 'Special Order / Collector' },
];

type DryRunStatus = 'new' | 'unchanged' | 'conflicted';

interface DryRunRow {
  item: BmaxCatalogProduct;
  status: DryRunStatus;
  conflictReason?: string;
}

// Minimal shape this panel needs from an existing `products` row — deliberately
// narrower than the full product record used elsewhere in the admin page.
export interface ExistingProductRef {
  item_no?: string | null;
  name?: string | null;
  category?: string | null;
}

function normalizeItemNo(v: string | null | undefined): string {
  return (v || '').trim().toLowerCase();
}

// Pure diff — reads the existing product list, never writes anything. Matches the
// brief's "dry-run mode" + "merge by normalized item_no, never duplicate" requirements
// without actually executing an import (import execution is intentionally disabled
// below pending production schema confirmation).
function computeDryRun(existingProducts: ExistingProductRef[], selectedTiers: Set<CatalogTier>): DryRunRow[] {
  const existingByItemNo = new Map<string, ExistingProductRef>();
  for (const p of existingProducts) {
    const key = normalizeItemNo(p.item_no);
    if (key) existingByItemNo.set(key, p);
  }

  return BMAX_INITIAL_CATALOG
    .filter(item => selectedTiers.has(item.catalog_tier))
    .map(item => {
      const match = existingByItemNo.get(normalizeItemNo(item.item_no));
      if (!match) return { item, status: 'new' as const };
      const nameMismatch = (match.name || '').trim() !== item.name.trim();
      const categoryMismatch = (match.category || 'cars') !== item.category;
      if (nameMismatch || categoryMismatch) {
        const reasons = [
          nameMismatch ? `existing name "${match.name}" != catalog name "${item.name}"` : null,
          categoryMismatch ? `existing category "${match.category || 'cars'}" != catalog category "${item.category}"` : null,
        ].filter(Boolean).join('; ');
        return { item, status: 'conflicted' as const, conflictReason: reasons };
      }
      return { item, status: 'unchanged' as const };
    });
}

export default function CatalogImportPanel({ existingProducts }: { existingProducts: ExistingProductRef[] }) {
  const [selectedTiers, setSelectedTiers] = useState<Set<CatalogTier>>(new Set(['core', 'expansion', 'special_order']));
  const [ranDryRun, setRanDryRun] = useState(false);

  const toggleTier = (tier: CatalogTier) => {
    setSelectedTiers(prev => {
      const next = new Set(prev);
      if (next.has(tier)) next.delete(tier); else next.add(tier);
      return next;
    });
    setRanDryRun(false);
  };

  const tierCounts = useMemo(() => {
    const counts: Record<CatalogTier, number> = { core: 0, expansion: 0, special_order: 0 };
    for (const item of BMAX_INITIAL_CATALOG) counts[item.catalog_tier]++;
    return counts;
  }, []);

  const dryRunRows = useMemo(
    () => (ranDryRun ? computeDryRun(existingProducts, selectedTiers) : []),
    [ranDryRun, existingProducts, selectedTiers]
  );

  const summary = useMemo(() => {
    const s = { new: 0, unchanged: 0, conflicted: 0 };
    for (const row of dryRunRows) s[row.status]++;
    return s;
  }, [dryRunRows]);

  return (
    <div style={{ background: '#071426', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 14, padding: '18px 20px', marginBottom: 20 }}>
      <div style={{ ...F, fontSize: 11, letterSpacing: 3, color: '#3B82F6', marginBottom: 4 }}>🗂 CATALOG IMPORT (PREVIEW ONLY)</div>
      <div style={{ ...FB, fontSize: 12, color: '#6B7280', marginBottom: 14, lineHeight: 1.6 }}>
        Previews the proposed B-MAX/beginner starter catalog ({BMAX_INITIAL_CATALOG.length} items: {tierCounts.core} Core, {tierCounts.expansion} Expansion, {tierCounts.special_order} Special Order).
        Every new item would import as an <strong style={{ color: '#F5F5F5' }}>unpublished draft with zero price and zero stock</strong> — nothing here writes to the database.
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        {TIERS.map(t => (
          <label key={t.key} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#050505', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '7px 12px', cursor: 'pointer', ...FB, fontSize: 12, color: '#B8C1CC' }}>
            <input type="checkbox" checked={selectedTiers.has(t.key)} onChange={() => toggleTier(t.key)} style={{ cursor: 'pointer' }} />
            {t.label} ({tierCounts[t.key]})
          </label>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: ranDryRun ? 16 : 0, flexWrap: 'wrap' }}>
        <button
          onClick={() => setRanDryRun(true)}
          disabled={selectedTiers.size === 0}
          style={{ background: '#3B82F6', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', ...F, fontWeight: 700, fontSize: 13, letterSpacing: 1, cursor: selectedTiers.size === 0 ? 'not-allowed' : 'pointer', opacity: selectedTiers.size === 0 ? 0.5 : 1 }}>
          PREVIEW DRY RUN
        </button>
        <button
          disabled
          title="Import execution is disabled until the proposed migration (supabase/migrations/20260715_bmax_catalog_and_inventory.sql) has been reviewed against the live production schema and explicitly approved."
          style={{ background: 'rgba(255,255,255,0.05)', color: '#6B7280', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 20px', ...F, fontWeight: 700, fontSize: 13, letterSpacing: 1, cursor: 'not-allowed' }}>
          IMPORT SELECTED (DISABLED)
        </button>
      </div>

      {ranDryRun && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
            <div style={{ background: '#050505', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
              <div style={{ ...F, fontWeight: 900, fontSize: 22, color: '#22C55E' }}>{summary.new}</div>
              <div style={{ ...FB, fontSize: 10, color: '#6B7280', letterSpacing: 1 }}>NEW (DRAFT)</div>
            </div>
            <div style={{ background: '#050505', border: '1px solid rgba(107,114,128,0.4)', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
              <div style={{ ...F, fontWeight: 900, fontSize: 22, color: '#B8C1CC' }}>{summary.unchanged}</div>
              <div style={{ ...FB, fontSize: 10, color: '#6B7280', letterSpacing: 1 }}>EXISTING · UNCHANGED</div>
            </div>
            <div style={{ background: '#050505', border: '1px solid rgba(220,38,38,0.35)', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
              <div style={{ ...F, fontWeight: 900, fontSize: 22, color: '#DC2626' }}>{summary.conflicted}</div>
              <div style={{ ...FB, fontSize: 10, color: '#6B7280', letterSpacing: 1 }}>CONFLICTED</div>
            </div>
          </div>

          {summary.conflicted > 0 && (
            <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {dryRunRows.filter(r => r.status === 'conflicted').map(row => (
                <div key={row.item.item_no} style={{ background: '#050505', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 6, padding: '8px 12px', ...FB, fontSize: 12, color: '#FCA5A5' }}>
                  <strong style={{ color: '#F5F5F5' }}>#{row.item.item_no} {row.item.name}</strong> — {row.conflictReason}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

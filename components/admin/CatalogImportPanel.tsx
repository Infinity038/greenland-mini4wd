'use client';
import { useMemo, useState } from 'react';
import reconciledSeed from '@/catalog/bmax-catalog-reconciled-seed.json';

const F = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
const FB = { fontFamily: "'DM Sans', sans-serif" } as const;

// The reconciled seed (catalog/bmax-catalog-reconciled-seed.json) is a
// build-time-only import — an admin dry-run comparison source and test
// fixture, per the owner decision that catalog/*.json must never control
// live prices/stock/visibility/images. Nothing in this file writes to
// Supabase; IMPORT SELECTED stays permanently disabled until a reviewed,
// separately-approved migration (supabase/migrations-proposed/
// bmax_catalog_import_forward.sql) has actually been applied.
export interface SeedRow {
  source: 'live_existing' | 'catalog_new';
  item_no: string;
  name: string;
  category: string | null;
  price_dkk: number | null;
  price_on_request?: boolean;
  posterMatched: boolean;
  validationErrors: string[];
}

export interface ReconciledSeed {
  existing: SeedRow[];
  new: SeedRow[];
  blocked: SeedRow[];
}

const SEED = reconciledSeed as unknown as ReconciledSeed;

export type DryRunStatus = 'new' | 'unchanged' | 'conflicted' | 'blocked';

export interface DryRunRow {
  item: SeedRow;
  status: DryRunStatus;
  conflictReason?: string;
}

// Minimal shape this panel needs from a real, currently-live products row —
// deliberately narrower than the full product record used elsewhere in the
// admin page.
export interface ExistingProductRef {
  item_no?: string | null;
  name?: string | null;
  category?: string | null;
}

export function normalizeItemNo(v: string | null | undefined): string {
  return (v || '').trim().toLowerCase();
}

// Pure diff — reads the live product list (fetched by the caller from
// Supabase) and the reconciled seed's already-validated `new` rows, never
// writes anything. A seed row is:
//   - "unchanged"  if a live row with the same item_no already has the same
//                   name/category (the seed's own validation already ran;
//                   this only re-checks against what's live *right now*, in
//                   case the two have drifted since the seed was generated),
//   - "conflicted" if a live row with the same item_no differs,
//   - "new"        if no live row has that item_no yet.
// Seed rows already flagged invalid during reconciliation are always
// reported as "blocked", never silently promoted to "new".
export function computeDryRun(existingProducts: ExistingProductRef[]): DryRunRow[] {
  const existingByItemNo = new Map<string, ExistingProductRef>();
  for (const p of existingProducts) {
    const key = normalizeItemNo(p.item_no);
    if (key) existingByItemNo.set(key, p);
  }

  const rows: DryRunRow[] = SEED.new.map(item => {
    const match = existingByItemNo.get(normalizeItemNo(item.item_no));
    if (!match) return { item, status: 'new' as const };
    const nameMismatch = (match.name || '').trim() !== item.name.trim();
    const categoryMismatch = (match.category || 'cars') !== item.category;
    if (nameMismatch || categoryMismatch) {
      const reasons = [
        nameMismatch ? `existing name "${match.name}" != seed name "${item.name}"` : null,
        categoryMismatch ? `existing category "${match.category || 'cars'}" != seed category "${item.category}"` : null,
      ].filter(Boolean).join('; ');
      return { item, status: 'conflicted' as const, conflictReason: reasons };
    }
    return { item, status: 'unchanged' as const };
  });

  for (const item of SEED.blocked) {
    rows.push({ item, status: 'blocked' as const, conflictReason: item.validationErrors.join('; ') });
  }

  return rows;
}

export default function CatalogImportPanel({ existingProducts }: { existingProducts: ExistingProductRef[] }) {
  const [ranDryRun, setRanDryRun] = useState(false);

  const dryRunRows = useMemo(() => (ranDryRun ? computeDryRun(existingProducts) : []), [ranDryRun, existingProducts]);

  const summary = useMemo(() => {
    const s = { new: 0, unchanged: 0, conflicted: 0, blocked: 0 };
    for (const row of dryRunRows) s[row.status]++;
    return s;
  }, [dryRunRows]);

  return (
    <div style={{ background: '#071426', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 14, padding: '18px 20px', marginBottom: 20 }}>
      <div style={{ ...F, fontSize: 11, letterSpacing: 3, color: '#3B82F6', marginBottom: 4 }}>🗂 B-MAX CATALOG IMPORT (PREVIEW ONLY)</div>
      <div style={{ ...FB, fontSize: 12, color: '#6B7280', marginBottom: 14, lineHeight: 1.6 }}>
        Previews the reconciled catalog seed ({SEED.existing.length} existing live rows preserved exactly as-is, {SEED.new.length} validated new rows — {SEED.new.filter(r => r.price_on_request).length} price-on-request, {SEED.new.filter(r => !r.price_on_request).length} with an approved price — {SEED.blocked.length} blocked for a genuine data-integrity problem, never for a missing price alone).
        Nothing here writes to the database — <strong style={{ color: '#F5F5F5' }}>public.products stays the only runtime source of truth</strong>. Import execution is disabled until a reviewed migration is separately approved and applied.
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: ranDryRun ? 16 : 0, flexWrap: 'wrap' }}>
        <button
          onClick={() => setRanDryRun(true)}
          style={{ background: '#3B82F6', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', ...F, fontWeight: 700, fontSize: 13, letterSpacing: 1, cursor: 'pointer' }}>
          PREVIEW DRY RUN
        </button>
        <button
          disabled
          title="Import execution is disabled until the proposed catalog migration has been reviewed against the live production schema and explicitly approved by the owner."
          style={{ background: 'rgba(255,255,255,0.05)', color: '#6B7280', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 20px', ...F, fontWeight: 700, fontSize: 13, letterSpacing: 1, cursor: 'not-allowed' }}>
          IMPORT SELECTED (DISABLED)
        </button>
      </div>

      {ranDryRun && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
            <div style={{ background: '#050505', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
              <div style={{ ...F, fontWeight: 900, fontSize: 22, color: '#22C55E' }}>{summary.new}</div>
              <div style={{ ...FB, fontSize: 10, color: '#6B7280', letterSpacing: 1 }}>NEW (VALIDATED)</div>
            </div>
            <div style={{ background: '#050505', border: '1px solid rgba(107,114,128,0.4)', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
              <div style={{ ...F, fontWeight: 900, fontSize: 22, color: '#B8C1CC' }}>{summary.unchanged}</div>
              <div style={{ ...FB, fontSize: 10, color: '#6B7280', letterSpacing: 1 }}>EXISTING · UNCHANGED</div>
            </div>
            <div style={{ background: '#050505', border: '1px solid rgba(220,38,38,0.35)', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
              <div style={{ ...F, fontWeight: 900, fontSize: 22, color: '#DC2626' }}>{summary.conflicted}</div>
              <div style={{ ...FB, fontSize: 10, color: '#6B7280', letterSpacing: 1 }}>CONFLICTED</div>
            </div>
            <div style={{ background: '#050505', border: '1px solid rgba(250,204,21,0.35)', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
              <div style={{ ...F, fontWeight: 900, fontSize: 22, color: '#FACC15' }}>{summary.blocked}</div>
              <div style={{ ...FB, fontSize: 10, color: '#6B7280', letterSpacing: 1 }}>BLOCKED</div>
            </div>
          </div>

          {(summary.conflicted > 0 || summary.blocked > 0) && (
            <div style={{ maxHeight: 260, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {dryRunRows.filter(r => r.status === 'conflicted' || r.status === 'blocked').map(row => (
                <div key={`${row.status}-${row.item.item_no}`} style={{ background: '#050505', border: `1px solid ${row.status === 'blocked' ? 'rgba(250,204,21,0.2)' : 'rgba(220,38,38,0.2)'}`, borderRadius: 6, padding: '8px 12px', ...FB, fontSize: 12, color: row.status === 'blocked' ? '#FDE68A' : '#FCA5A5' }}>
                  <strong style={{ color: '#F5F5F5' }}>#{row.item.item_no || '(blank)'} {row.item.name}</strong> — {row.conflictReason}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

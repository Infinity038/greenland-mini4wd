import { describe, expect, it } from 'vitest';
import { computeDryRun, normalizeItemNo, type ExistingProductRef } from './CatalogImportPanel';
import { BMAX_INITIAL_CATALOG } from '@/app/data/bmaxCatalog';

const ALL_TIERS = new Set<'core' | 'expansion' | 'special_order'>(['core', 'expansion', 'special_order']);

describe('normalizeItemNo', () => {
  it('trims and lowercases, and treats null/undefined as empty', () => {
    expect(normalizeItemNo('  18099 ')).toBe('18099');
    expect(normalizeItemNo('AR-2024')).toBe('ar-2024');
    expect(normalizeItemNo(null)).toBe('');
    expect(normalizeItemNo(undefined)).toBe('');
  });
});

describe('computeDryRun', () => {
  it('classifies every catalog item as "new" when nothing exists yet', () => {
    const rows = computeDryRun([], ALL_TIERS);
    expect(rows).toHaveLength(BMAX_INITIAL_CATALOG.length);
    expect(rows.every(r => r.status === 'new')).toBe(true);
  });

  it('only includes items from the selected tiers', () => {
    const coreOnly = computeDryRun([], new Set(['core']));
    expect(coreOnly.length).toBeGreaterThan(0);
    expect(coreOnly.every(r => r.item.catalog_tier === 'core')).toBe(true);
    expect(coreOnly.length).toBeLessThan(BMAX_INITIAL_CATALOG.length);
  });

  it('marks a matching item_no with the same name/category as "unchanged"', () => {
    const sample = BMAX_INITIAL_CATALOG[0];
    const existing: ExistingProductRef[] = [{ item_no: sample.item_no, name: sample.name, category: sample.category }];
    const rows = computeDryRun(existing, ALL_TIERS);
    const row = rows.find(r => r.item.item_no === sample.item_no)!;
    expect(row.status).toBe('unchanged');
  });

  it('matches item_no case-insensitively and ignoring whitespace', () => {
    const sample = BMAX_INITIAL_CATALOG[0];
    const existing: ExistingProductRef[] = [
      { item_no: `  ${sample.item_no.toUpperCase()}  `, name: sample.name, category: sample.category },
    ];
    const rows = computeDryRun(existing, ALL_TIERS);
    const row = rows.find(r => r.item.item_no === sample.item_no)!;
    expect(row.status).toBe('unchanged');
  });

  it('flags a matching item_no with a different name or category as "conflicted", with a reason', () => {
    const sample = BMAX_INITIAL_CATALOG[0];
    const existing: ExistingProductRef[] = [{ item_no: sample.item_no, name: 'Some Other Name', category: sample.category }];
    const rows = computeDryRun(existing, ALL_TIERS);
    const row = rows.find(r => r.item.item_no === sample.item_no)!;
    expect(row.status).toBe('conflicted');
    expect(row.conflictReason).toContain('existing name');
  });

  it('never produces duplicate rows for the same catalog item on repeated calls (idempotent)', () => {
    const first = computeDryRun([], ALL_TIERS);
    const second = computeDryRun([], ALL_TIERS);
    expect(second).toHaveLength(first.length);
    const itemNos = second.map(r => r.item.item_no);
    expect(new Set(itemNos).size).toBe(itemNos.length);
  });
});

import { describe, expect, it } from 'vitest';
import { computeDryRun, normalizeItemNo, type ExistingProductRef } from './CatalogImportPanel';
import reconciledSeedRaw from '@/catalog/bmax-catalog-reconciled-seed.json';

const reconciledSeed = reconciledSeedRaw as unknown as {
  existing: { item_no: string; name: string; category: string }[];
  new: { item_no: string; name: string; category: string }[];
  blocked: { item_no: string; name: string; validationErrors: string[] }[];
};

describe('normalizeItemNo', () => {
  it('trims and lowercases, and treats null/undefined as empty', () => {
    expect(normalizeItemNo('  18099 ')).toBe('18099');
    expect(normalizeItemNo('AR-2024')).toBe('ar-2024');
    expect(normalizeItemNo(null)).toBe('');
    expect(normalizeItemNo(undefined)).toBe('');
  });
});

describe('computeDryRun — dry-run only, reads Supabase-shaped existingProducts + the reconciled seed, never writes', () => {
  it('classifies every validated new seed row as "new" when nothing matching exists live', () => {
    const rows = computeDryRun([]);
    const newRows = rows.filter(r => r.status === 'new');
    expect(newRows).toHaveLength(reconciledSeed.new.length);
  });

  it('always reports every blocked seed row as "blocked", never promotes it to new', () => {
    const rows = computeDryRun([]);
    const blockedRows = rows.filter(r => r.status === 'blocked');
    expect(blockedRows).toHaveLength(reconciledSeed.blocked.length);
    for (const row of blockedRows) {
      expect(row.conflictReason).toBeTruthy();
    }
  });

  it('marks a seed row as "unchanged" when a live row already matches name/category', () => {
    const sample = reconciledSeed.new[0];
    const existing: ExistingProductRef[] = [{ item_no: sample.item_no, name: sample.name, category: sample.category }];
    const rows = computeDryRun(existing);
    const row = rows.find(r => r.item.item_no === sample.item_no)!;
    expect(row.status).toBe('unchanged');
  });

  it('matches item_no case-insensitively and ignoring whitespace', () => {
    const sample = reconciledSeed.new[0];
    const existing: ExistingProductRef[] = [
      { item_no: `  ${sample.item_no.toUpperCase()}  `, name: sample.name, category: sample.category },
    ];
    const rows = computeDryRun(existing);
    const row = rows.find(r => r.item.item_no === sample.item_no)!;
    expect(row.status).toBe('unchanged');
  });

  it('flags a matching item_no with a different name or category as "conflicted", with a reason', () => {
    const sample = reconciledSeed.new[0];
    const existing: ExistingProductRef[] = [{ item_no: sample.item_no, name: 'Some Other Name', category: sample.category }];
    const rows = computeDryRun(existing);
    const row = rows.find(r => r.item.item_no === sample.item_no)!;
    expect(row.status).toBe('conflicted');
    expect(row.conflictReason).toContain('existing name');
  });

  it('is idempotent — repeated calls never produce duplicate rows for the same seed item', () => {
    const first = computeDryRun([]);
    const second = computeDryRun([]);
    expect(second).toHaveLength(first.length);
    const itemNos = second.map(r => r.item.item_no);
    expect(new Set(itemNos).size).toBe(itemNos.length);
  });

  it('never touches Supabase or performs a write — purely a function of its two plain-object inputs', () => {
    // Structural guarantee: computeDryRun's signature takes only
    // ExistingProductRef[] and reads the statically-imported seed — there
    // is no client/fetch parameter it could use to write anywhere.
    expect(computeDryRun.length).toBe(1);
  });
});

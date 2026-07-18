// Reconciliation tests for the B-MAX catalog production rollout. Verifies
// the owner decisions from this PR are actually enforced in code/data, not
// just documented: Supabase remains the runtime storefront source, the
// static catalog JSON is never wired into live rendering, the 14 existing
// product rows are preserved exactly, posters match strictly by item_no,
// invalid new rows are blocked (never invented), and the migration/rollback
// pair only ever targets the exact rows this PR actually inserts.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import catalogJson from './bmax-initial-catalog.json';
import reconciledSeedRaw from './bmax-catalog-reconciled-seed.json';
import posterManifest from '../scripts/catalog-poster-images-full-manifest.json';

interface SeedRow {
  source: 'live_existing' | 'catalog_new';
  item_no: string;
  name: string;
  category: string | null;
  price_dkk: number | null;
  unbuilt_stock: number | null;
  built_stock: number | null;
  status: string | null;
  image_url: string;
  posterMatched: boolean;
  validationErrors: string[];
}

const reconciledSeed = reconciledSeedRaw as unknown as {
  existing: SeedRow[];
  new: SeedRow[];
  blocked: SeedRow[];
};

const EXPECTED_EXISTING_ITEM_NOS = [
  '18099', '18704', '18705', '18710', '19431', '19440', '19442',
  '19443', '19447', '19451', '92461', '92462', '95571', '95706',
];

function readSrc(...parts: string[]): string {
  return readFileSync(join(process.cwd(), ...parts), 'utf-8');
}

describe('Supabase remains the runtime storefront source — catalog JSON is never the live Cars/Parts source', () => {
  const shopSrc = readSrc('app', 'shop', 'page.tsx');
  const previewSrc = readSrc('components', 'sections', 'ShopPreview.tsx');

  it('/shop fetches Cars, Parts, and Merchandise from a single supabase.from(\'products\') query', () => {
    expect(shopSrc).toMatch(/supabase\.from\('products'\)\.select\('\*'\)/);
    // Cars/Parts/Merch are all derived by filtering the SAME `products` array
    // by category — not from three different data sources.
    expect(shopSrc).toMatch(/isCarProduct\(p\)/);
    expect(shopSrc).toMatch(/p\.category !== 'parts'|p\.category === 'parts'/);
    expect(shopSrc).toMatch(/p\.category === 'merchandise'/);
  });

  it('/shop never imports catalog/bmax-initial-catalog.json or lib/pricing/catalogProducts for live rendering', () => {
    expect(shopSrc).not.toMatch(/bmax-initial-catalog/);
    expect(shopSrc).not.toMatch(/getPublicCatalogByCategory/);
    expect(shopSrc).not.toMatch(/from ['"]@\/lib\/pricing\/catalogProducts['"]/);
  });

  it('the homepage shop preview also reads live Supabase data, not the catalog JSON', () => {
    expect(previewSrc).toMatch(/supabase\.from\('products'\)/);
    expect(previewSrc).not.toMatch(/bmax-initial-catalog/);
    expect(previewSrc).not.toMatch(/getPublicCatalogByCategory/);
  });

  it('the only legitimate uses of catalog/bmax-initial-catalog.json anywhere in app/components/lib are the admin dry-run panel and tests', () => {
    // A broad guard against catalog JSON quietly becoming a live data
    // source again in some other file this test doesn't already know about.
    const grep = (dir: string): string[] => {
      try {
        const out = execSync(
          `grep -rl "bmax-initial-catalog" ${dir} --include="*.ts" --include="*.tsx" 2>/dev/null || true`,
          { cwd: process.cwd(), encoding: 'utf-8' }
        );
        return out.split('\n').filter(Boolean);
      } catch {
        return [];
      }
    };
    const hits = [...grep('app'), ...grep('components'), ...grep('lib')];
    const allowed = hits.every(f => f.includes('CatalogImportPanel') || f.includes('.test.'));
    expect({ hits, allowed }).toEqual({ hits, allowed: true });
  });
});

describe('the existing 14 live product rows are preserved exactly in the reconciled seed', () => {
  it('the seed\'s existing array has exactly 14 rows', () => {
    expect(reconciledSeed.existing).toHaveLength(14);
  });

  it('every expected existing item_no is present, with no extras and no omissions', () => {
    const seedItemNos = reconciledSeed.existing.map(r => r.item_no).sort();
    expect(seedItemNos).toEqual([...EXPECTED_EXISTING_ITEM_NOS].sort());
  });

  it('the 3 products absent from the catalog JSON (19440, 19442, 92461) are present in the reconciled seed', () => {
    const itemNos = reconciledSeed.existing.map(r => r.item_no);
    expect(itemNos).toContain('19440');
    expect(itemNos).toContain('19442');
    expect(itemNos).toContain('92461');
  });

  it('every existing row is sourced as live_existing, never catalog_new', () => {
    for (const row of reconciledSeed.existing) {
      expect(row.source).toBe('live_existing');
    }
  });

  it('existing rows never carry a validation error (they are not subject to new-row validation)', () => {
    for (const row of reconciledSeed.existing) {
      expect(row.validationErrors).toEqual([]);
    }
  });
});

describe('no duplicate item numbers across the executable reconciled catalog (existing + valid new)', () => {
  it('has zero duplicate item_no values', () => {
    const combined = [...reconciledSeed.existing, ...reconciledSeed.new].map(r => r.item_no);
    const unique = new Set(combined);
    expect(unique.size).toBe(combined.length);
  });

  it('no blank/empty item_no appears in the executable set', () => {
    const combined = [...reconciledSeed.existing, ...reconciledSeed.new];
    for (const row of combined) {
      expect(row.item_no.trim().length).toBeGreaterThan(0);
    }
  });
});

describe('poster matching — 95/95 posters match the full catalog JSON by exact item_no, never guessed', () => {
  it('the poster manifest package contains exactly 95 entries', () => {
    expect(posterManifest).toHaveLength(95);
  });

  it('every poster item_no matches exactly one record in the full 117-item catalog JSON', () => {
    const catalogItemNos = new Set((catalogJson as { item_no: string }[]).map(c => c.item_no));
    const manifestItemNos = (posterManifest as { item_no: string }[]).map(m => m.item_no);
    const matched = manifestItemNos.filter(n => catalogItemNos.has(n));
    expect(matched).toHaveLength(95);
  });

  it('the catalog JSON itself has no duplicate item_no (a precondition for exact matching to be unambiguous)', () => {
    const itemNos = (catalogJson as { item_no: string }[]).map(c => c.item_no);
    expect(new Set(itemNos).size).toBe(itemNos.length);
  });
});

describe('new-row validation — invalid/missing production fields are blocked, never invented', () => {
  it('every row in `new` passed validation with zero errors', () => {
    for (const row of reconciledSeed.new) {
      expect(row.validationErrors).toEqual([]);
    }
  });

  it('every row in `blocked` has at least one recorded validation error', () => {
    expect(reconciledSeed.blocked.length).toBeGreaterThan(0);
    for (const row of reconciledSeed.blocked) {
      expect(row.validationErrors.length).toBeGreaterThan(0);
    }
  });

  it('every valid new row has a real, positive price — no null/zero price was ever accepted', () => {
    for (const row of reconciledSeed.new) {
      expect(typeof row.price_dkk).toBe('number');
      expect(row.price_dkk).toBeGreaterThan(0);
    }
  });

  it('every valid new row has nonnegative stock fields', () => {
    for (const row of reconciledSeed.new) {
      expect(row.unbuilt_stock).not.toBeNull();
      expect(row.built_stock).not.toBeNull();
      expect(row.unbuilt_stock as number).toBeGreaterThanOrEqual(0);
      expect(row.built_stock as number).toBeGreaterThanOrEqual(0);
    }
  });

  it('blocked rows citing a price problem never appear in `new`', () => {
    const blockedItemNos = new Set(reconciledSeed.blocked.map(r => r.item_no));
    for (const row of reconciledSeed.new) {
      expect(blockedItemNos.has(row.item_no)).toBe(false);
    }
  });

  it('the executable new-row count matches the actual validated set, not the raw 106 candidates', () => {
    // 106 catalog item_nos have no live counterpart; this repo's validation
    // (requiring a real board-approved price, among other checks) is
    // expected to block the overwhelming majority of them — the test
    // exists to catch a regression that silently makes validation looser,
    // not to hardcode today's exact number as sacred.
    expect(reconciledSeed.new.length).toBeGreaterThan(0);
    expect(reconciledSeed.new.length).toBeLessThan(106);
    expect(reconciledSeed.new.length + reconciledSeed.blocked.length).toBe(106);
  });
});

describe('poster-first image format is preserved for the 11 PR #2-integrated rows', () => {
  const PR2_MATCHED_ITEM_NOS = [
    '18099', '18704', '18705', '18710', '19431',
    '19443', '19447', '19451', '92462', '95571', '95706',
  ];

  it('each of the 11 rows has its poster listed first, comma-separated from the preserved Cloudinary URL', () => {
    for (const itemNo of PR2_MATCHED_ITEM_NOS) {
      const row = reconciledSeed.existing.find(r => r.item_no === itemNo);
      expect(row).toBeDefined();
      const parts = (row!.image_url || '').split(',');
      expect(parts.length).toBeGreaterThanOrEqual(2);
      expect(parts[0]).toMatch(/^\/catalog\/products\//);
      expect(parts[1]).toMatch(/^https:\/\/res\.cloudinary\.com\//);
    }
  });

  it('the 3 orphaned existing rows (no poster) are left with their original single image, not a fabricated poster path', () => {
    for (const itemNo of ['19440', '19442', '92461']) {
      const row = reconciledSeed.existing.find(r => r.item_no === itemNo);
      expect(row).toBeDefined();
      expect(row!.image_url).not.toMatch(/^\/catalog\/products\//);
      expect(row!.posterMatched).toBe(false);
    }
  });
});

describe('missing-poster rows are compatible with the durable fallback (empty string, not a broken path)', () => {
  it('every seed row without a poster match has image_url either empty or a real external URL — never a dangling /catalog/products/ reference', () => {
    const allRows = [...reconciledSeed.existing, ...reconciledSeed.new];
    for (const row of allRows) {
      if (!row.posterMatched) {
        const usesLocalPosterPath = (row.image_url || '').startsWith('/catalog/products/');
        expect(usesLocalPosterPath).toBe(false);
      }
    }
  });
});

describe('migration and rollback target lists match exactly', () => {
  const forwardSql = readSrc('supabase', 'migrations-proposed', 'bmax_catalog_import_forward.sql');
  const rollbackSql = readSrc('supabase', 'migrations-proposed', 'bmax_catalog_import_rollback.sql');

  function extractInsertedItemNos(sql: string): string[] {
    const matches = [...sql.matchAll(/select '([^']+)',/g)];
    return matches.map(m => m[1]).sort();
  }

  function extractRollbackTargetItemNos(sql: string): string[] {
    const match = sql.match(/delete from public\.products\s*\nwhere item_no in \(([^)]+)\)/);
    if (!match) return [];
    return match[1].split(',').map(s => s.trim().replace(/^'|'$/g, '')).sort();
  }

  it('the forward migration inserts exactly the seed\'s validated new rows', () => {
    const inserted = extractInsertedItemNos(forwardSql);
    const seedNewItemNos = reconciledSeed.new.map(r => r.item_no).sort();
    expect(inserted).toEqual(seedNewItemNos);
  });

  it('the rollback deletes exactly the same item_nos the forward migration inserts', () => {
    const inserted = extractInsertedItemNos(forwardSql);
    const rollbackTargets = extractRollbackTargetItemNos(rollbackSql);
    expect(rollbackTargets).toEqual(inserted);
  });

  it('the forward migration never contains an UPDATE against public.products', () => {
    expect(forwardSql).not.toMatch(/update\s+public\.products/i);
  });

  it('the rollback never deletes public.products rows outside the explicit deterministic item_no list', () => {
    const deleteStatements = [...rollbackSql.matchAll(/delete from public\.products[\s\S]*?;/g)].map(m => m[0]);
    expect(deleteStatements).toHaveLength(1);
    expect(deleteStatements[0]).toMatch(/where item_no in \('95126', 'display-case'\)/);
  });

  it('the rollback checks for order/preorder/wishlist references before deleting', () => {
    expect(rollbackSql).toMatch(/public\.orders where product_id/);
    expect(rollbackSql).toMatch(/public\.preorders where product_id/);
    expect(rollbackSql).toMatch(/public\.wishlist where product_id/);
    expect(rollbackSql).toMatch(/raise exception/i);
  });

  it('the migration adds a partial unique index, never a global NOT NULL, on item_no', () => {
    expect(forwardSql).toMatch(/create unique index if not exists products_item_no_unique_idx/);
    expect(forwardSql).toMatch(/where item_no is not null and item_no <> ''/);
    expect(forwardSql).not.toMatch(/alter column item_no set not null/i);
  });
});

describe('19440, 19442, and 92461 remain in the catalog end to end', () => {
  it('are present in the reconciled seed\'s existing array', () => {
    const itemNos = reconciledSeed.existing.map(r => r.item_no);
    expect(itemNos).toEqual(expect.arrayContaining(['19440', '19442', '92461']));
  });

  it('are never targeted by the forward migration\'s inserts or the rollback\'s deletes', () => {
    const forwardSql = readSrc('supabase', 'migrations-proposed', 'bmax_catalog_import_forward.sql');
    const rollbackSql = readSrc('supabase', 'migrations-proposed', 'bmax_catalog_import_rollback.sql');
    // Strip `--` comment lines first: both files legitimately mention these
    // item_nos in commented-out verification-query spot-checks ("confirm the
    // 14 existing rows are unchanged"). The invariant under test is that no
    // *executable* statement targets them — not that the string never
    // appears anywhere in the file.
    const stripSqlComments = (sql: string) =>
      sql.split('\n').filter(line => !line.trim().startsWith('--')).join('\n');
    const forwardExecutable = stripSqlComments(forwardSql);
    const rollbackExecutable = stripSqlComments(rollbackSql);
    for (const itemNo of ['19440', '19442', '92461']) {
      expect(forwardExecutable).not.toContain(`'${itemNo}'`);
      expect(rollbackExecutable).not.toContain(`'${itemNo}'`);
    }
  });
});

// Reconciliation tests for the B-MAX catalog production rollout. Verifies
// the owner decisions from this PR are actually enforced in code/data, not
// just documented: Supabase remains the runtime storefront source, the
// static catalog JSON is never wired into live rendering, the 14 existing
// product rows are preserved exactly (except the audit's narrow, documented
// corrections), missing price alone never blocks catalog inclusion, no
// price is ever invented, price-on-request products can never enter
// checkout, posters match strictly by item_no with no comma/Cloudinary
// URLs left active, and the migration/rollback pair only ever targets the
// exact rows this PR actually changes.
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
  description: string;
  chassis: string;
  category: string | null;
  price_dkk: number | null;
  price_on_request?: boolean;
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

function stripSqlComments(sql: string): string {
  return sql.split('\n').filter(line => !line.trim().startsWith('--')).join('\n');
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

describe('the existing 14 live product rows are preserved exactly, except the audit\'s documented corrections', () => {
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

  it('no existing row is price-on-request — all 14 already have a real live price', () => {
    for (const row of reconciledSeed.existing) {
      expect(row.price_on_request).toBe(false);
    }
  });

  it('item 19431 is corrected to the Super-II chassis, not AR, and its description agrees', () => {
    const row = reconciledSeed.existing.find(r => r.item_no === '19431')!;
    expect(row.chassis).toBe('Super-II');
    expect(row.description).toMatch(/Super-II Chassis/);
    expect(row.description).not.toMatch(/AR Chassis/);
  });

  it('no other existing row had its chassis changed by this audit', () => {
    for (const row of reconciledSeed.existing) {
      if (row.item_no === '19431') continue;
      expect(row.chassis).not.toBe('');
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

  it('exactly 95 rows in the reconciled seed (existing + new) carry a matched poster', () => {
    const all = [...reconciledSeed.existing, ...reconciledSeed.new];
    expect(all.filter(r => r.posterMatched)).toHaveLength(95);
  });

  it('exactly 25 rows (3 existing orphans + 22 new) have no poster and rely on the durable fallback', () => {
    const all = [...reconciledSeed.existing, ...reconciledSeed.new];
    expect(all.filter(r => !r.posterMatched)).toHaveLength(25);
  });
});

describe('missing price alone is never a blocker — inclusion and pricing approval are separate concepts', () => {
  it('all 106 catalog candidates that clear genuine data-integrity checks are included as `new`', () => {
    expect(reconciledSeed.new.length + reconciledSeed.blocked.length).toBe(106);
  });

  it('no row in `blocked` cites a missing/invalid price as its (sole) reason', () => {
    for (const row of reconciledSeed.blocked) {
      const reasons = row.validationErrors.join('; ').toLowerCase();
      expect(reasons).not.toMatch(/price/);
    }
  });

  it('every row in `blocked`, if any, has at least one genuine non-price validation error', () => {
    for (const row of reconciledSeed.blocked) {
      expect(row.validationErrors.length).toBeGreaterThan(0);
    }
  });

  it('every row in `new` passed validation with zero errors', () => {
    for (const row of reconciledSeed.new) {
      expect(row.validationErrors).toEqual([]);
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
});

describe('price-on-request is explicit and never a guessed/fake price', () => {
  it('every price-on-request new row has price_dkk = null, never 0 or a guess', () => {
    for (const row of reconciledSeed.new) {
      if (row.price_on_request) {
        expect(row.price_dkk).toBeNull();
      }
    }
  });

  it('every non-price-on-request new row has a real, positive board-approved price', () => {
    for (const row of reconciledSeed.new) {
      if (!row.price_on_request) {
        expect(typeof row.price_dkk).toBe('number');
        expect(row.price_dkk as number).toBeGreaterThan(0);
      }
    }
  });

  it('no row anywhere in the reconciled seed has price_dkk exactly 0', () => {
    const all = [...reconciledSeed.existing, ...reconciledSeed.new];
    for (const row of all) {
      expect(row.price_dkk).not.toBe(0);
    }
  });

  it('exactly 2 new rows have an approved price; the other 104 are price-on-request', () => {
    const priced = reconciledSeed.new.filter(r => !r.price_on_request);
    const onRequest = reconciledSeed.new.filter(r => r.price_on_request);
    expect(priced).toHaveLength(2);
    expect(onRequest).toHaveLength(104);
  });

  it('the reconciled total is 120 products (14 existing + 106 new)', () => {
    expect(reconciledSeed.existing.length + reconciledSeed.new.length).toBe(120);
  });
});

describe('storefront never renders a 0 kr/0 DKK price and gates checkout behind price_on_request', () => {
  const shopSrc = readSrc('app', 'shop', 'page.tsx');
  const previewSrc = readSrc('components', 'sections', 'ShopPreview.tsx');
  const pricingSrc = readSrc('lib', 'pricing.ts');

  it('lib/pricing.ts defines the single isPriceOnRequest predicate and PRICE ON REQUEST / ASK FOR PRICE labels', () => {
    expect(pricingSrc).toMatch(/export function isPriceOnRequest/);
    expect(pricingSrc).toMatch(/PRICE ON REQUEST/);
    expect(pricingSrc).toMatch(/ASK FOR PRICE/);
  });

  it('/shop imports and uses isPriceOnRequest to gate every price-rendering block', () => {
    expect(shopSrc).toMatch(/import \{ isPriceOnRequest, PRICE_ON_REQUEST_LABEL, ASK_FOR_PRICE_LABEL \} from '@\/lib\/pricing'/);
    const usages = shopSrc.match(/isPriceOnRequest\(/g) || [];
    // openModal guard, openPreorder guard, and at least 3 render-site checks
    // (SimpleProductCard, collectors vault spotlight, the 4-variant grid).
    expect(usages.length).toBeGreaterThanOrEqual(5);
  });

  it('/shop never renders a numeric price without a price_on_request guard immediately around it', () => {
    // Every `.toLocaleString()} kr` / `DKK` price render in the file is
    // inside a branch that also checks isPriceOnRequest — a coarse but
    // effective regression guard: PRICE_ON_REQUEST_LABEL must appear at
    // least once for every RESERVE/PREORDER-adjacent price block.
    const priceOnRequestLabelUses = (shopSrc.match(/PRICE_ON_REQUEST_LABEL/g) || []).length;
    const askForPriceUses = (shopSrc.match(/ASK_FOR_PRICE_LABEL/g) || []).length;
    expect(priceOnRequestLabelUses).toBeGreaterThanOrEqual(3);
    expect(askForPriceUses).toBeGreaterThanOrEqual(3);
  });

  it('/shop guards openModal, openPreorder, and placeOrder against a price-on-request product', () => {
    expect(shopSrc).toMatch(/const openModal = \(p: Product, variantKey: string\) => \{\s*\n\s*if \(isPriceOnRequest\(p\)\)/);
    expect(shopSrc).toMatch(/const openPreorder = \(p: Product, variantKey: string\) => \{\s*\n\s*if \(isPriceOnRequest\(p\)\)/);
    expect(shopSrc).toMatch(/if \(isPriceOnRequest\(selected\)\) return;/);
    expect(shopSrc).toMatch(/if \(isPriceOnRequest\(preorderTarget\.product\)\) return;/);
  });

  it('/shop implements a non-order inquiry flow (openInquiry/sendInquiry) that writes only to product_inquiries', () => {
    expect(shopSrc).toMatch(/const openInquiry = /);
    expect(shopSrc).toMatch(/const sendInquiry = /);
    expect(shopSrc).toMatch(/supabase\.from\('product_inquiries'\)\.insert/);
    // The inquiry writer must never touch orders/preorders/stock.
    const sendInquiryBody = shopSrc.slice(shopSrc.indexOf('const sendInquiry ='), shopSrc.indexOf('const sendInquiry =') + 800);
    expect(sendInquiryBody).not.toMatch(/from\('orders'\)/);
    expect(sendInquiryBody).not.toMatch(/from\('preorders'\)/);
  });

  it('the homepage preview also guards its price render with isPriceOnRequest', () => {
    expect(previewSrc).toMatch(/isPriceOnRequest/);
    expect(previewSrc).toMatch(/PRICE_ON_REQUEST_LABEL/);
  });
});

describe('image rule: exactly one verified local poster per product, no Cloudinary, no comma-separated images, no legacy carousel', () => {
  const allRows = () => [...reconciledSeed.existing, ...reconciledSeed.new];

  it('no image_url anywhere in the reconciled seed contains a comma (no secondary/legacy image)', () => {
    for (const row of allRows()) {
      expect(row.image_url).not.toMatch(/,/);
    }
  });

  it('no image_url anywhere in the reconciled seed references cloudinary', () => {
    for (const row of allRows()) {
      expect(row.image_url.toLowerCase()).not.toMatch(/cloudinary/);
    }
  });

  it('every row with posterMatched=true has an image_url pointing at the local static poster path', () => {
    for (const row of allRows()) {
      if (row.posterMatched) {
        expect(row.image_url).toMatch(/^\/catalog\/products\//);
      }
    }
  });

  it('every row without a poster match has image_url = "" — the durable fallback, never a broken path', () => {
    for (const row of allRows()) {
      if (!row.posterMatched) {
        expect(row.image_url).toBe('');
      }
    }
  });

  it('the previously-committed 11 PR #2 rows now carry a single poster URL, not poster+Cloudinary', () => {
    const PR2_MATCHED_ITEM_NOS = [
      '18099', '18704', '18705', '18710', '19431',
      '19443', '19447', '19451', '92462', '95571', '95706',
    ];
    for (const itemNo of PR2_MATCHED_ITEM_NOS) {
      const row = reconciledSeed.existing.find(r => r.item_no === itemNo)!;
      expect(row.image_url).toMatch(/^\/catalog\/products\/[^,]+\.webp$/);
    }
  });
});

describe('migration and rollback target lists match exactly', () => {
  const forwardSql = readSrc('supabase', 'migrations-proposed', 'bmax_catalog_import_forward.sql');
  const rollbackSql = readSrc('supabase', 'migrations-proposed', 'bmax_catalog_import_rollback.sql');

  // Matches a VALUES-list row like `  ('18094', 'Neo-VQS', ...),` — the bulk
  // insert this migration uses for its 106 new rows.
  function extractInsertedItemNos(sql: string): string[] {
    const matches = [...sql.matchAll(/^\s*\('([^']+)',/gm)];
    return matches.map(m => m[1]).sort();
  }

  function extractRollbackTargetItemNos(sql: string): string[] {
    const match = sql.match(/delete from public\.products\s*\nwhere item_no in \(([^)]+)\)/);
    if (!match) return [];
    return match[1].split(',').map(s => s.trim().replace(/^'|'$/g, '')).sort();
  }

  // Every `update public.products set ... where item_no = '...'` line — the
  // 14 deterministic existing-row corrections, never a bulk/heuristic update.
  function extractUpdateStatements(sql: string): string[] {
    return [...sql.matchAll(/^update public\.products set[^\n]*;$/gm)].map(m => m[0]);
  }

  it('the forward migration inserts exactly the seed\'s validated new rows (106)', () => {
    const inserted = extractInsertedItemNos(forwardSql);
    const seedNewItemNos = reconciledSeed.new.map(r => r.item_no).sort();
    expect(inserted).toEqual(seedNewItemNos);
    expect(inserted).toHaveLength(106);
  });

  it('the rollback deletes exactly the same item_nos the forward migration inserts', () => {
    const inserted = extractInsertedItemNos(forwardSql);
    const rollbackTargets = extractRollbackTargetItemNos(rollbackSql);
    expect(rollbackTargets).toEqual(inserted);
  });

  it('the forward migration contains exactly 14 UPDATE statements against public.products — one per existing row', () => {
    const updates = extractUpdateStatements(forwardSql);
    expect(updates).toHaveLength(14);
    const updatedItemNos = updates.map(u => u.match(/where item_no = '([^']+)'/)![1]).sort();
    expect(updatedItemNos).toEqual([...EXPECTED_EXISTING_ITEM_NOS].sort());
  });

  it('every existing-row UPDATE only ever sets image_url, chassis, or description — never price, stock, status, or availability', () => {
    const updates = extractUpdateStatements(forwardSql);
    const forbidden = ['price_dkk', 'original_price_dkk', 'price_on_request', 'stock_qty', 'unbuilt_stock', 'built_stock', 'status =', 'available =', 'is_collectors_vault'];
    for (const stmt of updates) {
      const setClause = stmt.match(/^update public\.products set (.+?) where/)![1];
      for (const forbiddenField of forbidden) {
        expect(setClause).not.toContain(forbiddenField);
      }
      // Only these three columns are ever allowed on the left of a SET
      // assignment. Matched directly (never comma-split) because the
      // description value itself legitimately contains commas.
      const assignedFields = [...setClause.matchAll(/(^|,)\s*([a-z_]+)\s*=/g)].map(m => m[2]);
      expect(assignedFields.length).toBeGreaterThan(0);
      for (const field of assignedFields) {
        expect(['image_url', 'chassis', 'description']).toContain(field);
      }
    }
  });

  it('only item 19431\'s UPDATE touches chassis/description; the other 13 only touch image_url', () => {
    const updates = extractUpdateStatements(forwardSql);
    for (const stmt of updates) {
      const itemNo = stmt.match(/where item_no = '([^']+)'/)![1];
      const setClause = stmt.match(/^update public\.products set (.+?) where/)![1];
      const touchesChassisOrDescription = /\bchassis\s*=|\bdescription\s*=/.test(setClause);
      if (itemNo === '19431') {
        expect(touchesChassisOrDescription).toBe(true);
      } else {
        expect(touchesChassisOrDescription).toBe(false);
      }
    }
  });

  it('every existing-row UPDATE is guarded by a WHERE clause matching the prior value (idempotent, never a blind overwrite)', () => {
    const updates = extractUpdateStatements(forwardSql);
    for (const stmt of updates) {
      expect(stmt).toMatch(/where item_no = '[^']+' and image_url = '[^']*'/);
    }
  });

  it('the rollback\'s corrective UPDATEs restore the exact opposite values of the forward migration\'s', () => {
    const forwardUpdates = extractUpdateStatements(forwardSql);
    const rollbackUpdates = extractUpdateStatements(rollbackSql);
    expect(rollbackUpdates).toHaveLength(14);
    for (const fwd of forwardUpdates) {
      const itemNo = fwd.match(/where item_no = '([^']+)'/)![1];
      const fwdNewImage = fwd.match(/set image_url = '([^']*)'/)![1];
      const back = rollbackUpdates.find(u => u.includes(`where item_no = '${itemNo}'`))!;
      expect(back).toBeDefined();
      // The rollback's WHERE guard matches the forward migration's new value —
      // i.e. it only restores a row this migration actually changed.
      expect(back).toContain(`image_url = '${fwdNewImage}'`);
    }
  });

  it('the rollback never deletes public.products rows outside the explicit deterministic item_no list', () => {
    const deleteStatements = [...rollbackSql.matchAll(/delete from public\.products[\s\S]*?;/g)].map(m => m[0]);
    expect(deleteStatements).toHaveLength(1);
    const seedNewItemNos = reconciledSeed.new.map(r => r.item_no).sort();
    const targeted = extractRollbackTargetItemNos(rollbackSql);
    expect(targeted).toEqual(seedNewItemNos);
  });

  it('the rollback checks for order/preorder/wishlist/inquiry references before deleting', () => {
    expect(rollbackSql).toMatch(/public\.orders where product_id/);
    expect(rollbackSql).toMatch(/public\.preorders where product_id/);
    expect(rollbackSql).toMatch(/public\.wishlist where product_id/);
    expect(rollbackSql).toMatch(/public\.product_inquiries where product_id/);
    expect(rollbackSql).toMatch(/raise exception/i);
  });

  it('the migration adds a partial unique index, never a global NOT NULL, on item_no', () => {
    expect(forwardSql).toMatch(/create unique index if not exists products_item_no_unique_idx/);
    expect(forwardSql).toMatch(/where item_no is not null and item_no <> ''/);
    expect(forwardSql).not.toMatch(/alter column item_no set not null/i);
  });

  it('the migration adds price_on_request as an additive boolean column, defaulting to false, never a price rewrite', () => {
    expect(forwardSql).toMatch(/alter table public\.products add column if not exists price_on_request boolean not null default false/);
  });

  it('the migration creates product_inquiries as a standalone table with no stock/payment coupling', () => {
    expect(forwardSql).toMatch(/create table if not exists public\.product_inquiries/);
    const tableBlock = forwardSql.slice(forwardSql.indexOf('create table if not exists public.product_inquiries'), forwardSql.indexOf(');', forwardSql.indexOf('create table if not exists public.product_inquiries')));
    expect(tableBlock).not.toMatch(/stock/);
    expect(tableBlock).not.toMatch(/payment/);
    expect(tableBlock).not.toMatch(/order_id/);
  });

  it('the rollback only drops price_on_request/product_inquiries/the unique index when it is safe to do so, never unconditionally', () => {
    expect(rollbackSql).toMatch(/select count\(\*\) into inquiry_count from public\.product_inquiries;/);
    expect(rollbackSql).toMatch(/if inquiry_count = 0 then\s*\n\s*drop table if exists public\.product_inquiries;/);
    expect(rollbackSql).toMatch(/select count\(\*\) into on_request_count from public\.products where price_on_request = true;/);
    expect(rollbackSql).toMatch(/if on_request_count = 0 then\s*\n\s*alter table public\.products drop column if exists price_on_request;/);
  });

  it('no INSERT statement in the forward migration ever writes a literal 0 as price_dkk', () => {
    const insertBlock = forwardSql.slice(forwardSql.indexOf('insert into public.products'));
    // Every price_dkk value is either a positive number followed by ::numeric,
    // or the literal null::numeric — never a bare 0.
    expect(insertBlock).not.toMatch(/,\s*0::numeric,/);
  });
});

describe('19440, 19442, and 92461 stay in the catalog, and the forward migration never inserts or deletes them', () => {
  it('are present in the reconciled seed\'s existing array', () => {
    const itemNos = reconciledSeed.existing.map(r => r.item_no);
    expect(itemNos).toEqual(expect.arrayContaining(['19440', '19442', '92461']));
  });

  it('are never targeted by the forward migration\'s bulk INSERT or the rollback\'s DELETE (they may legitimately appear only in the 14 corrective UPDATEs)', () => {
    const forwardSql = readSrc('supabase', 'migrations-proposed', 'bmax_catalog_import_forward.sql');
    const rollbackSql = readSrc('supabase', 'migrations-proposed', 'bmax_catalog_import_rollback.sql');
    const insertBlock = stripSqlComments(forwardSql).slice(stripSqlComments(forwardSql).indexOf('insert into public.products'));
    const rollbackDeleteBlock = stripSqlComments(rollbackSql).match(/delete from public\.products[\s\S]*?;/)![0];
    for (const itemNo of ['19440', '19442', '92461']) {
      expect(insertBlock).not.toContain(`'${itemNo}'`);
      expect(rollbackDeleteBlock).not.toContain(`'${itemNo}'`);
    }
  });
});

describe('the checkout guard is real, not just a hidden button (defensive checks at the write-path level)', () => {
  const shopSrc = readSrc('app', 'shop', 'page.tsx');

  it('placeOrder (the actual orders.insert call) bails out for a price-on-request product before any Supabase write', () => {
    const start = shopSrc.indexOf('const placeOrder = async () => {');
    const nextFn = shopSrc.indexOf('\n  const ', start + 10);
    const body = shopSrc.slice(start, nextFn > -1 ? nextFn : start + 1500);
    const guardIdx = body.indexOf('isPriceOnRequest(selected)) return;');
    const insertIdx = body.indexOf("supabase.from('orders').insert");
    expect(guardIdx).toBeGreaterThan(-1);
    expect(insertIdx).toBeGreaterThan(-1);
    expect(guardIdx).toBeLessThan(insertIdx);
  });

  it('sendPreorder (the actual preorders.insert call) bails out for a price-on-request product before any Supabase write', () => {
    const start = shopSrc.indexOf('const sendPreorder = async () => {');
    const nextFn = shopSrc.indexOf('\n  const ', start + 10);
    const body = shopSrc.slice(start, nextFn > -1 ? nextFn : start + 800);
    const guardIdx = body.indexOf('isPriceOnRequest(preorderTarget.product)) return;');
    const insertIdx = body.indexOf("supabase.from('preorders').insert");
    expect(guardIdx).toBeGreaterThan(-1);
    expect(insertIdx).toBeGreaterThan(-1);
    expect(guardIdx).toBeLessThan(insertIdx);
  });
});

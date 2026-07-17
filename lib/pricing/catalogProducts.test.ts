import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getAllCatalogItems, getPublicCatalog, getPublicCatalogByCategory, getPublicCatalogByShopGroup, getDisplayCaseCatalogItem } from './catalogProducts';

describe('catalogProducts — no Supabase writes from static catalog loading', () => {
  it('catalogProducts.ts has no Supabase import or client usage — reads only the bundled JSON', () => {
    const src = readFileSync(join(process.cwd(), 'lib', 'pricing', 'catalogProducts.ts'), 'utf-8');
    expect(src).not.toMatch(/from\s+['"].*supabase.*['"]/i);
    expect(src).not.toMatch(/createClient\s*\(/);
    expect(src).toMatch(/from\s+['"]@\/catalog\/bmax-initial-catalog\.json['"]/);
  });

  it('reading the full catalog twice returns the same cached array reference — proves no per-call fetch/write occurs', () => {
    expect(getAllCatalogItems()).toBe(getAllCatalogItems());
  });
});

describe('catalogProducts — public catalog loader', () => {
  it('returns all 117 curated records', () => {
    expect(getAllCatalogItems()).toHaveLength(117);
  });

  it('the public catalog includes every visible record (all 117 — none hidden for price/stock reasons)', () => {
    expect(getPublicCatalog()).toHaveLength(117);
  });

  it('splits into 50 cars, 66 parts, 1 accessory', () => {
    expect(getPublicCatalogByCategory('cars')).toHaveLength(50);
    expect(getPublicCatalogByCategory('parts')).toHaveLength(66);
    expect(getPublicCatalogByCategory('accessories')).toHaveLength(1);
  });

  it('Beak Stinger G shows its corrected 359 DKK Collector price, never 339', () => {
    const item = getPublicCatalog().find(i => i.raw.item_no === '19447')!;
    expect(item.priceDkk).toBe(359);
    expect(item.priceDkk).not.toBe(339);
    expect(item.publicState).toBe('OUT_OF_STOCK'); // priced, zero stock -> visible, not purchasable
    expect(item.purchasable).toBe(false);
  });

  it('Magnum Saber Premium (19431) shows PRICE_PENDING with no price, on Super-II chassis', () => {
    const item = getPublicCatalog().find(i => i.raw.item_no === '19431')!;
    expect(item.raw.name).toBe('Magnum Saber Premium');
    expect(item.raw.chassis).toBe('Super-II');
    expect(item.publicState).toBe('PRICE_PENDING');
    expect(item.priceDkk).toBeNull();
    expect(item.purchasable).toBe(false);
    expect(item.allowsRestockInterest).toBe(true);
  });

  it('an unpriced part (e.g. any unverified motor) is visible with PRICE_PENDING and no price', () => {
    const unpricedPart = getPublicCatalogByCategory('parts').find(i => i.raw.pricing_source === 'unverified');
    expect(unpricedPart).toBeDefined();
    expect(unpricedPart!.publicState).toBe('PRICE_PENDING');
    expect(unpricedPart!.priceDkk).toBeNull();
  });

  it('a legitimate 339 DKK price is not banned by construction — the rule only forbids a fabricated fallback, not the number', () => {
    // No item happens to be priced at 339 today, but nothing in priceDkk's
    // derivation (display.showPrice && raw.approved_regular_price_dkk) special-cases
    // or excludes that specific number — it always reflects whatever the
    // approval pipeline set, whatever the value.
    const at339 = getPublicCatalog().filter(i => i.priceDkk === 339);
    expect(at339).toHaveLength(0); // true today, not because 339 is banned
    // Every priced item's priceDkk traces to raw.approved_regular_price_dkk —
    // there is no separate hardcoded default anywhere in this derivation.
    for (const item of getPublicCatalog().filter(i => i.priceDkk != null)) {
      expect(item.priceDkk).toBe(item.raw.approved_regular_price_dkk);
    }
  });

  it('every PRICE_PENDING item shows no price and cannot be purchased', () => {
    for (const item of getPublicCatalog().filter(i => i.publicState === 'PRICE_PENDING')) {
      expect(item.priceDkk).toBeNull();
      expect(item.purchasable).toBe(false);
    }
  });
});

describe('catalogProducts — shop_group taxonomy', () => {
  it('getPublicCatalogByShopGroup returns the expected counts', () => {
    expect(getPublicCatalogByShopGroup('beginner_basic')).toHaveLength(19);
    expect(getPublicCatalogByShopGroup('official_starter_pack')).toHaveLength(3);
    expect(getPublicCatalogByShopGroup('advanced_bmax')).toHaveLength(14);
    expect(getPublicCatalogByShopGroup('collector_limited')).toHaveLength(13);
    expect(getPublicCatalogByShopGroup('coming_soon_greenland')).toHaveLength(1);
    expect(getPublicCatalogByShopGroup('parts_upgrades')).toHaveLength(66);
    expect(getPublicCatalogByShopGroup('accessories')).toHaveLength(1);
  });

  it('Iron Beak (Coming Soon to Greenland) shows the customer-facing "COMING SOON TO GREENLAND" label, not generic PRICE PENDING', () => {
    const item = getPublicCatalogByShopGroup('coming_soon_greenland')[0];
    expect(item.raw.item_no).toBe('95190');
    expect(item.customerStatusLabel).toBe('COMING SOON TO GREENLAND');
    expect(item.publicState).toBe('PRICE_PENDING'); // still the same underlying state — see publicProductState.ts
  });

  it('a normal PRICE_PENDING item outside coming_soon_greenland keeps the generic badge label', () => {
    const item = getPublicCatalogByShopGroup('beginner_basic').find(i => i.publicState === 'PRICE_PENDING')!;
    expect(item.customerStatusLabel).toBe('PRICE PENDING');
  });
});

describe('catalogProducts — display case', () => {
  it('getDisplayCaseCatalogItem returns the one shared accessory record', () => {
    const item = getDisplayCaseCatalogItem();
    expect(item).toBeDefined();
    expect(item!.raw.item_no).toBe('display-case');
    expect(item!.raw.category).toBe('accessories');
    expect(item!.raw.shop_group).toBe('accessories');
    expect(item!.priceDkk).toBe(229); // the standalone price
  });
});

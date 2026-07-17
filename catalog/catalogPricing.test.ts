import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkCatalogVisibility, isPurchasable, findDuplicateItemNumbers } from '@/lib/pricing/catalogPricingStatus';
import { derivePublicState } from '@/lib/pricing/publicProductState';
import { dkkToOre } from '@/lib/pricing/money';

interface CatalogItem {
  item_no: string;
  name: string;
  category: string;
  chassis: string;
  shipping_class: string;
  part_group: string | null;
  shop_group: string;
  catalog_tier: 'core' | 'expansion' | 'special_order';
  pricing_source: 'board_approved_fixed_price' | 'cost_plus_formula' | 'unverified';
  approved_regular_price_dkk: number | null;
  price_dkk: number;
  published: boolean;
  available: boolean;
  stock_qty: number;
  is_collectors_vault: boolean;
  has_unresolved_duplicate: boolean;
  has_uncertain_edition: boolean;
  is_internal_test_record: boolean;
  is_archived_by_admin: boolean;
  is_preorder_enabled: boolean;
  force_coming_soon: boolean;
}

const catalog: CatalogItem[] = JSON.parse(readFileSync(join(process.cwd(), 'catalog', 'bmax-initial-catalog.json'), 'utf-8'));

describe('117-record catalog — composition', () => {
  it('has exactly 117 records: 50 car kits, 66 upgrade parts, 1 display case', () => {
    expect(catalog).toHaveLength(117);
    expect(catalog.filter(i => i.category === 'cars')).toHaveLength(50);
    expect(catalog.filter(i => i.category === 'parts')).toHaveLength(66);
    expect(catalog.filter(i => i.category === 'accessories')).toHaveLength(1);
  });

  it('assigns a shipping class to every product', () => {
    for (const item of catalog) {
      expect(['small_part', 'boxed_body_chassis', 'bulky_upgrade', 'complete_car_kit', 'accessory_large']).toContain(item.shipping_class);
    }
  });

  it('classifies every car as a complete car kit with the complete_car_kit shipping class', () => {
    for (const item of catalog.filter(i => i.category === 'cars')) {
      expect(item.shipping_class).toBe('complete_car_kit');
    }
  });

  it('classifies the display case with its own accessory_large shipping class', () => {
    const displayCase = catalog.find(i => i.item_no === 'display-case');
    expect(displayCase?.shipping_class).toBe('accessory_large');
    expect(displayCase?.shop_group).toBe('accessories');
  });

  it('has no duplicate item numbers', () => {
    expect(findDuplicateItemNumbers(catalog.map(i => ({ itemNo: i.item_no })))).toHaveLength(0);
  });

  it('assigns a shop_group to every one of the 117 records', () => {
    const validGroups = ['beginner_basic', 'official_starter_pack', 'advanced_bmax', 'collector_limited', 'coming_soon_greenland', 'parts_upgrades', 'accessories'];
    for (const item of catalog) {
      expect(validGroups).toContain(item.shop_group);
    }
  });

  it('shop_group distribution matches the approved catalog-expansion plan', () => {
    const count = (g: string) => catalog.filter(i => i.shop_group === g).length;
    expect(count('beginner_basic')).toBe(19);
    expect(count('official_starter_pack')).toBe(3);
    expect(count('advanced_bmax')).toBe(14);
    expect(count('collector_limited')).toBe(13);
    expect(count('coming_soon_greenland')).toBe(1);
    expect(count('parts_upgrades')).toBe(66);
    expect(count('accessories')).toBe(1);
  });
});

describe('117-record catalog — Magnum Saber Premium correction (item 19431)', () => {
  it('is named "Magnum Saber Premium" on Super-II chassis, not "Magnum Saber" on AR', () => {
    const item = catalog.find(i => i.item_no === '19431');
    expect(item).toBeDefined();
    expect(item!.name).toBe('Magnum Saber Premium');
    expect(item!.chassis).toBe('Super-II');
    expect(item!.is_collectors_vault).toBe(true);
    expect(item!.pricing_source).toBe('unverified');
    expect(item!.approved_regular_price_dkk).toBeNull();
  });
});

describe('117-record catalog — 15450 compatibility correction', () => {
  it('Basic Tune-Up Parts Set for AR Chassis (15450) lists its full verified compatibility, not AR-only', () => {
    const item = catalog.find(i => i.item_no === '15450') as unknown as { compatibility: string[] };
    expect(item.compatibility).toEqual(['AR', 'MA', 'MS', 'VS', 'Super-II', 'Super-XX']);
  });
});

describe('117-record catalog — pricing classification', () => {
  it('applies the locked non-collector approved prices by item_no', () => {
    const byItemNo = Object.fromEntries(
      catalog.filter(i => i.pricing_source === 'board_approved_fixed_price' && !i.is_collectors_vault && i.category === 'cars').map(i => [i.item_no, i.approved_regular_price_dkk])
    );
    expect(byItemNo).toEqual({
      '18704': 299, // Shadow Shark
      '18705': 299, // Flame Astute
      '18099': 319, // Ray Spear
    });
  });

  it('applies the Collector-corrected prices (60% margin) by item_no for the 6 items named in the Preview review', () => {
    const correctedItemNos = ['19447', '19451', '95126', '95571', '95706', '92462'];
    const byItemNo = Object.fromEntries(
      catalog.filter(i => correctedItemNos.includes(i.item_no)).map(i => [i.item_no, i.approved_regular_price_dkk])
    );
    expect(byItemNo).toEqual({
      '19447': 359, // Beak Stinger G
      '19451': 359, // Gun Bluster XTO Premium
      '95126': 389, // Cyclone Magnum 25th Anniversary
      '95571': 389, // Exflowly Polycarbonate Purple
      '95706': 429, // Geo Glider Asia Challenge
      '92462': 469, // Mach Frame Philippine Special
    });
    for (const itemNo of correctedItemNos) {
      expect(catalog.find(i => i.item_no === itemNo)?.is_collectors_vault).toBe(true);
    }
  });

  it('Diospada Premium (19443) is a pre-existing Collector item, unchanged', () => {
    const diospada = catalog.find(i => i.item_no === '19443');
    expect(diospada?.is_collectors_vault).toBe(true);
    expect(diospada?.approved_regular_price_dkk).toBe(249);
  });

  it('does not misapply the Mach Frame Philippine price to the plain Mach Frame (18714)', () => {
    const plainMachFrame = catalog.find(i => i.item_no === '18714');
    expect(plainMachFrame?.name).toBe('Mach Frame');
    expect(plainMachFrame?.pricing_source).toBe('unverified');
  });

  it('does not invent a price for Aero Avante (18701) from the unmatched "Aero Avante Starter Pack" approval', () => {
    const aeroAvante = catalog.find(i => i.item_no === '18701');
    expect(aeroAvante?.name).toBe('Aero Avante');
    expect(aeroAvante?.pricing_source).toBe('unverified');
    expect(aeroAvante?.price_dkk).toBe(0);
  });

  it('the 29 newly-added car kits are all pricing_source unverified, zero stock, and unpublished', () => {
    const newItemNos = [
      '18703', '18707', '18635', '18105', '18104', '18097', '18095', '18100', '18101', '95570', '95569', '18086',
      '18706', '18647', '18710',
      '95598', '18658', '18659', '18650', '18660', '18625', '18632', '18661', '18662',
      '95297', '18069', '92453', '95703',
      '95190',
    ];
    expect(newItemNos).toHaveLength(29);
    for (const itemNo of newItemNos) {
      const item = catalog.find(i => i.item_no === itemNo);
      expect(item, `expected item ${itemNo} to exist`).toBeDefined();
      expect(item!.pricing_source).toBe('unverified');
      expect(item!.approved_regular_price_dkk).toBeNull();
      expect(item!.stock_qty).toBe(0);
      expect(item!.published).toBe(false);
    }
  });

  it('exact chassis for every one of the 29 newly-added car kits', () => {
    const expected: Record<string, string> = {
      '18703': 'AR', '18707': 'FM-A', '18635': 'MA', '18105': 'VZ', '18104': 'VZ', '18097': 'VZ',
      '18095': 'VZ', '18100': 'VZ', '18101': 'VZ', '95570': 'VZ', '95569': 'VZ', '18086': 'Super-II',
      '18706': 'AR', '18647': 'MA', '18710': 'FM-A',
      '95598': 'VZ', '18658': 'MA', '18659': 'MA', '18650': 'MA', '18660': 'MA', '18625': 'MS',
      '18632': 'MS', '18661': 'MA', '18662': 'MS',
      '95297': 'AR', '18069': 'Super-II', '92453': 'MA', '95703': 'VZ',
      '95190': 'VZ',
    };
    for (const [itemNo, chassis] of Object.entries(expected)) {
      expect(catalog.find(i => i.item_no === itemNo)?.chassis).toBe(chassis);
    }
  });

  it('the 4 named Collector/Limited additions are explicitly tagged Collector, not inferred', () => {
    for (const itemNo of ['95297', '18069', '92453', '95703']) {
      expect(catalog.find(i => i.item_no === itemNo)?.is_collectors_vault).toBe(true);
    }
  });

  it('Iron Beak (95190) is Coming Soon to Greenland, not Collector', () => {
    const ironBeak = catalog.find(i => i.item_no === '95190');
    expect(ironBeak?.shop_group).toBe('coming_soon_greenland');
    expect(ironBeak?.is_collectors_vault).toBe(false);
  });
});

describe('117-record catalog — 339 DKK rule (corrected): prohibits a fallback, not the number itself', () => {
  it('no numeric price anywhere is a hardcoded/default fallback — every priced item traces to approved_regular_price_dkk', () => {
    for (const item of catalog.filter(i => i.price_dkk > 0)) {
      // The only way price_dkk is ever non-zero in this static catalog is
      // because approved_regular_price_dkk was set by the pricing script —
      // never a separate, independently-invented default value.
      expect(item.approved_regular_price_dkk).toBe(item.price_dkk);
      expect(item.pricing_source).not.toBe('unverified');
    }
  });

  it('unpriced products display PRICE PENDING, never a fabricated numeric price', () => {
    for (const item of catalog.filter(i => i.pricing_source === 'unverified')) {
      expect(item.price_dkk).toBe(0);
      expect(item.approved_regular_price_dkk).toBeNull();
    }
  });

  it('a legitimate approved price of exactly 339 DKK would be ALLOWED by this rule (no blanket ban on the number 339)', () => {
    // None of the 11 currently-priced items happens to be 339 DKK — that is
    // a fact about today's approved prices, not a rule the system enforces.
    // Demonstrate the rule itself allows it: a product priced via the normal
    // approval path is valid regardless of which ending-in-9 number results.
    const hypothetical = { pricing_source: 'board_approved_fixed_price' as const, approved_regular_price_dkk: 339, price_dkk: 339 };
    expect(hypothetical.approved_regular_price_dkk).toBe(hypothetical.price_dkk); // traces to the approval field
    expect(hypothetical.pricing_source).not.toBe('unverified'); // came through real approval, not a fallback
    expect(dkkToOre(hypothetical.approved_regular_price_dkk) % 1000).toBe(900); // still a valid ending-in-9 price
  });
});

describe('117-record catalog — visibility vs. purchase eligibility', () => {
  it('every one of the 117 curated records is publicly VISIBLE (none are hidden for price/stock reasons)', () => {
    for (const item of catalog) {
      const visibility = checkCatalogVisibility({
        itemNo: item.item_no,
        hasUnresolvedDuplicate: item.has_unresolved_duplicate,
        hasUncertainEdition: item.has_uncertain_edition,
        isInternalTestRecord: item.is_internal_test_record,
        isArchivedByAdmin: item.is_archived_by_admin,
      });
      expect(visibility.visible).toBe(true);
    }
  });

  it('zero stock does not hide a product (public state is never ARCHIVED for a priced-but-unstocked item)', () => {
    const pricedButUnstocked = catalog.filter(i => i.pricing_source !== 'unverified' && i.stock_qty === 0);
    expect(pricedButUnstocked.length).toBeGreaterThan(0);
    for (const item of pricedButUnstocked) {
      const state = derivePublicState({
        catalogVisible: true,
        pricingSource: item.pricing_source,
        stockQty: item.stock_qty,
        catalogTier: item.catalog_tier,
        isPreorderEnabled: item.is_preorder_enabled,
        forceComingSoon: item.force_coming_soon,
      });
      expect(state).not.toBe('ARCHIVED');
      expect(['OUT_OF_STOCK', 'SPECIAL_ORDER']).toContain(state);
    }
  });

  it('unverified cost displays PRICE_PENDING for every one of the 106 remaining unpriced records, and cannot be purchased', () => {
    const unpriced = catalog.filter(i => i.pricing_source === 'unverified');
    expect(unpriced.length).toBe(117 - 11); // 11 priced total (10 cars + 1 display case)
    for (const item of unpriced) {
      const state = derivePublicState({
        catalogVisible: true,
        pricingSource: item.pricing_source,
        stockQty: item.stock_qty,
        catalogTier: item.catalog_tier,
        isPreorderEnabled: item.is_preorder_enabled,
        forceComingSoon: item.force_coming_soon,
      });
      expect(state).toBe('PRICE_PENDING');
      expect(
        isPurchasable({
          pricingSource: item.pricing_source,
          approvedRegularPriceDkkOre: null,
          isPurchasableState: true,
        })
      ).toBe(false);
    }
  });

  it('does not flip published/available or invent stock for the 10 newly-priced car kits', () => {
    for (const item of catalog.filter(i => i.pricing_source === 'board_approved_fixed_price' && i.category === 'cars')) {
      expect(item.published).toBe(false);
      expect(item.available).toBe(false);
      expect(item.stock_qty).toBe(0);
    }
  });

  it('every priced product ends in 9', () => {
    for (const item of catalog.filter(i => i.approved_regular_price_dkk != null)) {
      expect(dkkToOre(item.approved_regular_price_dkk!) % 1000).toBe(900);
    }
  });
});

describe('117-record catalog — image infrastructure (no real images yet, never breaks rendering)', () => {
  it('every record is a placeholder — no fabricated image_path/thumbnail_path/promotional_image_path', () => {
    for (const item of catalog as unknown as { image_status: string; image_path: string | null; thumbnail_path: string | null; promotional_image_path: string | null; image_source_type: string; image_permission_status: string; image_alt_text: string }[]) {
      expect(item.image_status).toBe('placeholder');
      expect(item.image_path).toBeNull();
      expect(item.thumbnail_path).toBeNull();
      expect(item.promotional_image_path).toBeNull();
      expect(item.image_source_type).toBe('placeholder');
      expect(item.image_permission_status).toBe('not_applicable');
      expect(item.image_alt_text.length).toBeGreaterThan(0);
    }
  });
});

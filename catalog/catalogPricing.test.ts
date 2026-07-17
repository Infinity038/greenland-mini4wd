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
  shipping_class: string;
  part_group: string | null;
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

describe('87-product catalog — pricing classification', () => {
  it('has exactly 87 products (20 original car kits + Magnum Saber, 66 upgrade parts)', () => {
    expect(catalog).toHaveLength(87);
    expect(catalog.filter(i => i.category === 'cars')).toHaveLength(21);
    expect(catalog.filter(i => i.category === 'parts')).toHaveLength(66);
  });

  it('assigns a shipping class to every product', () => {
    for (const item of catalog) {
      expect(['small_part', 'boxed_body_chassis', 'bulky_upgrade', 'complete_car_kit']).toContain(item.shipping_class);
    }
  });

  it('classifies every car as a complete car kit with the complete_car_kit shipping class', () => {
    for (const item of catalog.filter(i => i.category === 'cars')) {
      expect(item.shipping_class).toBe('complete_car_kit');
    }
  });

  it('has no duplicate item numbers', () => {
    expect(findDuplicateItemNumbers(catalog.map(i => ({ itemNo: i.item_no })))).toHaveLength(0);
  });

  it('applies the locked non-collector approved prices by item_no', () => {
    const byItemNo = Object.fromEntries(
      catalog.filter(i => i.pricing_source === 'board_approved_fixed_price' && !i.is_collectors_vault).map(i => [i.item_no, i.approved_regular_price_dkk])
    );
    expect(byItemNo).toEqual({
      '18704': 299, // Shadow Shark
      '18705': 299, // Flame Astute
      '18099': 319, // Ray Spear
    });
  });

  it('applies the Collector-corrected prices (60% margin) by item_no for the 6 items named this turn', () => {
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

  it('Diospada Premium (19443) is a pre-existing Collector item, unchanged by this turn\'s correction', () => {
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

  it('Magnum Saber (19431) is present, visible, PRICE PENDING, and never carries the legacy 339 DKK fallback', () => {
    const magnumSaber = catalog.find(i => i.item_no === '19431');
    expect(magnumSaber).toBeDefined();
    expect(magnumSaber!.name).toBe('Magnum Saber');
    expect(magnumSaber!.pricing_source).toBe('unverified');
    expect(magnumSaber!.price_dkk).not.toBe(339);
    expect(magnumSaber!.approved_regular_price_dkk).toBeNull();

    const visibility = checkCatalogVisibility({
      itemNo: magnumSaber!.item_no,
      hasUnresolvedDuplicate: magnumSaber!.has_unresolved_duplicate,
      hasUncertainEdition: magnumSaber!.has_uncertain_edition,
      isInternalTestRecord: magnumSaber!.is_internal_test_record,
      isArchivedByAdmin: magnumSaber!.is_archived_by_admin,
    });
    expect(visibility.visible).toBe(true);

    const state = derivePublicState({
      catalogVisible: visibility.visible,
      pricingSource: magnumSaber!.pricing_source,
      stockQty: magnumSaber!.stock_qty,
      catalogTier: magnumSaber!.catalog_tier,
      isPreorderEnabled: magnumSaber!.is_preorder_enabled,
      forceComingSoon: magnumSaber!.force_coming_soon,
    });
    expect(state).toBe('PRICE_PENDING');
  });

  it('no catalog item anywhere carries the legacy/default 339 DKK price', () => {
    const at339 = catalog.filter(i => i.price_dkk === 339 || i.approved_regular_price_dkk === 339);
    expect(at339).toHaveLength(0);
  });
});

describe('87-product catalog — visibility vs. purchase eligibility (Preview review correction)', () => {
  it('every one of the 87 curated products is publicly VISIBLE (none are hidden for price/stock reasons)', () => {
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

  it('zero stock does not hide a product (public state is OUT_OF_STOCK for every priced-but-unstocked item, never ARCHIVED)', () => {
    const pricedButUnstocked = catalog.filter(i => i.pricing_source !== 'unverified' && i.stock_qty === 0);
    expect(pricedButUnstocked.length).toBeGreaterThan(0); // all 10 approved cars are currently zero-stock
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

  it('unverified cost displays PRICE_PENDING for every one of the 76 remaining unpriced products', () => {
    const unpriced = catalog.filter(i => i.pricing_source === 'unverified');
    expect(unpriced.length).toBe(87 - 10); // 10 priced total (4 non-collector + 6 collector-corrected)
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
    }
  });

  it('unverified cost cannot be purchased', () => {
    for (const item of catalog.filter(i => i.pricing_source === 'unverified')) {
      expect(
        isPurchasable({
          pricingSource: item.pricing_source,
          approvedRegularPriceDkkOre: null,
          isPurchasableState: true, // even if this were somehow true, an unverified price still blocks purchase
        })
      ).toBe(false);
    }
  });

  it('does not flip published/available or invent stock for the 10 newly-priced car kits', () => {
    // Pricing approval alone does not manufacture real stock-on-hand or
    // approved photography — these remain drafts until that is separately true.
    for (const item of catalog.filter(i => i.pricing_source === 'board_approved_fixed_price')) {
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

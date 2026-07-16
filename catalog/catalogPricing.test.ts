import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkPublishability, findDuplicateItemNumbers } from '@/lib/pricing/catalogPricingStatus';
import { dkkToOre } from '@/lib/pricing/money';

interface CatalogItem {
  item_no: string;
  name: string;
  category: string;
  shipping_class: string;
  part_group: string | null;
  pricing_source: 'board_approved_fixed_price' | 'cost_plus_formula' | 'unverified';
  approved_regular_price_dkk: number | null;
  price_dkk: number;
  published: boolean;
  available: boolean;
  stock_qty: number;
}

const catalog: CatalogItem[] = JSON.parse(readFileSync(join(process.cwd(), 'catalog', 'bmax-initial-catalog.json'), 'utf-8'));

describe('86-product catalog — pricing classification', () => {
  it('has exactly 86 products (20 car kits, 66 upgrade parts)', () => {
    expect(catalog).toHaveLength(86);
    expect(catalog.filter(i => i.category === 'cars')).toHaveLength(20);
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

  it('applies the locked approved price to exactly the 10 unambiguously-matched car kits', () => {
    const priced = catalog.filter(i => i.pricing_source === 'board_approved_fixed_price');
    const byItemNo = Object.fromEntries(priced.map(i => [i.item_no, i.approved_regular_price_dkk]));
    expect(byItemNo).toEqual({
      '19443': 249, // Diospada
      '18704': 299, // Shadow Shark
      '18705': 299, // Flame Astute
      '19447': 299, // Beak Stinger G
      '19451': 299, // Gun Bluster XTO Premium
      '18099': 319, // Ray Spear
      '95126': 329, // Cyclone Magnum 25th Anniversary
      '95571': 329, // Exflowly Polycarbonate Purple
      '95706': 359, // Geo Glider Asia Challenge
      '92462': 389, // Mach Frame Philippine Cup
    });
  });

  it('does not misapply the Mach Frame Philippine Cup price to the plain Mach Frame (18714)', () => {
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

  it('leaves every unpriced product unpublished with zero/placeholder price (unverified cost remains unpublished)', () => {
    for (const item of catalog.filter(i => i.pricing_source === 'unverified')) {
      const publishability = checkPublishability({
        pricingSource: item.pricing_source,
        approvedRegularPriceDkkOre: item.approved_regular_price_dkk != null ? dkkToOre(item.approved_regular_price_dkk) : null,
        itemNo: item.item_no,
      });
      expect(publishability.publishable).toBe(false);
      expect(item.published).toBe(false);
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
});

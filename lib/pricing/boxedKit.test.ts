import { describe, it, expect } from 'vitest';
import { calculateBoxedKitOrderTotal, boxedKitStockAfterOrder, displayCaseStockAfterOrder } from './boxedKit';
import { dkkToOre, oreToDkk } from './money';
import { DISPLAY_CASE_STANDALONE_PRICE_DKK, DISPLAY_CASE_BUNDLED_PRICE_DKK, DISPLAY_CASE_BUNDLE_SAVING_DKK } from './displayCase';

describe('boxedKit — boxed kit with service add-ons', () => {
  it('a boxed kit alone (no add-ons) totals just the kit price', () => {
    const total = calculateBoxedKitOrderTotal(dkkToOre(299), { productId: 'p1', addOns: [] });
    expect(total.totalOre).toBe(dkkToOre(299));
    expect(total.requiresAssembly).toBe(false);
    expect(total.addOnLines).toHaveLength(0);
  });

  it('a boxed kit with Display Case and Standard Assembly adds both at default prices', () => {
    const total = calculateBoxedKitOrderTotal(dkkToOre(299), {
      productId: 'p1',
      addOns: ['display_case', 'standard_assembly'],
    });
    // Display Case default is the bundled price (189 DKK) — see
    // lib/pricing/displayCase.ts. The old flat 99 DKK had no cost/margin
    // basis and was corrected in the Preview review.
    expect(total.totalOre).toBe(dkkToOre(299 + 189 + 349));
    expect(total.requiresAssembly).toBe(true);
    expect(total.addOnLines).toHaveLength(2);
  });

  it('Ready-to-Race Assembly also flags requiresAssembly', () => {
    const total = calculateBoxedKitOrderTotal(dkkToOre(299), { productId: 'p1', addOns: ['ready_to_race_assembly'] });
    expect(total.requiresAssembly).toBe(true);
    expect(total.totalOre).toBe(dkkToOre(299 + 449));
  });

  it('an administrator-configured add-on price overrides the default', () => {
    const total = calculateBoxedKitOrderTotal(dkkToOre(299), {
      productId: 'p1',
      addOns: ['standard_assembly'],
      addOnPriceOverridesDkk: { standard_assembly: 299 },
    });
    expect(total.totalOre).toBe(dkkToOre(299 + 299));
  });
});

describe('boxedKit — car order modal combos (docs/CATALOG-COSTING-AND-FREIGHT.md §"Car order modal")', () => {
  const carPriceOre = dkkToOre(299);

  it('Boxed Kit only', () => {
    const total = calculateBoxedKitOrderTotal(carPriceOre, { productId: 'p1', addOns: [] });
    expect(oreToDkk(total.totalOre)).toBe(299);
    expect(total.addOnLines).toHaveLength(0);
  });

  it('Boxed Kit + Display Case — shows the base price, the bundled add-on price, and the total, with the saving visible against the standalone price', () => {
    const total = calculateBoxedKitOrderTotal(carPriceOre, { productId: 'p1', addOns: ['display_case'] });
    expect(total.boxedKitPriceOre).toBe(carPriceOre);
    expect(total.addOnLines).toEqual([{ addOn: 'display_case', label: 'Display Case', priceOre: dkkToOre(DISPLAY_CASE_BUNDLED_PRICE_DKK) }]);
    expect(oreToDkk(total.totalOre)).toBe(299 + DISPLAY_CASE_BUNDLED_PRICE_DKK);
    expect(DISPLAY_CASE_STANDALONE_PRICE_DKK - DISPLAY_CASE_BUNDLED_PRICE_DKK).toBe(DISPLAY_CASE_BUNDLE_SAVING_DKK);
  });

  it('Standard Assembly: 349 DKK exactly, added to the base price', () => {
    const total = calculateBoxedKitOrderTotal(carPriceOre, { productId: 'p1', addOns: ['standard_assembly'] });
    expect(oreToDkk(total.totalOre)).toBe(299 + 349);
  });

  it('Ready-to-Race Assembly: 449 DKK exactly, added to the base price', () => {
    const total = calculateBoxedKitOrderTotal(carPriceOre, { productId: 'p1', addOns: ['ready_to_race_assembly'] });
    expect(oreToDkk(total.totalOre)).toBe(299 + 449);
  });

  it('Display Case + selected Assembly option — all three lines present, total is the exact sum', () => {
    const total = calculateBoxedKitOrderTotal(carPriceOre, { productId: 'p1', addOns: ['display_case', 'ready_to_race_assembly'] });
    expect(total.addOnLines.map(l => l.addOn)).toEqual(['display_case', 'ready_to_race_assembly']);
    expect(oreToDkk(total.totalOre)).toBe(299 + DISPLAY_CASE_BUNDLED_PRICE_DKK + 449);
  });
});

describe('boxedKit — stock separation', () => {
  it('reduces only the boxed-kit stock count for a kit order', () => {
    expect(boxedKitStockAfterOrder(5, 2)).toBe(3);
  });

  it('display case stock is tracked separately from kit stock', () => {
    expect(displayCaseStockAfterOrder(10, 1)).toBe(9);
  });

  it('rejects an order exceeding available boxed-kit stock', () => {
    expect(() => boxedKitStockAfterOrder(1, 2)).toThrow();
  });

  it('rejects an order exceeding available display-case stock without touching kit stock', () => {
    expect(() => displayCaseStockAfterOrder(0, 1)).toThrow();
  });
});

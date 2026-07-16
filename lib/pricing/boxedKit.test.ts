import { describe, it, expect } from 'vitest';
import { calculateBoxedKitOrderTotal, boxedKitStockAfterOrder, displayCaseStockAfterOrder } from './boxedKit';
import { dkkToOre } from './money';

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
    expect(total.totalOre).toBe(dkkToOre(299 + 99 + 349));
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

import { describe, it, expect } from 'vitest';
import { calculateRegularPrice, REGULAR_PRICE_MARGIN_FLOOR, COLLECTOR_MARGIN_FLOOR, type SupplierCostSnapshot } from './regularPrice';
import { dkkToOre } from './money';
import { SHIPPING_CLASSES } from './shippingClasses';

describe('regularPrice — locked business rule: 50% margin floor', () => {
  it('exposes the locked 50% margin floor constant', () => {
    expect(REGULAR_PRICE_MARGIN_FLOOR).toBe(0.5);
  });

  it('every shipping class matches the locked fixed amounts', () => {
    expect(SHIPPING_CLASSES.small_part.allocatedDkk).toBe(25);
    expect(SHIPPING_CLASSES.boxed_body_chassis.allocatedDkk).toBe(35);
    expect(SHIPPING_CLASSES.bulky_upgrade.allocatedDkk).toBe(50);
    expect(SHIPPING_CLASSES.complete_car_kit.allocatedDkk).toBe(80);
  });

  // Worked example: Ultra-Dash Motor (docs/PRODUCT-PRICING-POLICY.md §5).
  // 350 PHP supplier baseline, small_part shipping (25 DKK), approved
  // regular retail 129 DKK, margin >= 50%. No product named "Ultra-Dash
  // Motor" exists in the current 86-item catalog (confirmed absent — see
  // docs/CATALOG-COSTING-AND-FREIGHT.md), so this is a pure formula
  // regression test using an illustrative 0.11 DKK/PHP exchange-rate
  // snapshot, not a claim about a live catalog row.
  it('Ultra-Dash Motor worked example: 350 PHP @ 0.11 DKK/PHP + small_part freight -> 129 DKK, margin >= 50%', () => {
    const cost: SupplierCostSnapshot = {
      supplierCostAmount: 350,
      supplierCurrency: 'PHP',
      supplierName: 'Illustrative Philippine supplier (example only)',
      sourceNote: 'Worked example from the locked pricing policy — not a live catalog row.',
      dateVerified: '2026-01-01',
      dkkPerForeignUnit: 0.11,
      exchangeRateSnapshotDate: '2026-01-01',
    };
    const result = calculateRegularPrice(cost, { shippingClass: 'small_part' });

    expect(result.supplierCostDkkOre).toBe(dkkToOre(38.5));
    expect(result.shippingOre).toBe(dkkToOre(25));
    expect(result.landedCostOre).toBe(dkkToOre(63.5));
    expect(result.minimumRetailOre).toBe(dkkToOre(127));
    expect(result.approvedRegularPriceOre).toBe(dkkToOre(129));
    expect(result.marginAtApprovedPrice).toBeGreaterThanOrEqual(0.5);
  });

  it('produces a valid ending-in-9 price and >=50% margin for an arbitrary verified cost', () => {
    const cost: SupplierCostSnapshot = {
      supplierCostAmount: 800,
      supplierCurrency: 'PHP',
      supplierName: 'Example supplier',
      sourceNote: 'Example',
      dateVerified: '2026-01-01',
      dkkPerForeignUnit: 0.115,
      exchangeRateSnapshotDate: '2026-01-01',
    };
    const result = calculateRegularPrice(cost, { shippingClass: 'complete_car_kit' });
    expect(result.approvedRegularPriceOre % 1000).toBe(900); // ends in 9
    expect(result.marginAtApprovedPrice).toBeGreaterThanOrEqual(0.5 - 1e-9);
  });

  it('allows an administrator shipping override but requires a reason', () => {
    const cost: SupplierCostSnapshot = {
      supplierCostAmount: 500,
      supplierCurrency: 'PHP',
      supplierName: 'Example supplier',
      sourceNote: 'Example',
      dateVerified: '2026-01-01',
      dkkPerForeignUnit: 0.11,
      exchangeRateSnapshotDate: '2026-01-01',
    };
    expect(() =>
      calculateRegularPrice(cost, { shippingClass: 'small_part', overrideOre: dkkToOre(60) })
    ).toThrow(/overrideReason/);

    const result = calculateRegularPrice(cost, {
      shippingClass: 'small_part',
      overrideOre: dkkToOre(60),
      overrideReason: 'Exceptionally bulky packaging for this specific SKU.',
    });
    expect(result.shippingOre).toBe(dkkToOre(60));
  });
});

describe('regularPrice — Collector correction: 60% margin floor', () => {
  it('exposes the locked 60% Collector margin floor constant', () => {
    expect(COLLECTOR_MARGIN_FLOOR).toBe(0.6);
  });

  it('defaults to the normal 50% floor when no margin floor is passed', () => {
    const cost: SupplierCostSnapshot = {
      supplierCostAmount: 800, supplierCurrency: 'PHP', supplierName: 'Example', sourceNote: 'Example',
      dateVerified: '2026-01-01', dkkPerForeignUnit: 0.115, exchangeRateSnapshotDate: '2026-01-01',
    };
    const result = calculateRegularPrice(cost, { shippingClass: 'complete_car_kit' });
    expect(result.marginAtApprovedPrice).toBeGreaterThanOrEqual(0.5 - 1e-9);
  });

  it('a Collector product uses landed cost x2.5 as its exact minimum retail price', () => {
    const cost: SupplierCostSnapshot = {
      supplierCostAmount: 1000, supplierCurrency: 'PHP', supplierName: 'Example collector supplier', sourceNote: 'Example',
      dateVerified: '2026-01-01', dkkPerForeignUnit: 0.1, exchangeRateSnapshotDate: '2026-01-01',
    };
    // 1000 PHP * 0.1 = 100 DKK + 80 DKK complete_car_kit freight = 180 DKK landed.
    const result = calculateRegularPrice(cost, { shippingClass: 'complete_car_kit' }, COLLECTOR_MARGIN_FLOOR);
    expect(result.landedCostOre).toBe(dkkToOre(180));
    expect(result.minimumRetailOre).toBe(dkkToOre(180 * 2.5)); // landed cost x 2.5, exactly
    expect(result.minimumRetailOre).toBe(dkkToOre(450));
  });

  it('produces a valid ending-in-9 price with margin >= 60% for a Collector product', () => {
    const cost: SupplierCostSnapshot = {
      supplierCostAmount: 900, supplierCurrency: 'PHP', supplierName: 'Example', sourceNote: 'Example',
      dateVerified: '2026-01-01', dkkPerForeignUnit: 0.115, exchangeRateSnapshotDate: '2026-01-01',
    };
    const result = calculateRegularPrice(cost, { shippingClass: 'complete_car_kit' }, COLLECTOR_MARGIN_FLOOR);
    expect(result.approvedRegularPriceOre % 1000).toBe(900); // ends in 9 (upward rounding, never below the floor)
    expect(result.marginAtApprovedPrice).toBeGreaterThanOrEqual(0.6 - 1e-9);
  });

  it('a Collector floor produces a higher (or equal) price than the normal 50% floor for the same cost', () => {
    const cost: SupplierCostSnapshot = {
      supplierCostAmount: 900, supplierCurrency: 'PHP', supplierName: 'Example', sourceNote: 'Example',
      dateVerified: '2026-01-01', dkkPerForeignUnit: 0.115, exchangeRateSnapshotDate: '2026-01-01',
    };
    const normal = calculateRegularPrice(cost, { shippingClass: 'complete_car_kit' }, REGULAR_PRICE_MARGIN_FLOOR);
    const collector = calculateRegularPrice(cost, { shippingClass: 'complete_car_kit' }, COLLECTOR_MARGIN_FLOOR);
    expect(collector.approvedRegularPriceOre).toBeGreaterThanOrEqual(normal.approvedRegularPriceOre);
  });
});

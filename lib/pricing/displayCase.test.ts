import { describe, it, expect } from 'vitest';
import {
  DISPLAY_CASE_SKU,
  DISPLAY_CASE_STANDALONE_PRICE_DKK,
  DISPLAY_CASE_BUNDLED_PRICE_DKK,
  DISPLAY_CASE_BUNDLE_SAVING_DKK,
  DISPLAY_CASE_SUPPLIER_UNIT_COST_PHP,
  calculateDisplayCaseMargins,
  displayCaseMarginWarnings,
  displayCaseBreakEvenRateDkkPerPhp,
  displayCaseStockAfterPurchase,
} from './displayCase';

describe('displayCase — locked identity and prices', () => {
  it('is one shared SKU, not per-car', () => {
    expect(DISPLAY_CASE_SKU).toBe('display-case');
  });

  it('locked approved prices and saving', () => {
    expect(DISPLAY_CASE_STANDALONE_PRICE_DKK).toBe(229);
    expect(DISPLAY_CASE_BUNDLED_PRICE_DKK).toBe(189);
    expect(DISPLAY_CASE_BUNDLE_SAVING_DKK).toBe(40);
  });

  it('known supplier cost assumption is 300 PHP per case (3,000 PHP / 10 cases)', () => {
    expect(DISPLAY_CASE_SUPPLIER_UNIT_COST_PHP).toBe(300);
  });
});

describe('displayCase — margin verification at today\'s live reference rate (0.106 DKK/PHP)', () => {
  const report = calculateDisplayCaseMargins(0.106);

  it('computes the expected landed cost (31.80 + 80 = 111.80 DKK)', () => {
    expect(report.landedCostOre).toBe(11180);
  });

  it('standalone 229 DKK clears the 50% floor', () => {
    expect(report.standalone.clearsFloor).toBe(true);
    expect(report.standalone.grossMargin).toBeGreaterThanOrEqual(0.5);
    expect(report.standalone.grossMargin).toBeCloseTo(0.5117, 3);
  });

  it('bundled 189 DKK clears the 40% floor', () => {
    expect(report.bundled.clearsFloor).toBe(true);
    expect(report.bundled.grossMargin).toBeGreaterThanOrEqual(0.4);
    expect(report.bundled.grossMargin).toBeCloseTo(0.4085, 3);
  });

  it('reports the 40 DKK customer saving in øre', () => {
    expect(report.savingOre).toBe(4000);
  });

  it('produces no margin warnings at this rate', () => {
    expect(displayCaseMarginWarnings(0.106)).toHaveLength(0);
  });
});

describe('displayCase — margin verification at the existing 0.11 DKK/PHP test convention', () => {
  const report = calculateDisplayCaseMargins(0.11);

  it('still clears both floors, but with much thinner headroom on the bundle', () => {
    expect(report.standalone.clearsFloor).toBe(true);
    expect(report.bundled.clearsFloor).toBe(true);
    // Bundle headroom is under 1 DKK at this rate — a real, thin margin.
    expect(report.bundled.priceOre - report.bundled.minimumPriceOre).toBeLessThan(100);
  });
});

describe('displayCase — flags a breach instead of silently changing an approved price', () => {
  it('warns when the exchange rate rises enough to breach the bundled 40% floor', () => {
    // Break-even for the bundle is just above 0.111 DKK/PHP (see
    // displayCaseBreakEvenRateDkkPerPhp) — comfortably breached at 0.13.
    const warnings = displayCaseMarginWarnings(0.13);
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings.some(w => w.includes('Bundled'))).toBe(true);
  });

  it('warns on both prices at an extreme rate', () => {
    const warnings = displayCaseMarginWarnings(0.2);
    expect(warnings.some(w => w.includes('Standalone'))).toBe(true);
    expect(warnings.some(w => w.includes('Bundled'))).toBe(true);
  });

  it('the bundled price breaches its floor at a lower rate than the standalone price (tighter constraint)', () => {
    const bundledBreakEven = displayCaseBreakEvenRateDkkPerPhp(0.4, DISPLAY_CASE_BUNDLED_PRICE_DKK);
    const standaloneBreakEven = displayCaseBreakEvenRateDkkPerPhp(0.5, DISPLAY_CASE_STANDALONE_PRICE_DKK);
    expect(bundledBreakEven).toBeLessThan(standaloneBreakEven);
    // Matches the hand-verified values from the catalog-expansion proposal.
    expect(bundledBreakEven).toBeCloseTo(0.1113, 3);
    expect(standaloneBreakEven).toBeCloseTo(0.115, 3);
  });

  it('never mutates the approved prices themselves when warning', () => {
    displayCaseMarginWarnings(0.5);
    expect(DISPLAY_CASE_STANDALONE_PRICE_DKK).toBe(229);
    expect(DISPLAY_CASE_BUNDLED_PRICE_DKK).toBe(189);
  });
});

describe('displayCase — shared stock model', () => {
  it('standalone purchase deducts exactly one case', () => {
    expect(displayCaseStockAfterPurchase(5, 1)).toBe(4);
  });

  it('throws rather than allowing stock to go negative', () => {
    expect(() => displayCaseStockAfterPurchase(0, 1)).toThrow(/Insufficient/);
  });

  it('is one shared pool — nothing here is keyed by a specific car', () => {
    // The function signature itself takes no car/product identifier — the
    // only required input is the shared pool count, by construction
    // (quantity has a default, so it doesn't count toward .length).
    expect(displayCaseStockAfterPurchase.length).toBe(1); // (currentCaseStock)
  });
});

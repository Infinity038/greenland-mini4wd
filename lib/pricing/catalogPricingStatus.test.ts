import { describe, it, expect } from 'vitest';
import { checkCatalogVisibility, isPurchasable, findDuplicateItemNumbers, missingDataReason } from './catalogPricingStatus';
import { dkkToOre } from './money';

describe('catalogPricingStatus — visibility (Preview review correction)', () => {
  const clean = { itemNo: '18704', hasUnresolvedDuplicate: false, hasUncertainEdition: false, isInternalTestRecord: false, isArchivedByAdmin: false };

  it('an unverified-cost product remains VISIBLE (no longer hidden)', () => {
    // Visibility does not consider pricing at all — an unverified-cost item
    // has no pricing-related visibility fields to fail here.
    const result = checkCatalogVisibility(clean);
    expect(result.visible).toBe(true);
    expect(result.reasons).toHaveLength(0);
  });

  it('zero stock is not a visibility concern (not modeled here at all)', () => {
    // checkCatalogVisibility() has no stock field by design — stock can
    // never hide a product, so there is nothing to assert it against.
    const result = checkCatalogVisibility(clean);
    expect(result.visible).toBe(true);
  });

  it('hides a product with an unresolved duplicate item number', () => {
    const result = checkCatalogVisibility({ ...clean, hasUnresolvedDuplicate: true });
    expect(result.visible).toBe(false);
    expect(result.reasons).toContain('unresolved duplicate item number');
  });

  it('hides a product with an uncertain edition', () => {
    const result = checkCatalogVisibility({ ...clean, hasUncertainEdition: true });
    expect(result.visible).toBe(false);
    expect(result.reasons).toContain('uncertain product edition');
  });

  it('hides an internal/test record', () => {
    const result = checkCatalogVisibility({ ...clean, isInternalTestRecord: true });
    expect(result.visible).toBe(false);
  });

  it('hides a product explicitly archived by an administrator', () => {
    const result = checkCatalogVisibility({ ...clean, isArchivedByAdmin: true });
    expect(result.visible).toBe(false);
    expect(result.reasons).toContain('archived by administrator');
  });

  it('rejects a missing item number', () => {
    const result = checkCatalogVisibility({ ...clean, itemNo: '' });
    expect(result.visible).toBe(false);
  });
});

describe('catalogPricingStatus — purchase eligibility (separate from visibility)', () => {
  it('an unverified-cost product is visible but NOT purchasable', () => {
    expect(isPurchasable({ pricingSource: 'unverified', approvedRegularPriceDkkOre: null, isPurchasableState: true })).toBe(false);
  });

  it('a priced, in-stock product is purchasable', () => {
    expect(isPurchasable({ pricingSource: 'board_approved_fixed_price', approvedRegularPriceDkkOre: dkkToOre(299), isPurchasableState: true })).toBe(true);
  });

  it('a priced but out-of-stock product is visible but not purchasable', () => {
    expect(isPurchasable({ pricingSource: 'board_approved_fixed_price', approvedRegularPriceDkkOre: dkkToOre(299), isPurchasableState: false })).toBe(false);
  });

  it('rejects a zero/placeholder price even with a verified source', () => {
    expect(isPurchasable({ pricingSource: 'cost_plus_formula', approvedRegularPriceDkkOre: 0, isPurchasableState: true })).toBe(false);
  });
});

describe('catalogPricingStatus — duplicate item numbers', () => {
  it('finds no duplicates in a clean catalog', () => {
    expect(findDuplicateItemNumbers([{ itemNo: '18099' }, { itemNo: '18094' }])).toHaveLength(0);
  });

  it('flags an item number used more than once', () => {
    expect(findDuplicateItemNumbers([{ itemNo: '18099' }, { itemNo: '18099' }, { itemNo: '18094' }])).toEqual(['18099']);
  });
});

describe('catalogPricingStatus — missing-data reason (admin-only detail)', () => {
  it('identifies missing supplier cost and exchange rate', () => {
    expect(missingDataReason({ pricingSource: 'unverified', supplierCostAmount: null, exchangeRateSnapshot: null })).toBe('Missing: supplier cost, exchange-rate snapshot');
  });

  it('returns null once a product is priced', () => {
    expect(missingDataReason({ pricingSource: 'board_approved_fixed_price', supplierCostAmount: null, exchangeRateSnapshot: null })).toBeNull();
  });
});

import { describe, it, expect } from 'vitest';
import { getAllCatalogItems, getPublicCatalog, getPublicCatalogByCategory } from './catalogProducts';

describe('catalogProducts — public catalog loader', () => {
  it('returns all 87 curated items', () => {
    expect(getAllCatalogItems()).toHaveLength(87);
  });

  it('the public catalog includes every visible item (all 87 — none hidden for price/stock reasons)', () => {
    expect(getPublicCatalog()).toHaveLength(87);
  });

  it('splits into 21 cars and 66 parts', () => {
    expect(getPublicCatalogByCategory('cars')).toHaveLength(21);
    expect(getPublicCatalogByCategory('parts')).toHaveLength(66);
  });

  it('Beak Stinger G shows its corrected 359 DKK Collector price, never 339', () => {
    const item = getPublicCatalog().find(i => i.raw.item_no === '19447')!;
    expect(item.priceDkk).toBe(359);
    expect(item.priceDkk).not.toBe(339);
    expect(item.publicState).toBe('OUT_OF_STOCK'); // priced, zero stock -> visible, not purchasable
    expect(item.purchasable).toBe(false);
  });

  it('Magnum Saber shows PRICE_PENDING with no price at all', () => {
    const item = getPublicCatalog().find(i => i.raw.item_no === '19431')!;
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

  it('no item anywhere in the public catalog displays the legacy 339 DKK price', () => {
    const at339 = getPublicCatalog().filter(i => i.priceDkk === 339);
    expect(at339).toHaveLength(0);
  });
});

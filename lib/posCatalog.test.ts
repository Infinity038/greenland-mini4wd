import { describe, it, expect } from 'vitest';
import { scanBarcode, searchProducts, isRaceServiceBarcode, PRESET_POS_ITEMS, MOCK_PRODUCT_CATALOG } from './posCatalog';

describe('posCatalog — scanning', () => {
  it('scans a stock-tracked product by barcode', () => {
    const result = scanBarcode('4950344958926');
    expect(result).toEqual({ kind: 'product', product: MOCK_PRODUCT_CATALOG[0] });
  });

  it('scans a staff preset item by barcode', () => {
    const result = scanBarcode('POS-WEEKLY-ENTRY');
    expect(result).toEqual({ kind: 'preset', preset: PRESET_POS_ITEMS[0] });
  });

  it('returns null for an unknown barcode', () => {
    expect(scanBarcode('0000000000000')).toBeNull();
  });

  it('includes all required preset POS items at their specified prices', () => {
    const byName = Object.fromEntries(PRESET_POS_ITEMS.map(p => [p.name, p]));
    expect(byName['Weekly Entry'].unitPriceDkk).toBe(150);
    expect(byName['Weekly Second Life'].unitPriceDkk).toBe(50);
    expect(byName['Big Event Entry'].unitPriceDkk).toBe(500);
    expect(byName['Big Event Second Life'].unitPriceDkk).toBe(100);
    expect(byName['Practice Session'].unitPriceDkk).toBe(50);
    expect(byName['House Car Rental'].unitPriceDkk).toBe(25);
    expect(byName['House Car Rental'].unit).toBe('hour');
  });

  it('marks snacks and merchandise as open-price (staff-entered) items', () => {
    const byName = Object.fromEntries(PRESET_POS_ITEMS.map(p => [p.name, p]));
    expect(byName['Soft Drinks / Snacks'].unitPriceDkk).toBeNull();
    expect(byName['Merchandise'].unitPriceDkk).toBeNull();
  });

  it('scanning a barcode does not mutate the catalog', () => {
    const before = JSON.stringify(MOCK_PRODUCT_CATALOG);
    scanBarcode('4950344958926');
    scanBarcode('4950344993737');
    expect(JSON.stringify(MOCK_PRODUCT_CATALOG)).toBe(before);
  });
});

describe('posCatalog — search', () => {
  it('finds a product by name', () => {
    const results = searchProducts('Hyper-Dash');
    expect(results.map(p => p.name)).toContain('Hyper-Dash 3 Motor');
  });

  it('finds a product by Tamiya item number', () => {
    const results = searchProducts('95892');
    expect(results.map(p => p.name)).toContain('Mini 4WD Fully Cowled Chassis Kit');
  });

  it('finds a product by barcode', () => {
    const results = searchProducts('4950344180938');
    expect(results.map(p => p.name)).toContain('Low Friction Plastic Roller 13mm');
  });

  it('finds products by category', () => {
    const results = searchProducts('Rollers');
    expect(results.length).toBeGreaterThanOrEqual(2);
  });

  it('finds products by chassis', () => {
    const results = searchProducts('Super-X');
    expect(results.map(p => p.name)).toContain('Super-X Chassis Kit');
  });

  it('returns the full catalog for an empty query', () => {
    expect(searchProducts('')).toEqual(MOCK_PRODUCT_CATALOG);
  });

  it('marks an out-of-stock, non-preorder product as out_of_stock and a preorder-only item as preorder', () => {
    const roller = MOCK_PRODUCT_CATALOG.find(p => p.name === 'Low Friction Plastic Roller 13mm')!;
    const preorder = MOCK_PRODUCT_CATALOG.find(p => p.name === 'Aluminum Roller 9-8mm')!;
    expect(roller.availability).toBe('out_of_stock');
    expect(preorder.availability).toBe('preorder');
  });
});

describe('posCatalog — race service classification', () => {
  it('classifies race entry and second life presets as race services', () => {
    expect(isRaceServiceBarcode('POS-WEEKLY-ENTRY')).toBe(true);
    expect(isRaceServiceBarcode('POS-WEEKLY-2ND')).toBe(true);
    expect(isRaceServiceBarcode('POS-BIGEVENT-ENTRY')).toBe(true);
  });

  it('does not classify practice, rental, refreshment or merchandise as race services', () => {
    expect(isRaceServiceBarcode('POS-PRACTICE')).toBe(false);
    expect(isRaceServiceBarcode('POS-HOUSECAR-HR')).toBe(false);
    expect(isRaceServiceBarcode('POS-SNACK')).toBe(false);
  });

  it('returns false for an unknown barcode', () => {
    expect(isRaceServiceBarcode('0000000000000')).toBe(false);
  });
});

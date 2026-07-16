import { describe, it, expect } from 'vitest';
import { scanBarcode, PRESET_POS_ITEMS, MOCK_PRODUCT_CATALOG } from './posCatalog';

describe('posCatalog', () => {
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

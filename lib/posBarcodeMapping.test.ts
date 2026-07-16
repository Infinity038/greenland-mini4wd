import { describe, it, expect } from 'vitest';
import { proposeBarcodeMapping } from './posBarcodeMapping';

describe('proposeBarcodeMapping', () => {
  it('builds a typed, non-persistent mapping record with an assignment timestamp', () => {
    const mapping = proposeBarcodeMapping({
      productId: 'PROD-1',
      barcode: '4950344000000',
      barcodeType: 'ean_13',
      assignedBy: 'staff@example.com',
    });
    expect(mapping.productId).toBe('PROD-1');
    expect(mapping.barcode).toBe('4950344000000');
    expect(mapping.barcodeType).toBe('ean_13');
    expect(mapping.assignedBy).toBe('staff@example.com');
    expect(mapping.active).toBe(true);
    expect(new Date(mapping.assignedAt).toString()).not.toBe('Invalid Date');
  });
});

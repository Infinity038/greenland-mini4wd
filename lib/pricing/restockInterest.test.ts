import { describe, it, expect } from 'vitest';
import { createRestockInterestRequest, RestockInterestStore } from './restockInterest';

describe('restockInterest — submission never creates an order or reserves stock', () => {
  it('creates an open request with a default quantity of 1', () => {
    const request = createRestockInterestRequest({ productId: 'p1', itemNo: '19447', contactPreference: 'email' });
    expect(request.status).toBe('open');
    expect(request.requestedQuantity).toBe(1);
    expect(request.racerId).toBeNull();
  });

  it('records an authenticated racer id when provided', () => {
    const request = createRestockInterestRequest({ productId: 'p1', itemNo: '19447', contactPreference: 'sms', racerId: 'racer-42' });
    expect(request.racerId).toBe('racer-42');
  });

  it('rejects a non-positive requested quantity', () => {
    expect(() => createRestockInterestRequest({ productId: 'p1', itemNo: '19447', contactPreference: 'email', requestedQuantity: 0 })).toThrow();
  });

  it('the request object has no order/payment/stock-reservation fields at all', () => {
    const request = createRestockInterestRequest({ productId: 'p1', itemNo: '19447', contactPreference: 'in_app' });
    const keys = Object.keys(request);
    expect(keys).not.toContain('orderId');
    expect(keys).not.toContain('paymentStatus');
    expect(keys).not.toContain('reservedStock');
  });
});

describe('RestockInterestStore', () => {
  it('tracks requests per product and counts only open ones', () => {
    const store = new RestockInterestStore();
    const a = store.submit({ productId: 'p1', itemNo: '19447', contactPreference: 'email' });
    store.submit({ productId: 'p1', itemNo: '19447', contactPreference: 'sms' });
    store.submit({ productId: 'p2', itemNo: '18099', contactPreference: 'email' });

    expect(store.countForProduct('p1')).toBe(2);
    expect(store.countForProduct('p2')).toBe(1);
    expect(store.all()).toHaveLength(3);

    store.setStatus(a.id, 'fulfilled');
    expect(store.countForProduct('p1')).toBe(1); // fulfilled requests no longer count as open interest
  });
});

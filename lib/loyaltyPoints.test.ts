import { describe, expect, it } from 'vitest';
import { calculateLoyaltyPoints, formatPoints } from './loyaltyPoints';

describe('calculateLoyaltyPoints', () => {
  it('awards exactly 1.50 points for 150 DKK', () => {
    expect(calculateLoyaltyPoints(150)).toBe(1.5);
  });
  it('awards exactly 0.50 points for 50 DKK', () => {
    expect(calculateLoyaltyPoints(50)).toBe(0.5);
  });
  it('awards exactly 0.25 points for 25 DKK', () => {
    expect(calculateLoyaltyPoints(25)).toBe(0.25);
  });
  it('awards exactly 1.99 points for 199 DKK', () => {
    expect(calculateLoyaltyPoints(199)).toBe(1.99);
  });
  it('awards exactly 2.99 points for 299 DKK', () => {
    expect(calculateLoyaltyPoints(299)).toBe(2.99);
  });
  it('handles the deposit-after-discount example: 300 total, 50 discount, 250 paid -> 2.50 points', () => {
    const paid = 300 - 50;
    expect(calculateLoyaltyPoints(paid)).toBe(2.5);
  });
  it('never awards points for zero or negative eligible amounts', () => {
    expect(calculateLoyaltyPoints(0)).toBe(0);
    expect(calculateLoyaltyPoints(-50)).toBe(0);
  });
});

describe('formatPoints', () => {
  it('always shows exactly two decimal places', () => {
    expect(formatPoints(42)).toBe('42.00');
    expect(formatPoints(1.5)).toBe('1.50');
    expect(formatPoints(0.25)).toBe('0.25');
  });
});

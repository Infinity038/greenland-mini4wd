import { describe, it, expect } from 'vitest';
import { calculateEligiblePaidOre, calculateLoyaltyPoints } from './loyalty';
import { dkkToOre } from './money';

describe('loyalty — sale loyalty calculation (locked example)', () => {
  it('239 DKK paid earns 2.39 points', () => {
    const eligible = calculateEligiblePaidOre({ saleTotalOre: dkkToOre(239) });
    expect(calculateLoyaltyPoints(eligible)).toBe(2.39);
  });

  it('does not award points on the discounted-away amount (299 -> 239 earns points on 239, not 299)', () => {
    const regularOre = dkkToOre(299);
    const paidOre = dkkToOre(239);
    const eligible = calculateEligiblePaidOre({ saleTotalOre: paidOre });
    expect(calculateLoyaltyPoints(eligible)).toBe(2.39);
    expect(calculateLoyaltyPoints(eligible)).not.toBe(calculateLoyaltyPoints(calculateEligiblePaidOre({ saleTotalOre: regularOre })));
  });
});

describe('loyalty — exclusions', () => {
  it('awards no points on Shop Credit used', () => {
    const eligible = calculateEligiblePaidOre({ saleTotalOre: dkkToOre(239), shopCreditAppliedOre: dkkToOre(239) });
    expect(eligible).toBe(0);
    expect(calculateLoyaltyPoints(eligible)).toBe(0);
  });

  it('awards points only on the portion not covered by Shop Credit', () => {
    const eligible = calculateEligiblePaidOre({ saleTotalOre: dkkToOre(239), shopCreditAppliedOre: dkkToOre(100) });
    expect(eligible).toBe(dkkToOre(139));
    expect(calculateLoyaltyPoints(eligible)).toBe(1.39);
  });

  it('awards no points on a refunded amount', () => {
    const eligible = calculateEligiblePaidOre({ saleTotalOre: dkkToOre(239), refundedOre: dkkToOre(239) });
    expect(eligible).toBe(0);
    expect(calculateLoyaltyPoints(eligible)).toBe(0);
  });

  it('awards no points on a cancelled payment', () => {
    const eligible = calculateEligiblePaidOre({ saleTotalOre: dkkToOre(239), paymentCancelled: true });
    expect(eligible).toBe(0);
    expect(calculateLoyaltyPoints(eligible)).toBe(0);
  });

  it('never returns a negative eligible amount', () => {
    const eligible = calculateEligiblePaidOre({ saleTotalOre: dkkToOre(100), shopCreditAppliedOre: dkkToOre(150) });
    expect(eligible).toBe(0);
  });
});

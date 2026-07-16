// Loyalty points during sales — docs/SALE-CAMPAIGN-RULES.md §15.
// Points are calculated from the actual eligible amount paid after the sale
// discount. Never award points on: the discounted-away amount, Shop Credit
// used, refunded amounts, or cancelled payments.

import { oreToDkk } from './money';

// Default matches the locked worked example: 239 DKK paid -> 2.39 points,
// i.e. 1 point per 100 DKK actually paid. Callers may pass a different rate
// if a specific member/tier uses one (see `members.points_rate` /
// `loyalty_points.points_rate` in the live schema).
export const DEFAULT_POINTS_PER_DKK = 0.01;

// Reduces a sale total down to the amount that is actually eligible for
// points: real money paid, excluding Shop Credit applied and any amount
// later refunded or never actually captured (cancelled payment).
export function calculateEligiblePaidOre(params: {
  saleTotalOre: number;
  shopCreditAppliedOre?: number;
  refundedOre?: number;
  paymentCancelled?: boolean;
}): number {
  if (params.paymentCancelled) return 0;
  const shopCredit = params.shopCreditAppliedOre ?? 0;
  const refunded = params.refundedOre ?? 0;
  return Math.max(0, params.saleTotalOre - shopCredit - refunded);
}

export function calculateLoyaltyPoints(eligiblePaidOre: number, pointsPerDkk: number = DEFAULT_POINTS_PER_DKK): number {
  if (eligiblePaidOre <= 0) return 0;
  return Math.round(oreToDkk(eligiblePaidOre) * pointsPerDkk * 100) / 100; // 2 decimal places, e.g. 2.39
}

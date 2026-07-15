// Reference implementation of the new flat-rate loyalty formula (see
// docs/CLAUDE-BMAX-REFINEMENT-BRIEF.md follow-up business rules). NOT yet wired
// into lib/loyalty.ts's awardForPayment — that still uses the live tiered-rate
// system pending schema/ledger review. This module is pure and side-effect free.

// Every 100 DKK of eligible paid amount earns 1.00 Loyalty Point. Partial spend
// earns proportional decimal points; points are never rounded down.
export function calculateLoyaltyPoints(eligibleAmountDkk: number): number {
  if (!Number.isFinite(eligibleAmountDkk) || eligibleAmountDkk <= 0) return 0;
  return Math.round((eligibleAmountDkk / 100) * 100) / 100;
}

// Loyalty Points are always displayed with exactly two decimal places.
export function formatPoints(points: number): string {
  return points.toFixed(2);
}

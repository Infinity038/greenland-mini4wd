// Pure helpers only. The functions that WROTE loyalty data from the browser with the anon key
// (awardForPayment, clawbackForPayment) were removed: rewards are now awarded and reversed on the server by
// lib/admin/loyaltyService.ts behind /api/admin/loyalty (verified staff session, amounts derived from stored rows,
// atomic claim of `rewards_applied`).

// Compatibility export for older callers. Reward earning is no longer tiered:
// every registered racer earns one whole point per 100 DKK of cumulative
// eligible spending.
export const TIER_RATES: Record<string, number> = {
  non_member: 1,
  member: 1,
  season_3rd: 1,
  season_2nd: 1,
  season_1st: 1,
  hall_of_fame: 1,
};

export function getTierRate(): number {
  return 1;
}

// Membership days remain separate from Reward Points. The profile shows only
// the resulting active/inactive membership state, not the spending calculation.
export function calcMembershipDays(spendDkk: number): number {
  return spendDkk / 20;
}

export function isMemberActive(member: { membership_expires_at?: string | null } | null | undefined): boolean {
  if (!member?.membership_expires_at) return false;
  return new Date(member.membership_expires_at).getTime() > Date.now();
}

export function daysRemaining(member: { membership_expires_at?: string | null } | null | undefined): number {
  if (!member?.membership_expires_at) return 0;
  const ms = new Date(member.membership_expires_at).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

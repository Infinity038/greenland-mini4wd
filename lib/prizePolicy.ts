/** Public-facing, prospective race-prize policy.
 *
 * Existing/previously published tournaments keep their original 70/30 terms.
 * Newly created weekly events are stamped at creation with the 35/65 policy.
 * Do not infer the split from event date: a future event may have been sold under legacy terms.
 * Sponsor-funded or special championship prizes require separate published event terms.
 */
export const NEW_REGULAR_PRIZE_POLICY_TAG = 'PRIZE POLICY: 35% of paid ticket revenue to the prize pool; 65% retained by the club for operating costs. Free and bonus tickets do not increase the prize pool.';
export const LEGACY_PRIZE_POLICY = { prizePct: 70, clubPct: 30, label: 'Existing published event terms' } as const;
export const NEW_REGULAR_PRIZE_POLICY = { prizePct: 35, clubPct: 65, label: 'New regular competition terms' } as const;

export function isNewRegularPrizePolicy(event: { description?: string | null } | null | undefined): boolean {
  return Boolean(event?.description?.includes(NEW_REGULAR_PRIZE_POLICY_TAG));
}
export function getPrizePolicy(event: { description?: string | null } | null | undefined) {
  return isNewRegularPrizePolicy(event) ? NEW_REGULAR_PRIZE_POLICY : LEGACY_PRIZE_POLICY;
}
export function getPrizeAllocation(paidRevenueDkk: number, prizePct: number) {
  const revenue = Math.max(0, Number.isFinite(paidRevenueDkk) ? paidRevenueDkk : 0);
  const prizes = Math.round((revenue * prizePct) / 100);
  return { paidRevenue: revenue, prizes, club: revenue - prizes };
}
export function stampNewRegularPrizePolicy(description: string, isExisting: boolean, ticketType: string): string {
  if (isExisting || !['weekly','weekly_earlybird'].includes(ticketType)) return description;
  if (description.includes('PRIZE POLICY:')) return description;
  return [description.trim(), NEW_REGULAR_PRIZE_POLICY_TAG].filter(Boolean).join('\n\n');
}

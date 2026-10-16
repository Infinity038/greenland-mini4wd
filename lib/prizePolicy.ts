/** Prospective event terms. Never rewrite a previously announced event or its sold ticket terms.
 * Existing stored percentage tags remain *internal* record markers; the public UI
 * must not advertise the organiser's operating share.
 */
export const NEW_REGULAR_PRIZE_POLICY_TAG = 'PRIZE POLICY: 35% of paid ticket revenue to the prize pool; 65% retained by the club for operating costs. Free and bonus tickets do not increase the prize pool.';
export const FIXED_PRIZE_POLICY_TAG = 'REGULAR RACE TERMS (2026-10-16): Minimum 6 DISTINCT PAYING RACERS. Prize pool 350 DKK at 6, plus 25 DKK per additional distinct paying racer. If fewer than 6 by published registration cutoff, event is postponed to the next announced opening day. Affected paid entrants can carry forward or request refund of the original payment, subject to verified payment and manual processing. Complimentary/bonus entries do not qualify toward minimum or increase the prize.';
export const LEGACY_PRIZE_POLICY = { prizePct: 70, clubPct: 30, label: 'Existing published event terms' } as const;
export const NEW_REGULAR_PRIZE_POLICY = { prizePct: 35, clubPct: 65, label: 'Previously published event terms' } as const;
export const MIN_PAID_RACERS = 6;
export const BASE_PRIZE_DKK = 350;
export const EXTRA_PER_PAID_RACER_DKK = 25;

export function isNewRegularPrizePolicy(event: { description?: string | null } | null | undefined): boolean {
  return Boolean(event?.description?.includes(NEW_REGULAR_PRIZE_POLICY_TAG));
}
export function isFixedPrizePolicy(event: { description?: string | null } | null | undefined): boolean {
  return Boolean(event?.description?.includes(FIXED_PRIZE_POLICY_TAG));
}
// Retained for existing event reporting and historic tests, never rendered as public marketing.
export function getPrizePolicy(event: { description?: string | null } | null | undefined) {
  return isNewRegularPrizePolicy(event) ? NEW_REGULAR_PRIZE_POLICY : LEGACY_PRIZE_POLICY;
}
export function getPrizeAllocation(paidRevenueDkk: number, prizePct: number) {
  const revenue = Math.max(0, Number.isFinite(paidRevenueDkk) ? paidRevenueDkk : 0);
  const prizes = Math.round((revenue * prizePct) / 100);
  return { paidRevenue: revenue, prizes, club: revenue - prizes };
}
export function calculateFixedPrize(distinctPaidRacers: number): { eligible: boolean; required: number; prizeDkk: number; missing: number } {
  const n = Number.isFinite(distinctPaidRacers) ? Math.max(0, Math.floor(distinctPaidRacers)) : 0;
  return { eligible: n >= MIN_PAID_RACERS, required: MIN_PAID_RACERS,
    prizeDkk: n >= MIN_PAID_RACERS ? BASE_PRIZE_DKK + (n - MIN_PAID_RACERS) * EXTRA_PER_PAID_RACER_DKK : 0,
    missing: Math.max(0, MIN_PAID_RACERS - n) };
}
/** Stamp NEW weekly events only. Existing events' published conditions are not restated or overwritten. */
export function stampNewRegularPrizePolicy(description: string, isExisting: boolean, ticketType: string): string {
  if (isExisting || !['weekly','weekly_earlybird'].includes(ticketType)) return description;
  if (description.includes('REGULAR RACE TERMS') || description.includes('PRIZE POLICY:')) return description;
  return [description.trim(), FIXED_PRIZE_POLICY_TAG].filter(Boolean).join('\n\n');
}
/** A stored, historically advertised accounting allocation must not leak into refreshed marketing.
 * The original event contract remains retrievable by the organiser and remains binding. */
export function publicEventDescription(description: string | null | undefined): string {
  return (description || '').split(/\n\s*\n|\n/).filter(line =>
    !line.trim().startsWith('PRIZE POLICY:') && !line.trim().startsWith('REGULAR RACE TERMS (2026-10-16):')
  ).join('\n').trim();
}
export function publicPrizeSummary(event: { description?: string | null } | null | undefined): string {
  return isFixedPrizePolicy(event)
    ? '6 distinct paying racers minimum · 350 DKK starting prize · +25 DKK per additional distinct paying racer. If the minimum is not reached at the published cutoff: next announced opening day, or a verified-payment refund on request.'
    : 'This event retains its originally published prize conditions. Check the confirmed event terms with the organiser before buying or entering.';
}

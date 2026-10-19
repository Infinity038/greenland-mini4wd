/**
 * Pure INTEGER 4W settlement model. No database operations, odds promises or
 * transferable value. Never expose the market ledger to player-facing views.
 *
 * "Up to" is a hard individual cap, NOT an opening guaranteed quote.
 * Host-side atomic transaction and idempotency are mandatory before activation.
 */
export type PoolTicket = {
  id: string;
  outcome: string;
  stake: number;
  weight: number; // published preseason time-weight, e.g. 4, 2, or 1
};
export type PoolSettlement = {
  contributed: number;
  operatorAllocation: number;
  initialPrizeAllocation: number;
  alreadyPaidCashouts: number;
  winnerPayments: { ticketId: string; amount: number }[];
  unclaimedAllocation: number;
};
const validInteger = (n: number) => Number.isSafeInteger(n) && n >= 0;

export function settleFundedPool(
  tickets: readonly PoolTicket[],
  winningOutcome: string,
  maxMultiplier: number,
  alreadyPaidCashouts = 0,
): PoolSettlement {
  if (!Number.isSafeInteger(maxMultiplier) || maxMultiplier < 1 || maxMultiplier > 12 ||
      !validInteger(alreadyPaidCashouts) || new Set(tickets.map(t => t.id)).size !== tickets.length ||
      tickets.some(t => !t.id || !t.outcome || !validInteger(t.stake) || t.stake === 0 ||
        !validInteger(t.weight) || t.weight < 1 || t.weight > 4)) throw new Error('Invalid funded pool input');
  const contributed = tickets.reduce((sum, t) => sum + t.stake, 0);
  if (!Number.isSafeInteger(contributed)) throw new Error('Unsafe total amount');
  const initialPrizeAllocation = Math.floor(contributed * 0.4);
  const operatorAllocation = contributed - initialPrizeAllocation;
  if (alreadyPaidCashouts > initialPrizeAllocation) throw new Error('Cash-out exceeds funded prize allocation');
  let available = initialPrizeAllocation - alreadyPaidCashouts;
  const winners = tickets.filter(t => t.outcome === winningOutcome).map(t => ({
    id: t.id, weight: t.stake * t.weight, cap: t.stake * maxMultiplier, paid: 0,
  }));
  if (winners.some(w => !Number.isSafeInteger(w.weight) || !Number.isSafeInteger(w.cap))) throw new Error('Unsafe ticket exposure');
  // Water-fill: distribute proportional to weighted shares, redistributing the
  // unused portion when an individual ticket reaches its published return ceiling.
  let eligible = winners.filter(w => w.cap > 0);
  while (available > 0 && eligible.length) {
    const sumWeight = eligible.reduce((sum, w) => sum + w.weight, 0);
    if (!Number.isSafeInteger(sumWeight) || sumWeight === 0) throw new Error('Unsafe weighted amount');
    let allocated = 0;
    for (const w of eligible) {
      const portion = Math.min(w.cap - w.paid, Math.floor(available * (w.weight / sumWeight)));
      w.paid += portion;
      allocated += portion;
    }
    if (allocated === 0) {
      const next = [...eligible].sort((a,b) =>
        ((available * b.weight / sumWeight) % 1) - ((available * a.weight / sumWeight) % 1) || a.id.localeCompare(b.id))[0];
      next.paid += 1;
      allocated = 1;
    }
    available -= allocated;
    eligible = eligible.filter(w => w.paid < w.cap);
  }
  const winnerPayments = winners.map(w => ({ ticketId: w.id, amount: w.paid }));
  const paid = winnerPayments.reduce((sum, w) => sum + w.amount, 0);
  if (paid + available + alreadyPaidCashouts !== initialPrizeAllocation) throw new Error('Unbalanced pool');
  return {
    contributed, operatorAllocation, initialPrizeAllocation, alreadyPaidCashouts,
    winnerPayments, unclaimedAllocation: available,
  };
}

/**
 * Indicative AFTER-entry return, computed solely for the requested outcome.
 * Must not be described as a fixed quote; existing entries retain share weights.
 * On an empty 60/40 pool, a lone ticket supports only 0.4x, not a guaranteed 8x.
 */
export function indicativePoolMultiplier(
  tickets: readonly PoolTicket[], outcome: string, newStake: number, newWeight: number, ceiling: number,
): number {
  if (!validInteger(newStake) || newStake === 0 || !validInteger(newWeight) || newWeight < 1 || newWeight > 4 ||
      !Number.isSafeInteger(ceiling) || ceiling < 1) throw new Error('Invalid indicative request');
  const total = tickets.reduce((sum, t) => sum + t.stake, 0) + newStake;
  const competingShares = tickets.filter(t=>t.outcome===outcome).reduce((sum,t)=>sum + t.stake*t.weight,0) + newStake*newWeight;
  if (!Number.isSafeInteger(total) || !Number.isSafeInteger(competingShares)) throw new Error('Unsafe indicative total');
  return Math.min(ceiling, Math.floor(total * 0.4) * newWeight / competingShares);
}

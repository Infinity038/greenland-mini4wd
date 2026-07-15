// Reference implementation of the loyalty reward roadmap. Pure/presentational —
// not wired to a real redemption backend yet (see docs/PROPOSED-admin-auth-plan.md
// and the QR/PIN redemption design in the business-rules brief for the pending
// database-dependent phase).

export interface RewardTier {
  points: number;
  discountDkk: number;
}

// Maximum reward is 250 points = 500 DKK. Do not add tiers beyond this without
// explicit approval.
export const REWARD_ROADMAP: RewardTier[] = [
  { points: 25, discountDkk: 50 },
  { points: 50, discountDkk: 100 },
  { points: 100, discountDkk: 200 },
  { points: 150, discountDkk: 300 },
  { points: 200, discountDkk: 400 },
  { points: 250, discountDkk: 500 },
];

export const MAX_REWARD = REWARD_ROADMAP[REWARD_ROADMAP.length - 1];

// The highest tier the racer currently qualifies for (or null if under the first tier).
export function getAvailableReward(balance: number): RewardTier | null {
  const eligible = REWARD_ROADMAP.filter(t => balance >= t.points);
  return eligible.length > 0 ? eligible[eligible.length - 1] : null;
}

// The next tier not yet reached (or null once the racer has reached the maximum).
export function getNextReward(balance: number): RewardTier | null {
  return REWARD_ROADMAP.find(t => balance < t.points) ?? null;
}

// Points still needed to reach the next tier — 0 once the maximum is reached.
export function pointsRemainingToNext(balance: number): number {
  const next = getNextReward(balance);
  if (!next) return 0;
  return Math.round((next.points - balance) * 100) / 100;
}

// Pure simulation of redeeming a tier — does not persist anything. One reward per
// transaction: callers should only ever pass a single tier per call.
export function redeem(balance: number, tier: RewardTier): number {
  return Math.max(0, Math.round((balance - tier.points) * 100) / 100);
}

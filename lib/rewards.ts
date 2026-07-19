export const DKK_PER_REWARD_POINT = 100;

export interface RewardMilestone {
  points: number;
  discountDkk: number;
}

export const REWARD_MILESTONES: readonly RewardMilestone[] = [
  { points: 25, discountDkk: 50 },
  { points: 50, discountDkk: 100 },
  { points: 100, discountDkk: 200 },
  { points: 150, discountDkk: 300 },
] as const;

export function normalizeRewardPoints(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  return Math.floor(numeric);
}

export function rewardPointsFromEligibleSpend(spendDkk: unknown): number {
  const numeric = Number(spendDkk);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  return Math.floor(numeric / DKK_PER_REWARD_POINT);
}

export function rewardPointsEarnedBetween(previousSpendDkk: unknown, nextSpendDkk: unknown): number {
  return Math.max(
    0,
    rewardPointsFromEligibleSpend(nextSpendDkk) - rewardPointsFromEligibleSpend(previousSpendDkk)
  );
}

export function highestUnlockedReward(points: unknown): RewardMilestone | null {
  const balance = normalizeRewardPoints(points);
  return [...REWARD_MILESTONES].reverse().find(milestone => balance >= milestone.points) || null;
}

export function nextRewardMilestone(points: unknown): RewardMilestone | null {
  const balance = normalizeRewardPoints(points);
  return REWARD_MILESTONES.find(milestone => balance < milestone.points) || null;
}

export function rewardProgress(points: unknown): {
  currentPoints: number;
  previousThreshold: number;
  next: RewardMilestone | null;
  pointsNeeded: number;
  percentage: number;
} {
  const currentPoints = normalizeRewardPoints(points);
  const next = nextRewardMilestone(currentPoints);
  if (!next) {
    return {
      currentPoints,
      previousThreshold: REWARD_MILESTONES.at(-1)?.points || 0,
      next: null,
      pointsNeeded: 0,
      percentage: 100,
    };
  }

  const previousThreshold = [...REWARD_MILESTONES]
    .reverse()
    .find(milestone => milestone.points <= currentPoints)?.points || 0;
  const range = next.points - previousThreshold;
  const progressed = currentPoints - previousThreshold;

  return {
    currentPoints,
    previousThreshold,
    next,
    pointsNeeded: Math.max(0, next.points - currentPoints),
    percentage: range > 0 ? Math.min(100, Math.max(0, (progressed / range) * 100)) : 100,
  };
}

import { describe, expect, it } from 'vitest';
import {
  DKK_PER_REWARD_POINT,
  REWARD_MILESTONES,
  highestUnlockedReward,
  nextRewardMilestone,
  normalizeRewardPoints,
  rewardPointsEarnedBetween,
  rewardPointsFromEligibleSpend,
  rewardProgress,
} from './rewards';

describe('fixed reward points', () => {
  it('uses one point per 100 DKK', () => {
    expect(DKK_PER_REWARD_POINT).toBe(100);
    expect(rewardPointsFromEligibleSpend(0)).toBe(0);
    expect(rewardPointsFromEligibleSpend(99)).toBe(0);
    expect(rewardPointsFromEligibleSpend(100)).toBe(1);
    expect(rewardPointsFromEligibleSpend(890)).toBe(8);
  });

  it('awards points cumulatively rather than rounding every payment separately', () => {
    expect(rewardPointsEarnedBetween(90, 110)).toBe(1);
    expect(rewardPointsEarnedBetween(199, 201)).toBe(1);
    expect(rewardPointsEarnedBetween(201, 250)).toBe(0);
  });

  it('normalizes fractional legacy balances to whole non-negative points', () => {
    expect(normalizeRewardPoints(141.6)).toBe(141);
    expect(normalizeRewardPoints(-1)).toBe(0);
    expect(normalizeRewardPoints('bad')).toBe(0);
  });

  it('defines the approved fixed reward milestones', () => {
    expect(REWARD_MILESTONES).toEqual([
      { points: 25, discountDkk: 50 },
      { points: 50, discountDkk: 100 },
      { points: 100, discountDkk: 200 },
      { points: 150, discountDkk: 300 },
    ]);
  });

  it('finds unlocked and upcoming rewards', () => {
    expect(highestUnlockedReward(24)).toBeNull();
    expect(highestUnlockedReward(50)).toEqual({ points: 50, discountDkk: 100 });
    expect(nextRewardMilestone(50)).toEqual({ points: 100, discountDkk: 200 });
    expect(nextRewardMilestone(150)).toBeNull();
  });

  it('calculates progress within the active milestone range', () => {
    expect(rewardProgress(10)).toMatchObject({ previousThreshold: 0, pointsNeeded: 15, percentage: 40 });
    expect(rewardProgress(30)).toMatchObject({ previousThreshold: 25, pointsNeeded: 20, percentage: 20 });
    expect(rewardProgress(150)).toMatchObject({ next: null, pointsNeeded: 0, percentage: 100 });
  });
});

import { describe, expect, it } from 'vitest';
import { REWARD_ROADMAP, MAX_REWARD, getAvailableReward, getNextReward, pointsRemainingToNext, redeem } from './loyaltyRoadmap';

describe('REWARD_ROADMAP', () => {
  it('tops out at 250 points = 500 DKK', () => {
    expect(MAX_REWARD).toEqual({ points: 250, discountDkk: 500 });
    expect(Math.max(...REWARD_ROADMAP.map(t => t.points))).toBe(250);
  });
});

describe('getAvailableReward / getNextReward', () => {
  it('matches the worked example: balance 42.00 -> 25pt/50DKK available, 50pt/100DKK next', () => {
    expect(getAvailableReward(42)).toEqual({ points: 25, discountDkk: 50 });
    expect(getNextReward(42)).toEqual({ points: 50, discountDkk: 100 });
    expect(pointsRemainingToNext(42)).toBe(8);
  });

  it('has no available reward below the first tier', () => {
    expect(getAvailableReward(10)).toBeNull();
    expect(getNextReward(10)).toEqual({ points: 25, discountDkk: 50 });
  });

  it('has no next reward once at or above the maximum', () => {
    expect(getNextReward(250)).toBeNull();
    expect(getNextReward(300)).toBeNull();
    expect(getAvailableReward(300)).toEqual(MAX_REWARD);
  });
});

describe('redeem', () => {
  it('matches the worked example: 42.00 balance, redeem 25pt reward -> 17.00', () => {
    expect(redeem(42, { points: 25, discountDkk: 50 })).toBe(17);
  });

  it('never goes below zero', () => {
    expect(redeem(10, { points: 25, discountDkk: 50 })).toBe(0);
  });
});

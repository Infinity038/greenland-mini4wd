import { describe, expect, it } from 'vitest';
import {
  calculatePrizePool,
  secondLifeClubOperationsRevenue,
  getPlacementSplits,
  splitPlacementPrize,
  RACE_ENTRY_FEE_DKK,
} from './prizePool';

describe('calculatePrizePool', () => {
  it('matches the worked example: 10 paid entries -> 1500 total, 975 pool, 525 club ops', () => {
    const result = calculatePrizePool(10);
    expect(result.totalRevenue).toBe(1500);
    expect(result.prizePool).toBe(975);
    expect(result.clubOperations).toBe(525);
  });

  it('uses only the 150 DKK race-entry fee as revenue', () => {
    expect(RACE_ENTRY_FEE_DKK).toBe(150);
  });

  it('returns zero for zero entries', () => {
    expect(calculatePrizePool(0)).toEqual({ totalRevenue: 0, prizePool: 0, clubOperations: 0 });
  });
});

describe('secondLifeClubOperationsRevenue', () => {
  it('sends 100% of second-life fees to Club Operations and never touches the Prize Pool', () => {
    expect(secondLifeClubOperationsRevenue(5)).toBe(250);
  });

  it('does not affect calculatePrizePool at all', () => {
    const withoutSecondLife = calculatePrizePool(10);
    // Second-life revenue is a wholly separate calculation — confirming there is no
    // shared/mutated state between the two functions.
    secondLifeClubOperationsRevenue(20);
    const stillSame = calculatePrizePool(10);
    expect(stillSame).toEqual(withoutSecondLife);
  });
});

describe('getPlacementSplits', () => {
  it('pays nothing below the minimum of 4 confirmed entries', () => {
    expect(getPlacementSplits(3)).toEqual([]);
  });

  it('splits 70/30 for 4-7 racers', () => {
    expect(getPlacementSplits(4)).toEqual([{ place: 1, percent: 0.7 }, { place: 2, percent: 0.3 }]);
    expect(getPlacementSplits(7)).toEqual([{ place: 1, percent: 0.7 }, { place: 2, percent: 0.3 }]);
  });

  it('splits 50/30/20 for 8 or more racers', () => {
    expect(getPlacementSplits(8)).toEqual([
      { place: 1, percent: 0.5 },
      { place: 2, percent: 0.3 },
      { place: 3, percent: 0.2 },
    ]);
  });
});

describe('splitPlacementPrize', () => {
  it('matches the worked example: 400 DKK -> 300 cash / 100 shop credit', () => {
    const result = splitPlacementPrize(400);
    expect(result.cashDkk).toBe(300);
    expect(result.shopCreditDkk).toBe(100);
    expect(result.roundingRemainderDkk).toBe(0);
  });

  it('keeps any whole-DKK rounding remainder with Club Operations (2 DKK -> 2 cash + 1 credit = 3, so remainder is -1)', () => {
    const result = splitPlacementPrize(2);
    expect(result.cashDkk).toBe(2);
    expect(result.shopCreditDkk).toBe(1);
    expect(result.roundingRemainderDkk).toBe(-1);
    // The three figures always reconcile back to the original placement total.
    expect(result.cashDkk + result.shopCreditDkk + result.roundingRemainderDkk).toBe(2);
  });
});

import { describe, expect, it } from 'vitest';
import { calculateChampionshipPoints, calculateSeasonTotal, compareForTiebreak, SEASON_COUNTED_EVENTS } from './championshipScoring';

describe('calculateChampionshipPoints', () => {
  it('awards placement points for 1st through 4th', () => {
    expect(calculateChampionshipPoints({ placement: 1, participated: true })).toBe(10);
    expect(calculateChampionshipPoints({ placement: 2, participated: true })).toBe(7);
    expect(calculateChampionshipPoints({ placement: 3, participated: true })).toBe(5);
    expect(calculateChampionshipPoints({ placement: 4, participated: true })).toBe(3);
  });

  it('awards 1 point for qualified participation with no placement', () => {
    expect(calculateChampionshipPoints({ placement: null, participated: true })).toBe(1);
    expect(calculateChampionshipPoints({ placement: 9, participated: true })).toBe(1);
  });

  it('awards 0 for a non-participant', () => {
    expect(calculateChampionshipPoints({ participated: false })).toBe(0);
  });

  it('adds a +1 bonus for the fastest official clean run', () => {
    expect(calculateChampionshipPoints({ placement: 2, participated: true, isFastestOfficialCleanRun: true })).toBe(8);
  });

  it('gives zero Championship Points for purchasing a Second Life by itself, but full points for the actual placement', () => {
    const withSecondLife = calculateChampionshipPoints({ placement: 1, participated: true, usedSecondLife: true });
    const withoutSecondLife = calculateChampionshipPoints({ placement: 1, participated: true, usedSecondLife: false });
    expect(withSecondLife).toBe(withoutSecondLife);
    expect(withSecondLife).toBe(10);
  });
});

describe('calculateSeasonTotal', () => {
  it('sums only the best 6 of up to 8 event scores', () => {
    expect(SEASON_COUNTED_EVENTS).toBe(6);
    const scores = [10, 8, 1, 10, 7, 5, 3, 10]; // 8 events, two low ones (1, 3) should drop
    expect(calculateSeasonTotal(scores)).toBe(10 + 10 + 10 + 8 + 7 + 5);
  });

  it('sums all events when fewer than 6 were entered', () => {
    expect(calculateSeasonTotal([10, 7])).toBe(17);
  });
});

describe('compareForTiebreak', () => {
  it('ranks by most wins first', () => {
    const a = { wins: 3, secondPlaces: 0, podiums: 3, headToHeadWins: 0, fastestCleanRunSeconds: 20 };
    const b = { wins: 2, secondPlaces: 5, podiums: 5, headToHeadWins: 5, fastestCleanRunSeconds: 10 };
    expect(compareForTiebreak(a, b)).toBeLessThan(0); // a ranks ahead of b
  });

  it('falls through to fastest clean run when everything else ties', () => {
    const a = { wins: 1, secondPlaces: 1, podiums: 2, headToHeadWins: 1, fastestCleanRunSeconds: 9.5 };
    const b = { wins: 1, secondPlaces: 1, podiums: 2, headToHeadWins: 1, fastestCleanRunSeconds: 10.2 };
    expect(compareForTiebreak(a, b)).toBeLessThan(0);
  });

  it('returns 0 (still tied) when every tiebreaker matches', () => {
    const a = { wins: 1, secondPlaces: 1, podiums: 2, headToHeadWins: 1, fastestCleanRunSeconds: null };
    const b = { wins: 1, secondPlaces: 1, podiums: 2, headToHeadWins: 1, fastestCleanRunSeconds: null };
    expect(compareForTiebreak(a, b)).toBe(0);
  });
});

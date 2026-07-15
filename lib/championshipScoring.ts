// Reference implementation of the performance-only Championship scoring model.
// Deliberately excludes any notion of spending, Loyalty Points, or Shop Credit —
// rank is earned exclusively through racing results.

export const PLACEMENT_POINTS: Record<number, number> = {
  1: 10,
  2: 7,
  3: 5,
  4: 3,
};

export const PARTICIPATION_POINT = 1;
export const FASTEST_CLEAN_RUN_BONUS = 1;

export const SEASON_TOTAL_EVENTS = 8;
export const SEASON_COUNTED_EVENTS = 6;

export interface RaceResultInput {
  /** Final placement, or null/undefined if the racer did not place but did participate. */
  placement?: number | null;
  participated: boolean;
  isFastestOfficialCleanRun?: boolean;
  /** Purchasing a Second Life earns zero Championship Points by itself. */
  usedSecondLife?: boolean;
}

// Championship Points come only from placement + participation + fastest-clean-run
// bonus. A Second Life purchase never adds points on its own, but a racer who used
// one still earns full points for their actual final placement.
export function calculateChampionshipPoints(result: RaceResultInput): number {
  if (!result.participated) return 0;
  const placementPoints = result.placement != null ? (PLACEMENT_POINTS[result.placement] ?? 0) : 0;
  const base = placementPoints > 0 ? placementPoints : PARTICIPATION_POINT;
  const bonus = result.isFastestOfficialCleanRun ? FASTEST_CLEAN_RUN_BONUS : 0;
  return base + bonus;
}

export interface SeasonTallyInput {
  wins: number;
  secondPlaces: number;
  podiums: number;
  headToHeadWins: number;
  fastestCleanRunSeconds: number | null;
}

// Tie-breaker order: most wins, most 2nd-place finishes, most podiums, best
// head-to-head result, fastest official clean run, then playoff/race-director call.
export function compareForTiebreak(a: SeasonTallyInput, b: SeasonTallyInput): number {
  if (a.wins !== b.wins) return b.wins - a.wins;
  if (a.secondPlaces !== b.secondPlaces) return b.secondPlaces - a.secondPlaces;
  if (a.podiums !== b.podiums) return b.podiums - a.podiums;
  if (a.headToHeadWins !== b.headToHeadWins) return b.headToHeadWins - a.headToHeadWins;
  const aTime = a.fastestCleanRunSeconds ?? Infinity;
  const bTime = b.fastestCleanRunSeconds ?? Infinity;
  if (aTime !== bTime) return aTime - bTime;
  return 0; // still tied — playoff or race-director decision
}

// Best-N-of-M season scoring: sums the highest SEASON_COUNTED_EVENTS event scores
// out of up to SEASON_TOTAL_EVENTS entered, so up to two missed/low events don't count.
export function calculateSeasonTotal(eventScores: number[]): number {
  return [...eventScores]
    .sort((a, b) => b - a)
    .slice(0, SEASON_COUNTED_EVENTS)
    .reduce((sum, s) => sum + s, 0);
}

// Reference implementation of the Prize Pool / Club Operations model. Pure,
// presentational-calculator logic only — does not read or write any order/ticket
// data. The live app/tournament/page.tsx calculator still shows the old 70/30
// model tied to the current (unchanged) ticket-purchase flow; this module is the
// reference for when that flow is rebuilt around Race Entry / Second Life pricing.

export const RACE_ENTRY_FEE_DKK = 150;
export const SECOND_LIFE_FEE_DKK = 50;
export const PRACTICE_FEE_DKK = 50;
export const HOUSE_CAR_RENTAL_PER_HOUR_DKK = 25;

export const PRIZE_POOL_SHARE = 0.65;
export const CLUB_OPERATIONS_SHARE = 0.35;

export interface PrizePoolBreakdown {
  totalRevenue: number;
  prizePool: number;
  clubOperations: number;
}

// Only confirmed 150 DKK first-life race entries build the Prize Pool. Second
// lives, practice, rentals, product sales and merchandise never count here.
export function calculatePrizePool(confirmedFirstEntries: number): PrizePoolBreakdown {
  const entries = Math.max(0, Math.floor(confirmedFirstEntries));
  const totalRevenue = entries * RACE_ENTRY_FEE_DKK;
  return {
    totalRevenue,
    prizePool: Math.round(totalRevenue * PRIZE_POOL_SHARE),
    clubOperations: Math.round(totalRevenue * CLUB_OPERATIONS_SHARE),
  };
}

// The 50 DKK Second Life fee goes 100% to Club Operations and never touches the
// announced Prize Pool, including after it has been announced.
export function secondLifeClubOperationsRevenue(secondLifeCount: number): number {
  return Math.max(0, Math.floor(secondLifeCount)) * SECOND_LIFE_FEE_DKK;
}

export interface PlacementSplit {
  place: number;
  percent: number;
}

// Minimum recommended prize-paying attendance is 4 confirmed paid first-life
// entries — below that, no placement prizes are paid from the pool.
export const MIN_PRIZE_PAYING_ENTRIES = 4;

export function getPlacementSplits(confirmedFirstEntries: number): PlacementSplit[] {
  if (confirmedFirstEntries < MIN_PRIZE_PAYING_ENTRIES) return [];
  if (confirmedFirstEntries >= 8) {
    return [
      { place: 1, percent: 0.5 },
      { place: 2, percent: 0.3 },
      { place: 3, percent: 0.2 },
    ];
  }
  return [
    { place: 1, percent: 0.7 },
    { place: 2, percent: 0.3 },
  ];
}

export interface PlacementPrizeSplit {
  totalDkk: number;
  cashDkk: number;
  shopCreditDkk: number;
  /** Rounding difference from whole-DKK cash/credit split — stays with Club Operations. */
  roundingRemainderDkk: number;
}

// Each placement prize pays 75% cash / 25% Shop Credit, rounded to whole DKK.
// Any rounding difference remains with Club Operations rather than the racer.
export function splitPlacementPrize(totalDkk: number): PlacementPrizeSplit {
  const cashDkk = Math.round(totalDkk * 0.75);
  const shopCreditDkk = Math.round(totalDkk * 0.25);
  return {
    totalDkk,
    cashDkk,
    shopCreditDkk,
    roundingRemainderDkk: totalDkk - cashDkk - shopCreditDkk,
  };
}

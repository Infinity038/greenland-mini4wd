// Decimal-safe money math. Every function in this module operates on integer
// øre (1 DKK = 100 øre) — never on floating-point DKK amounts — per the
// locked pricing policy (docs/PRODUCT-PRICING-POLICY.md): "All money
// calculations must use integer øre or another decimal-safe method."
//
// The only place a fraction ever appears is the single multiplication that
// converts a foreign-currency supplier cost into DKK using an exchange-rate
// snapshot; that result is rounded to the nearest øre immediately, so no
// floating-point error can accumulate across subsequent additions.

export function dkkToOre(dkk: number): number {
  return Math.round(dkk * 100);
}

export function oreToDkk(ore: number): number {
  return ore / 100;
}

// Converts a foreign-currency amount to DKK øre using a stored exchange-rate
// snapshot (DKK per 1 unit of the foreign currency). Rounds once, to the
// nearest øre — this is the single decimal-unsafe boundary in the whole
// pricing system, and it is intentionally isolated here.
export function convertToDkkOre(foreignAmount: number, dkkPerForeignUnit: number): number {
  return Math.round(foreignAmount * dkkPerForeignUnit * 100);
}

// Landed cost = supplier cost (already converted to DKK øre) + fixed
// allocated shipping (øre). Both are already-rounded integers, so this
// addition is exact.
export function landedCostOre(supplierCostDkkOre: number, shippingOre: number): number {
  return supplierCostDkkOre + shippingOre;
}

// Exact minimum retail price implied by a margin floor, in øre.
// minimum = landedCost / (1 - marginFloor)
// e.g. marginFloor 0.5 (50%) => landedCost * 2, exactly as the locked policy states.
export function minimumPriceForMarginOre(landedCostOreValue: number, marginFloor: number): number {
  if (marginFloor < 0 || marginFloor >= 1) {
    throw new Error(`marginFloor must be in [0, 1); got ${marginFloor}`);
  }
  return landedCostOreValue / (1 - marginFloor);
}

// Gross margin fraction for a given sale price and landed cost, both in øre.
// Returns e.g. 0.5 for a 50% margin. NaN-safe: a zero sale price returns 0.
export function grossMarginFraction(saleOre: number, landedCostOreValue: number): number {
  if (saleOre <= 0) return 0;
  return (saleOre - landedCostOreValue) / saleOre;
}

const ENDING_NINE_GRID_STEP_ORE = 1000; // 10 DKK between consecutive "ends in 9" prices
const ENDING_NINE_GRID_OFFSET_ORE = 900; // 9 DKK offset (…19, 29, 39 DKK)

// The one rounding rule used everywhere a published price is produced:
// "select the closest price ending in 9 that does not fall below the
// required margin floor." `targetOre` is the exact computed value (a minimum
// retail price, or a requested/discounted price); `floorOre` is the price
// that must never be undercut (for a regular price these are the same
// value; for a campaign price the floor is the campaign's own margin-floor
// price, which can be lower than the requested target).
//
// Returns the final whole-DKK price (in øre, always a multiple of 100) and
// whether the floor forced the result above the nearest unconstrained
// candidate (i.e. the price was "margin-capped").
export function roundToEndingNineNotBelowFloor(
  targetOre: number,
  floorOre: number
): { priceOre: number; wasCapped: boolean } {
  if (targetOre <= 0) throw new Error('targetOre must be positive');
  if (floorOre < 0) throw new Error('floorOre must not be negative');

  const stepsBelow = Math.floor((targetOre - ENDING_NINE_GRID_OFFSET_ORE) / ENDING_NINE_GRID_STEP_ORE);
  const lower = stepsBelow * ENDING_NINE_GRID_STEP_ORE + ENDING_NINE_GRID_OFFSET_ORE;
  const upper = lower + ENDING_NINE_GRID_STEP_ORE;

  // Nearest candidate to the target; a tie (equidistant) resolves to the
  // higher candidate, matching the locked example "124 minimum -> 129" where
  // 119 and 129 are equally close to 124.
  const distToLower = targetOre - lower;
  const distToUpper = upper - targetOre;
  let candidate = distToLower < distToUpper ? lower : upper;

  const nearestUnconstrained = candidate;

  // Never let the nearest candidate fall below the floor — step up the grid
  // until it doesn't. A single step covers every case the locked examples
  // describe, but this loops defensively in case a floor sits more than one
  // grid step above the nearest candidate.
  while (candidate < floorOre) {
    candidate += ENDING_NINE_GRID_STEP_ORE;
  }

  return { priceOre: candidate, wasCapped: candidate !== nearestUnconstrained };
}

// Convenience for the common "regular retail price" case, where the target
// IS the margin floor (there is nothing else to round toward — the computed
// minimum retail price is both the target and the floor).
export function roundUpToEndingNine(minimumOre: number): number {
  return roundToEndingNineNotBelowFloor(minimumOre, minimumOre).priceOre;
}

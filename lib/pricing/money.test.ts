import { describe, it, expect } from 'vitest';
import {
  dkkToOre,
  oreToDkk,
  convertToDkkOre,
  landedCostOre,
  minimumPriceForMarginOre,
  grossMarginFraction,
  roundToEndingNineNotBelowFloor,
  roundUpToEndingNine,
} from './money';

describe('money — øre conversions', () => {
  it('converts DKK to øre and back', () => {
    expect(dkkToOre(129)).toBe(12900);
    expect(dkkToOre(286.66)).toBe(28666);
    expect(oreToDkk(23900)).toBe(239);
  });

  it('converts a foreign-currency amount to DKK øre using an exchange-rate snapshot', () => {
    // 350 PHP at an 0.11 DKK/PHP snapshot -> 38.5 DKK -> 3850 øre
    expect(convertToDkkOre(350, 0.11)).toBe(3850);
  });
});

describe('money — landed cost', () => {
  it('adds supplier cost (øre) and fixed shipping (øre) exactly', () => {
    expect(landedCostOre(3850, 2500)).toBe(6350); // 38.50 + 25.00 = 63.50 DKK
  });
});

describe('money — margin floor', () => {
  it('computes the exact minimum price for a 50% margin floor (landed cost x2)', () => {
    expect(minimumPriceForMarginOre(6350, 0.5)).toBe(12700); // 63.50 * 2 = 127.00
  });

  it('computes the exact minimum price for a 40% margin floor', () => {
    expect(minimumPriceForMarginOre(6000, 0.4)).toBeCloseTo(10000, 5); // 60 / 0.6 = 100
  });

  it('computes the exact minimum price for a 30% margin floor', () => {
    expect(minimumPriceForMarginOre(7000, 0.3)).toBeCloseTo(10000, 5); // 70 / 0.7 = 100
  });

  it('computes the exact minimum price for a 20% margin floor', () => {
    expect(minimumPriceForMarginOre(8000, 0.2)).toBeCloseTo(10000, 5); // 80 / 0.8 = 100
  });

  it('computes the exact minimum price for a 0% margin floor (liquidation — never below cost)', () => {
    expect(minimumPriceForMarginOre(10000, 0)).toBe(10000); // floor == landed cost exactly
  });

  it('rejects an invalid margin floor', () => {
    expect(() => minimumPriceForMarginOre(1000, 1)).toThrow();
    expect(() => minimumPriceForMarginOre(1000, -0.1)).toThrow();
  });
});

describe('money — gross margin fraction', () => {
  it('computes margin at a given sale price', () => {
    expect(grossMarginFraction(12900, 6350)).toBeCloseTo(0.5078, 3); // (129-63.5)/129
  });

  it('returns 0 for a non-positive sale price', () => {
    expect(grossMarginFraction(0, 100)).toBe(0);
  });
});

describe('money — ending-in-9 rounding (locked examples)', () => {
  const cases: [number, number][] = [
    [124, 129],
    [142, 149],
    [154, 159],
    [166, 169],
    [192, 199],
    [286.66, 289],
  ];

  it.each(cases)('rounds a minimum of %d DKK up to %d DKK', (minimumDkk, expectedDkk) => {
    const minimumOre = dkkToOre(minimumDkk);
    expect(roundUpToEndingNine(minimumOre)).toBe(dkkToOre(expectedDkk));
  });

  it('never rounds below the floor even for exact ending-in-9 minimums', () => {
    // A minimum that is already exactly 119 rounds to itself, not down to 109.
    expect(roundUpToEndingNine(dkkToOre(119))).toBe(dkkToOre(119));
  });

  it('rounds toward the nearest ending-in-9 price for a target below its own floor (campaign case)', () => {
    // Requested 239.2 DKK (299 * 0.8), floor well below it -> nearest is 239, not forced up.
    const result = roundToEndingNineNotBelowFloor(dkkToOre(239.2), dkkToOre(200));
    expect(result.priceOre).toBe(dkkToOre(239));
    expect(result.wasCapped).toBe(false);
  });

  it('caps a requested price that would fall below the floor', () => {
    // Requested 239.2 DKK but floor is 250 DKK -> must round up past the floor.
    const result = roundToEndingNineNotBelowFloor(dkkToOre(239.2), dkkToOre(250));
    expect(result.priceOre).toBe(dkkToOre(259));
    expect(result.wasCapped).toBe(true);
  });

  it('rejects a non-positive target', () => {
    expect(() => roundToEndingNineNotBelowFloor(0, 0)).toThrow();
  });
});

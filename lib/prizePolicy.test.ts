import { describe, it, expect } from 'vitest';
import {
 getPrizePolicy, getPrizeAllocation, stampNewRegularPrizePolicy,
 NEW_REGULAR_PRIZE_POLICY_TAG
} from './prizePolicy';

describe('prospective race policy and historical commitments', () => {
 it('does not mutate existing event descriptions or prize promises', () => {
   expect(stampNewRegularPrizePolicy('Previously advertised terms', true, 'weekly')).toBe('Previously advertised terms');
   expect(getPrizePolicy({ description:'Previously advertised terms' }).prizePct).toBe(70);
 });
 it('stamps new regular events only', () => {
   const description = stampNewRegularPrizePolicy('Race in Nuuk', false, 'weekly');
   expect(description).toContain(NEW_REGULAR_PRIZE_POLICY_TAG);
   expect(getPrizePolicy({ description }).prizePct).toBe(35);
   expect(getPrizePolicy({ description }).clubPct).toBe(65);
   expect(stampNewRegularPrizePolicy(description, false, 'weekly')).toBe(description);
 });
 it('does not stamp new special-season event by default', () => {
   expect(stampNewRegularPrizePolicy('Special championship', false, 'season')).toBe('Special championship');
 });
 it('preserves the total after integer rounding', () => {
   expect(getPrizeAllocation(4500,35)).toEqual({ paidRevenue:4500, prizes:1575, club:2925 });
   expect(getPrizeAllocation(4500,70)).toEqual({ paidRevenue:4500, prizes:3150, club:1350 });
   expect(getPrizeAllocation(0,35).prizes).toBe(0);
   expect(getPrizeAllocation(-1,35).paidRevenue).toBe(0);
 });
});

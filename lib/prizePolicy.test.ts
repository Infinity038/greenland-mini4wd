import { describe, it, expect } from 'vitest';
import {
 getPrizePolicy, getPrizeAllocation, stampNewRegularPrizePolicy, calculateFixedPrize,
 publicEventDescription, publicPrizeSummary, isFixedPrizePolicy,
 FIXED_PRIZE_POLICY_TAG, NEW_REGULAR_PRIZE_POLICY_TAG
} from './prizePolicy';

describe('prospective six-racer prize policy', () => {
 it('preserves previously published event terms and internal allocation', () => {
   expect(stampNewRegularPrizePolicy('Original published terms', true, 'weekly')).toBe('Original published terms');
   expect(getPrizePolicy({ description:'Original published terms' }).prizePct).toBe(70);
   expect(getPrizePolicy({ description:NEW_REGULAR_PRIZE_POLICY_TAG }).prizePct).toBe(35);
 });
 it('stamps only new regular events, not special seasons or already-stamped events', () => {
   const desc=stampNewRegularPrizePolicy('Nuuk race',false,'weekly');
   expect(desc).toContain(FIXED_PRIZE_POLICY_TAG);
   expect(isFixedPrizePolicy({description:desc})).toBe(true);
   expect(stampNewRegularPrizePolicy(desc,false,'weekly')).toBe(desc);
   expect(stampNewRegularPrizePolicy('Season finals',false,'season')).toBe('Season finals');
 });
 it('requires six distinct paid racers and grows by 25 for each extra', () => {
   expect(calculateFixedPrize(0)).toEqual({eligible:false,required:6,prizeDkk:0,missing:6});
   expect(calculateFixedPrize(5)).toEqual({eligible:false,required:6,prizeDkk:0,missing:1});
   expect(calculateFixedPrize(6).prizeDkk).toBe(350);
   expect(calculateFixedPrize(7).prizeDkk).toBe(375);
   expect(calculateFixedPrize(9).prizeDkk).toBe(425);
   expect(calculateFixedPrize(15).prizeDkk).toBe(575);
   expect(calculateFixedPrize(-6).prizeDkk).toBe(0);
   expect(calculateFixedPrize(Number.NaN).eligible).toBe(false);
 });
 it('omits internal prize allocation markers from public copy without changing stored history', () => {
   expect(publicEventDescription('Nuuk race\n\n'+NEW_REGULAR_PRIZE_POLICY_TAG)).toBe('Nuuk race');
   expect(publicEventDescription('Nuuk race\n\n'+FIXED_PRIZE_POLICY_TAG)).toBe('Nuuk race');
   expect(publicPrizeSummary({description:FIXED_PRIZE_POLICY_TAG})).toContain('350 DKK');
   expect(publicPrizeSummary({description:'Legacy event'})).toContain('originally published');
 });
 it('preserves historical accounting calculation for staff-only records', () => {
   expect(getPrizeAllocation(4500,35)).toEqual({paidRevenue:4500,prizes:1575,club:2925});
   expect(getPrizeAllocation(4500,70)).toEqual({paidRevenue:4500,prizes:3150,club:1350});
 });
});

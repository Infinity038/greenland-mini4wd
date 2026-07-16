import { describe, it, expect } from 'vitest';
import { RACE_CHECK_IN_STEPS, RACE_CHECK_IN_NOTICE } from './raceCheckInSteps';

describe('raceCheckInSteps', () => {
  it('has exactly 10 steps, numbered 1 through 10 in order', () => {
    expect(RACE_CHECK_IN_STEPS).toHaveLength(10);
    RACE_CHECK_IN_STEPS.forEach((s, i) => expect(s.step).toBe(i + 1));
  });

  it('every step has a non-empty title and description', () => {
    for (const s of RACE_CHECK_IN_STEPS) {
      expect(s.title.trim().length).toBeGreaterThan(0);
      expect(s.desc.trim().length).toBeGreaterThan(0);
    }
  });

  it('no step implies an online/digital ticket purchase', () => {
    const forbidden = /buy.*ticket|online payment|purchase.*ticket|pay online/i;
    for (const s of RACE_CHECK_IN_STEPS) {
      expect(`${s.title} ${s.desc}`).not.toMatch(forbidden);
    }
  });

  it('exposes the exact required in-person notice text', () => {
    expect(RACE_CHECK_IN_NOTICE).toBe(
      'Race entry is paid in person during Race Check-In. The website does not sell digital race tickets.'
    );
  });
});

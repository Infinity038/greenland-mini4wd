import { describe, expect, it } from 'vitest';
import { RACE_ENTRY_PRICES, getRaceEntryPrice, IN_PERSON_ONLY_NOTICE } from './raceEntryPricing';

describe('RACE_ENTRY_PRICES', () => {
  it('matches the required weekly pricing: 150 DKK entry / 50 DKK second life', () => {
    expect(getRaceEntryPrice('weekly')).toEqual({ tier: 'weekly', label: 'Weekly Race', firstEntryDkk: 150, secondLifeDkk: 50 });
  });

  it('matches the required big-event pricing: 500 DKK entry / 100 DKK second life', () => {
    expect(getRaceEntryPrice('big_event')).toEqual({ tier: 'big_event', label: 'Big Event', firstEntryDkk: 500, secondLifeDkk: 100 });
  });

  it('exposes no online-payment fields (no checkout URL, no card/payment-method field) — pricing is informational only', () => {
    for (const tier of Object.values(RACE_ENTRY_PRICES)) {
      expect(Object.keys(tier).sort()).toEqual(['firstEntryDkk', 'label', 'secondLifeDkk', 'tier'].sort());
    }
  });
});

describe('IN_PERSON_ONLY_NOTICE', () => {
  it('matches the exact required copy', () => {
    expect(IN_PERSON_ONLY_NOTICE).toBe(
      'Race entry is paid in person during event check-in. You may RSVP online to help the club estimate attendance, but an RSVP is not a paid race entry.'
    );
  });
});

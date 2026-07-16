// Authoritative in-person race-entry pricing. Race entry is paid only at the
// venue during check-in — nothing here is charged online. See lib/eventRsvp.ts
// for the free RSVP mechanism these prices are displayed alongside.

export type EventTier = 'weekly' | 'big_event';

export interface RaceEntryPriceTier {
  tier: EventTier;
  label: string;
  firstEntryDkk: number;
  secondLifeDkk: number;
}

export const RACE_ENTRY_PRICES: Record<EventTier, RaceEntryPriceTier> = {
  weekly: { tier: 'weekly', label: 'Weekly Race', firstEntryDkk: 150, secondLifeDkk: 50 },
  big_event: { tier: 'big_event', label: 'Big Event', firstEntryDkk: 500, secondLifeDkk: 100 },
};

export function getRaceEntryPrice(tier: EventTier): RaceEntryPriceTier {
  return RACE_ENTRY_PRICES[tier];
}

export const IN_PERSON_ONLY_NOTICE =
  'Race entry is paid in person during event check-in. You may RSVP online to help the club estimate attendance, but an RSVP is not a paid race entry.';

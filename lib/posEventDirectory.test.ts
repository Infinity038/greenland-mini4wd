import { describe, it, expect } from 'vitest';
import { lookupEventByQrToken, searchEvents, MOCK_EVENT_DIRECTORY } from './posEventDirectory';

describe('lookupEventByQrToken', () => {
  it('selects the event for a valid Event QR token', () => {
    const event = lookupEventByQrToken('tok_event_weekly_260718');
    expect(event).toEqual(MOCK_EVENT_DIRECTORY[0]);
  });

  it('fills in date, type, category options, check-in close time and pricing model', () => {
    const event = lookupEventByQrToken('tok_event_bigevent_260815')!;
    expect(event.date).toBe('2026-08-15');
    expect(event.type).toBe('big_event');
    expect(event.categoryOptions.length).toBeGreaterThan(0);
    expect(event.checkInClosesAt).toBeTruthy();
    expect(event.pricingModel).toBe('big_event');
  });

  it('returns null for an unknown token', () => {
    expect(lookupEventByQrToken('tok_unknown')).toBeNull();
  });
});

describe('searchEvents', () => {
  it('finds an event by name', () => {
    expect(searchEvents('Arctic Hustle').map(e => e.eventId)).toContain('EVT-2026-08-15');
  });

  it('returns all events for an empty query', () => {
    expect(searchEvents('')).toEqual(MOCK_EVENT_DIRECTORY);
  });
});

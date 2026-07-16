import { beforeEach, describe, expect, it } from 'vitest';
import { createRsvp, saveRsvp, getRsvpsForEvent, getRsvpForRacer } from './eventRsvp';

beforeEach(() => {
  window.localStorage.clear();
});

describe('createRsvp', () => {
  it('never includes a ticket, life, payment, or points field', () => {
    const rsvp = createRsvp({ eventId: 'evt-1', racerEmail: 'a@b.com', category: 'Box Stock', carId: 'car-1', carName: 'Ray Spear' });
    // Structural proof there is no paid-ticket/life/points/payment shape at all.
    expect(rsvp).not.toHaveProperty('ticketId');
    expect(rsvp).not.toHaveProperty('paymentStatus');
    expect(rsvp).not.toHaveProperty('life');
    expect(rsvp).not.toHaveProperty('pointsDelta');
    expect(rsvp).not.toHaveProperty('amountDkk');
    expect(Object.keys(rsvp).sort()).toEqual(['carId', 'carName', 'category', 'createdAt', 'eventId', 'racerEmail'].sort());
  });
});

describe('saveRsvp / getRsvpsForEvent / getRsvpForRacer', () => {
  it('does not create a ticket: saving an RSVP never touches the race_tickets localStorage/cache keys', () => {
    saveRsvp(createRsvp({ eventId: 'evt-1', racerEmail: 'a@b.com', category: 'Box Stock' }));
    // Only the RSVP key should exist — nothing resembling a ticket/cache key.
    const keys = Object.keys(window.localStorage);
    expect(keys).toEqual(['gm4wd_event_rsvps_v1']);
  });

  it('does not award points: an RSVP has no amount, so no loyalty calculation is possible from it', () => {
    const rsvp = createRsvp({ eventId: 'evt-1', racerEmail: 'a@b.com', category: 'Box Stock' });
    expect((rsvp as unknown as { amountDkk?: number }).amountDkk).toBeUndefined();
  });

  it('round-trips a saved RSVP and retrieves it per racer/event', () => {
    const rsvp = createRsvp({ eventId: 'evt-1', racerEmail: 'a@b.com', category: 'B-MAX', carId: 'car-9', carName: 'Neo-VQS' });
    saveRsvp(rsvp);
    expect(getRsvpsForEvent('evt-1')).toEqual([rsvp]);
    expect(getRsvpForRacer('evt-1', 'a@b.com')).toEqual(rsvp);
    expect(getRsvpForRacer('evt-1', 'nobody@else.com')).toBeNull();
  });

  it('replaces a racer\'s previous RSVP for the same event instead of duplicating it', () => {
    saveRsvp(createRsvp({ eventId: 'evt-1', racerEmail: 'a@b.com', category: 'Box Stock' }));
    saveRsvp(createRsvp({ eventId: 'evt-1', racerEmail: 'a@b.com', category: 'B-MAX' }));
    const forEvent = getRsvpsForEvent('evt-1');
    expect(forEvent).toHaveLength(1);
    expect(forEvent[0].category).toBe('B-MAX');
  });
});

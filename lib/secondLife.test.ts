import { describe, expect, it } from 'vitest';
import { canPurchaseSecondLife, isSecondLifeUsableFor, isSecondLifeExpired } from './secondLife';

const BASE_STATE = {
  checkInClosed: false,
  racerEliminated: false,
  finalBracketAnnounced: false,
  prizePoolAnnounced: false,
  raceStarted: false,
};

describe('canPurchaseSecondLife', () => {
  it('is eligible when nothing has happened yet', () => {
    expect(canPurchaseSecondLife(BASE_STATE)).toEqual({ eligible: true });
  });

  it('is not eligible once check-in has closed', () => {
    expect(canPurchaseSecondLife({ ...BASE_STATE, checkInClosed: true }).eligible).toBe(false);
  });

  it('is not eligible after the racer has been eliminated', () => {
    expect(canPurchaseSecondLife({ ...BASE_STATE, racerEliminated: true }).eligible).toBe(false);
  });

  it('is not eligible after the final bracket is announced', () => {
    expect(canPurchaseSecondLife({ ...BASE_STATE, finalBracketAnnounced: true }).eligible).toBe(false);
  });

  it('is not eligible after the prize pool has been announced', () => {
    expect(canPurchaseSecondLife({ ...BASE_STATE, prizePoolAnnounced: true }).eligible).toBe(false);
  });

  it('is not eligible once the race has begun', () => {
    expect(canPurchaseSecondLife({ ...BASE_STATE, raceStarted: true }).eligible).toBe(false);
  });
});

describe('isSecondLifeUsableFor', () => {
  const purchased = { racerId: 'r1', carId: 'c1', category: 'Box Stock', eventDate: '2026-07-25' };

  it('is usable for the exact same racer/car/category/event', () => {
    expect(isSecondLifeUsableFor(purchased, { ...purchased })).toBe(true);
  });

  it('cannot be moved to another car', () => {
    expect(isSecondLifeUsableFor(purchased, { ...purchased, carId: 'c2' })).toBe(false);
  });

  it('cannot be used by another racer', () => {
    expect(isSecondLifeUsableFor(purchased, { ...purchased, racerId: 'r2' })).toBe(false);
  });

  it('cannot be carried to another event date', () => {
    expect(isSecondLifeUsableFor(purchased, { ...purchased, eventDate: '2026-08-01' })).toBe(false);
  });

  it('cannot be used in a different category', () => {
    expect(isSecondLifeUsableFor(purchased, { ...purchased, category: 'B-MAX' })).toBe(false);
  });
});

describe('isSecondLifeExpired', () => {
  it('expires the moment the event ends', () => {
    const eventEnd = '2026-07-25T20:00:00Z';
    expect(isSecondLifeExpired(eventEnd, new Date('2026-07-25T19:59:59Z'))).toBe(false);
    expect(isSecondLifeExpired(eventEnd, new Date('2026-07-25T20:00:00Z'))).toBe(true);
    expect(isSecondLifeExpired(eventEnd, new Date('2026-07-26T00:00:00Z'))).toBe(true);
  });
});

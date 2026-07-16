import { describe, expect, it } from 'vitest';
import { buildConfirmedPaymentActivityEntry } from './inPersonPayment';

describe('buildConfirmedPaymentActivityEntry', () => {
  it('represents a confirmed in-person race-entry payment in Points Activity with correct points', () => {
    const entry = buildConfirmedPaymentActivityEntry({
      id: 'pay-1',
      date: '25 Jul 2026',
      description: 'Box Stock Race Entry',
      amountDkk: 150,
      reference: 'AM4WD-260725',
    });
    expect(entry.channel).toBe('In person');
    expect(entry.status).toBe('Confirmed');
    expect(entry.amountDkk).toBe(150);
    expect(entry.pointsDelta).toBe(1.5);
    expect(entry.reference).toBe('AM4WD-260725');
  });

  it('represents a confirmed Second Life payment (50 DKK -> 0.50 points)', () => {
    const entry = buildConfirmedPaymentActivityEntry({ id: 'pay-2', date: '25 Jul 2026', description: 'Second Life', amountDkk: 50 });
    expect(entry.pointsDelta).toBe(0.5);
  });

  it('represents a confirmed Big Event race-entry payment (500 DKK -> 5.00 points)', () => {
    const entry = buildConfirmedPaymentActivityEntry({ id: 'pay-3', date: '25 Jul 2026', description: 'Big Event Race Entry', amountDkk: 500 });
    expect(entry.pointsDelta).toBe(5);
  });
});

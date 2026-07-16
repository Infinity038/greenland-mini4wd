import { describe, expect, it } from 'vitest';
import {
  formatPhysicalCardId,
  requestFirstCard,
  hasActivePhysicalCard,
  submitReplacementRequest,
  confirmReplacementPayment,
  beginProduction,
  markReadyForPickup,
  markCollected,
  REPLACEMENT_FEE_DKK,
} from './physicalCard';

describe('formatPhysicalCardId', () => {
  it('matches the required example: base 0082, version 2 -> CARD-0082-V2', () => {
    expect(formatPhysicalCardId('0082', 2)).toBe('CARD-0082-V2');
  });
});

describe('requestFirstCard', () => {
  it('is version 1, status Requested, and free (no payment field set)', () => {
    const card = requestFirstCard('G4W-R-0047', '0082');
    expect(card.version).toBe(1);
    expect(card.status).toBe('Requested');
    expect(card.paymentConfirmedDate).toBeNull();
    expect(card.racerId).toBe('G4W-R-0047');
  });
});

describe('replacement workflow', () => {
  it('a replacement request starts as Awaiting Payment', () => {
    const first = requestFirstCard('G4W-R-0047', '0082');
    const replacement = submitReplacementRequest(first, 'Lost card');
    expect(replacement.status).toBe('Awaiting Payment');
  });

  it('costs 25 DKK per the required notice', () => {
    expect(REPLACEMENT_FEE_DKK).toBe(25);
  });

  it('production cannot begin before payment confirmation', () => {
    const first = requestFirstCard('G4W-R-0047', '0082');
    const replacement = submitReplacementRequest(first, 'Lost card');
    expect(() => beginProduction(replacement, first)).toThrow(/payment/i);
  });

  it('payment confirmation allows In Production status', () => {
    const first = requestFirstCard('G4W-R-0047', '0082');
    const replacement = submitReplacementRequest(first, 'Lost card');
    const paid = confirmReplacementPayment(replacement);
    const { newCard } = beginProduction(paid, first);
    expect(newCard.status).toBe('In Production');
  });

  it('replacement creates a new card version without changing the Racer ID', () => {
    const first = requestFirstCard('G4W-R-0047', '0082');
    const replacement = submitReplacementRequest(first, 'Lost card');
    expect(replacement.version).toBe(2);
    expect(replacement.cardId).toBe('CARD-0082-V2');
    expect(replacement.racerId).toBe(first.racerId);
  });

  it('replacement deactivates the old physical card once production begins', () => {
    const first = requestFirstCard('G4W-R-0047', '0082');
    const replacement = submitReplacementRequest(first, 'Lost card');
    const paid = confirmReplacementPayment(replacement);
    const { deactivatedOldCard } = beginProduction(paid, first);
    expect(deactivatedOldCard.status).toBe('Deactivated');
    expect(deactivatedOldCard.deactivatedDate).not.toBeNull();
  });

  it('never leaves the old card active after replacement approval', () => {
    const first = requestFirstCard('G4W-R-0047', '0082');
    const replacement = submitReplacementRequest(first, 'Lost card');
    const paid = confirmReplacementPayment(replacement);
    const { deactivatedOldCard } = beginProduction(paid, first);
    expect(hasActivePhysicalCard([deactivatedOldCard])).toBe(false);
  });

  it('does not touch points or race history — the record has no such fields at all', () => {
    const first = requestFirstCard('G4W-R-0047', '0082');
    const replacement = submitReplacementRequest(first, 'Lost card');
    expect(replacement).not.toHaveProperty('points');
    expect(replacement).not.toHaveProperty('raceHistory');
    expect(replacement).not.toHaveProperty('registeredCars');
  });

  it('completes the full lifecycle: ready for pickup then collected', () => {
    const first = requestFirstCard('G4W-R-0047', '0082');
    const replacement = submitReplacementRequest(first, 'Lost card');
    const paid = confirmReplacementPayment(replacement);
    const { newCard } = beginProduction(paid, first);
    const ready = markReadyForPickup(newCard);
    expect(ready.status).toBe('Ready for Pickup');
    const collected = markCollected(ready);
    expect(collected.status).toBe('Collected');
    expect(collected.collectedDate).not.toBeNull();
  });

  it('rejects out-of-order transitions (e.g. collecting before ready)', () => {
    const first = requestFirstCard('G4W-R-0047', '0082');
    expect(() => markCollected(first)).toThrow();
    expect(() => markReadyForPickup(first)).toThrow();
  });
});

describe('hasActivePhysicalCard', () => {
  it('is true for a Requested/Collected card, false once Deactivated/Rejected', () => {
    expect(hasActivePhysicalCard([requestFirstCard('G4W-R-0047', '0082')])).toBe(true);
    expect(hasActivePhysicalCard([])).toBe(false);
  });
});

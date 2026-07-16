// Physical Racer Card workflow. Pure state machine only — no persistence yet.
// Keeps three identities deliberately separate:
//   Racer ID        — permanent identity, e.g. G4W-R-0047 (lib/racerId.ts)
//   Digital QR      — account identity token (lib/qrIdentity.ts)
//   Physical Card ID — a specific printed card, e.g. CARD-0082-V2 (this module)
// A replacement never creates a new Racer ID, never erases points/race history/
// registered cars, and never begins production before payment is confirmed.

export type PhysicalCardStatus =
  | 'Not Requested'
  | 'Requested'
  | 'Awaiting Review'
  | 'Approved'
  | 'Awaiting Payment'
  | 'In Production'
  | 'Ready for Pickup'
  | 'Collected'
  | 'Rejected'
  | 'Deactivated';

export const REPLACEMENT_FEE_DKK = 25;

export const REPLACEMENT_CARD_NOTICE =
  'Replacement cards cost 25 DKK. Production begins only after payment has been confirmed. Your Racer ID and account history remain unchanged, but the previous physical card will be deactivated.';

export interface PhysicalCardRecord {
  cardId: string;
  baseCardNumber: string;
  version: number;
  racerId: string;
  status: PhysicalCardStatus;
  issuedDate: string | null;
  deactivatedDate: string | null;
  replacementReason: string | null;
  paymentConfirmedDate: string | null;
  collectedDate: string | null;
}

export function formatPhysicalCardId(baseCardNumber: string, version: number): string {
  return `CARD-${baseCardNumber}-V${version}`;
}

// First card is free — no payment step, goes straight to Requested.
export function requestFirstCard(racerId: string, baseCardNumber: string): PhysicalCardRecord {
  return {
    cardId: formatPhysicalCardId(baseCardNumber, 1),
    baseCardNumber,
    version: 1,
    racerId,
    status: 'Requested',
    issuedDate: null,
    deactivatedDate: null,
    replacementReason: null,
    paymentConfirmedDate: null,
    collectedDate: null,
  };
}

export function hasActivePhysicalCard(cards: PhysicalCardRecord[]): boolean {
  return cards.some(c => c.status !== 'Deactivated' && c.status !== 'Rejected');
}

// Submitting a replacement request does NOT touch the Racer ID, does not
// change any other card yet, and starts in Awaiting Payment — never further.
export function submitReplacementRequest(current: PhysicalCardRecord, reason: string): PhysicalCardRecord {
  return {
    cardId: formatPhysicalCardId(current.baseCardNumber, current.version + 1),
    baseCardNumber: current.baseCardNumber,
    version: current.version + 1,
    racerId: current.racerId,
    status: 'Awaiting Payment',
    issuedDate: null,
    deactivatedDate: null,
    replacementReason: reason,
    paymentConfirmedDate: null,
    collectedDate: null,
  };
}

export function confirmReplacementPayment(record: PhysicalCardRecord): PhysicalCardRecord {
  if (record.status !== 'Awaiting Payment') {
    throw new Error(`Cannot confirm payment from status "${record.status}"`);
  }
  return { ...record, paymentConfirmedDate: new Date().toISOString() };
}

export interface ProductionResult {
  newCard: PhysicalCardRecord;
  deactivatedOldCard: PhysicalCardRecord;
}

// Production may only begin once payment is confirmed. Deactivates the old
// card as part of the same transition — the old token must never remain
// active after replacement approval.
export function beginProduction(newCard: PhysicalCardRecord, oldCard: PhysicalCardRecord): ProductionResult {
  if (!newCard.paymentConfirmedDate) {
    throw new Error('Cannot begin production before payment has been confirmed.');
  }
  return {
    newCard: { ...newCard, status: 'In Production', issuedDate: new Date().toISOString() },
    deactivatedOldCard: { ...oldCard, status: 'Deactivated', deactivatedDate: new Date().toISOString() },
  };
}

export function markReadyForPickup(record: PhysicalCardRecord): PhysicalCardRecord {
  if (record.status !== 'In Production') {
    throw new Error(`Cannot mark ready for pickup from status "${record.status}"`);
  }
  return { ...record, status: 'Ready for Pickup' };
}

export function markCollected(record: PhysicalCardRecord): PhysicalCardRecord {
  if (record.status !== 'Ready for Pickup') {
    throw new Error(`Cannot mark collected from status "${record.status}"`);
  }
  return { ...record, status: 'Collected', collectedDate: new Date().toISOString() };
}

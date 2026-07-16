// Mock racer directory for the POS preview screen only — simulates what a
// Racer QR scan or a staff search would resolve to. Not wired to any live
// members table. Phone numbers exist here for staff search only and must
// never be rendered on a result card (see components/pos/RacerSearchCombobox.tsx).
import type { RacerAccountStatus } from './racerAccountStatus';
import type { PhysicalCardStatus } from './physicalCard';

export interface PosRacerRecord {
  racerId: string;
  qrToken: string;
  displayName: string;
  photoUrl: string | null;
  phone: string;
  clubCarIds: string[];
  accountStatus: RacerAccountStatus;
  physicalCardStatus: PhysicalCardStatus | 'None';
  loyaltyPoints: number;
  shopCreditDkk: number;
}

// A QR code carrying this exact sentinel simulates a revoked physical card
// for the demo screen — a real revoked-card QR would still resolve to a
// racer record, but be flagged invalid at the card layer, not the racer layer.
export const REVOKED_CARD_SCAN_CODE = 'REVOKED-CARD-DEMO';

export const MOCK_RACER_DIRECTORY: PosRacerRecord[] = [
  { racerId: 'G4W-R-0047', qrToken: 'tok_racer_0047', displayName: 'J. Racer',       photoUrl: null, phone: '+299 12 34 56', clubCarIds: ['G4W-BS-0047'],   accountStatus: 'Active',         physicalCardStatus: 'Collected',    loyaltyPoints: 42, shopCreditDkk: 100 },
  { racerId: 'G4W-R-0012', qrToken: 'tok_racer_0012', displayName: 'A. Nielsen',     photoUrl: null, phone: '+299 23 45 67', clubCarIds: ['G4W-BM-0012'],   accountStatus: 'Active',         physicalCardStatus: 'None',         loyaltyPoints: 8,  shopCreditDkk: 0 },
  { racerId: 'G4W-R-0099', qrToken: 'tok_racer_0099', displayName: 'K. Petersen',    photoUrl: null, phone: '+299 34 56 78', clubCarIds: [],                accountStatus: 'Pending Review', physicalCardStatus: 'None',         loyaltyPoints: 0,  shopCreditDkk: 0 },
  { racerId: 'G4W-R-0031', qrToken: 'tok_racer_0031', displayName: 'M. Lund',        photoUrl: null, phone: '+299 45 67 89', clubCarIds: ['G4W-OPEN-0031'], accountStatus: 'Suspended',      physicalCardStatus: 'Deactivated',  loyaltyPoints: 15, shopCreditDkk: 0 },
  { racerId: 'G4W-R-0004', qrToken: 'tok_racer_0004', displayName: 'S. Kristiansen', photoUrl: null, phone: '+299 56 78 90', clubCarIds: ['G4W-OBS-0004'],  accountStatus: 'Archived',       physicalCardStatus: 'Deactivated',  loyaltyPoints: 60, shopCreditDkk: 0 },
];

export type RacerScanOutcome =
  | { kind: 'found'; racer: PosRacerRecord }
  | { kind: 'invalid_qr' }
  | { kind: 'revoked_card' }
  | { kind: 'pending_account'; racer: PosRacerRecord }
  | { kind: 'suspended_account'; racer: PosRacerRecord }
  | { kind: 'archived_account'; racer: PosRacerRecord };

function classifyRacer(racer: PosRacerRecord): RacerScanOutcome {
  if (racer.accountStatus === 'Pending Review') return { kind: 'pending_account', racer };
  if (racer.accountStatus === 'Suspended') return { kind: 'suspended_account', racer };
  if (racer.accountStatus === 'Archived') return { kind: 'archived_account', racer };
  return { kind: 'found', racer };
}

// Resolves a scanned Racer QR token (g4w:racer:<qrToken>).
export function lookupRacerByQrToken(
  token: string,
  directory: PosRacerRecord[] = MOCK_RACER_DIRECTORY
): RacerScanOutcome {
  const trimmed = token.trim();
  if (!trimmed) return { kind: 'invalid_qr' };
  if (trimmed.toUpperCase() === REVOKED_CARD_SCAN_CODE) return { kind: 'revoked_card' };
  const racer = directory.find(r => r.qrToken === trimmed);
  if (!racer) return { kind: 'invalid_qr' };
  return classifyRacer(racer);
}

// Manual/typed fallback: matches by literal Racer ID (not the opaque QR
// token) so staff can type a Racer ID directly, or a hardware scanner can
// emit one, without a camera.
export function lookupRacerByScan(
  code: string,
  directory: PosRacerRecord[] = MOCK_RACER_DIRECTORY
): RacerScanOutcome {
  const trimmed = code.trim();
  if (!trimmed) return { kind: 'invalid_qr' };
  if (trimmed.toUpperCase() === REVOKED_CARD_SCAN_CODE) return { kind: 'revoked_card' };

  const racer = directory.find(r => trimmed === r.racerId || trimmed === r.qrToken || trimmed.endsWith(r.racerId));
  if (!racer) return { kind: 'invalid_qr' };
  return classifyRacer(racer);
}

// Searches Racer ID, display name, phone, and Club Car ID. Phone numbers are
// searchable but must never be shown on a result card.
export function searchRacers(query: string, directory: PosRacerRecord[] = MOCK_RACER_DIRECTORY): PosRacerRecord[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const qDigits = q.replace(/\D/g, '');
  return directory.filter(r =>
    r.racerId.toLowerCase().includes(q) ||
    r.displayName.toLowerCase().includes(q) ||
    r.clubCarIds.some(id => id.toLowerCase().includes(q)) ||
    (qDigits.length >= 3 && r.phone.replace(/\D/g, '').includes(qDigits))
  );
}

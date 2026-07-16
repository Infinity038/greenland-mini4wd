// Mock racer directory for the POS preview screen only — simulates what a
// QR/Racer ID scan would resolve to. Not wired to any live members table.
import type { RacerSnapshot } from './posSale';

export const MOCK_RACER_DIRECTORY: RacerSnapshot[] = [
  { racerId: 'G4W-R-0047', displayName: 'J. Racer', photoUrl: null, loyaltyPoints: 42, shopCreditDkk: 100 },
  { racerId: 'G4W-R-0012', displayName: 'A. Nielsen', photoUrl: null, loyaltyPoints: 8, shopCreditDkk: 0 },
];

// A real QR token never encodes the Racer ID in plain text (see lib/qrIdentity.ts) —
// this mock simply accepts either the Racer ID itself or a scanned QR token
// string ending in it, so the preview screen can be driven by either input.
export function lookupRacerByScan(code: string): RacerSnapshot | null {
  const trimmed = code.trim();
  return MOCK_RACER_DIRECTORY.find(r => trimmed === r.racerId || trimmed.endsWith(r.racerId)) ?? null;
}

import { describe, it, expect } from 'vitest';
import { lookupRacerByScan, searchRacers, MOCK_RACER_DIRECTORY, REVOKED_CARD_SCAN_CODE } from './posRacerDirectory';

describe('lookupRacerByScan', () => {
  it('resolves an Active racer to a found outcome', () => {
    const outcome = lookupRacerByScan('G4W-R-0047');
    expect(outcome).toEqual({ kind: 'found', racer: MOCK_RACER_DIRECTORY[0] });
  });

  it('returns invalid_qr for an unknown scan', () => {
    expect(lookupRacerByScan('G4W-R-9999')).toEqual({ kind: 'invalid_qr' });
  });

  it('returns invalid_qr for an empty scan', () => {
    expect(lookupRacerByScan('')).toEqual({ kind: 'invalid_qr' });
  });

  it('returns revoked_card for the revoked-card sentinel scan', () => {
    expect(lookupRacerByScan(REVOKED_CARD_SCAN_CODE)).toEqual({ kind: 'revoked_card' });
  });

  it('returns pending_account for a Pending Review racer', () => {
    const outcome = lookupRacerByScan('G4W-R-0099');
    expect(outcome.kind).toBe('pending_account');
  });

  it('returns suspended_account for a Suspended racer', () => {
    const outcome = lookupRacerByScan('G4W-R-0031');
    expect(outcome.kind).toBe('suspended_account');
  });

  it('returns archived_account for an Archived racer', () => {
    const outcome = lookupRacerByScan('G4W-R-0004');
    expect(outcome.kind).toBe('archived_account');
  });
});

describe('searchRacers', () => {
  it('finds a racer by Racer ID', () => {
    expect(searchRacers('G4W-R-0047').map(r => r.racerId)).toContain('G4W-R-0047');
  });

  it('finds a racer by display name', () => {
    expect(searchRacers('nielsen').map(r => r.racerId)).toContain('G4W-R-0012');
  });

  it('finds a racer by Club Car ID', () => {
    expect(searchRacers('G4W-BM-0012').map(r => r.racerId)).toContain('G4W-R-0012');
  });

  it('finds a racer by phone number', () => {
    expect(searchRacers('299 12 34 56').map(r => r.racerId)).toContain('G4W-R-0047');
  });

  it('returns no results for an empty query', () => {
    expect(searchRacers('')).toEqual([]);
  });
});

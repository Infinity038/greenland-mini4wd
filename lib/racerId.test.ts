import { describe, expect, it } from 'vitest';
import { formatRacerId, isValidRacerIdFormat, isRacerIdUnique, generateNextRacerId } from './racerId';

describe('formatRacerId / isValidRacerIdFormat', () => {
  it('matches the required format, e.g. sequence 47 -> G4W-R-0047', () => {
    expect(formatRacerId(47)).toBe('G4W-R-0047');
    expect(isValidRacerIdFormat('G4W-R-0047')).toBe(true);
  });

  it('rejects malformed IDs (no email, phone, or raw UUID accepted as a Racer ID)', () => {
    expect(isValidRacerIdFormat('racer@example.com')).toBe(false);
    expect(isValidRacerIdFormat('+299 123456')).toBe(false);
    expect(isValidRacerIdFormat('3f9a1c2e-6b7d-4e2a-9c1a-0b2d3e4f5a6b')).toBe(false);
    expect(isValidRacerIdFormat('G4W-R-47')).toBe(false); // must be zero-padded to at least 4 digits
  });
});

describe('generateNextRacerId', () => {
  it('is generated automatically starting at 0001 with no prior IDs', () => {
    expect(generateNextRacerId([])).toBe('G4W-R-0001');
  });

  it('continues the sequence from the highest issued ID', () => {
    expect(generateNextRacerId(['G4W-R-0001', 'G4W-R-0046'])).toBe('G4W-R-0047');
  });

  it('never generates a duplicate — the freshly generated ID is always unique against the input', () => {
    const issued = ['G4W-R-0001', 'G4W-R-0002', 'G4W-R-0003'];
    const next = generateNextRacerId(issued);
    expect(isRacerIdUnique(next, issued)).toBe(true);
  });

  it('never reuses an archived racer\'s ID — archived IDs must be included in the issued list to stay retired', () => {
    const issuedIncludingArchived = ['G4W-R-0001', 'G4W-R-0002' /* archived */, 'G4W-R-0003'];
    const next = generateNextRacerId(issuedIncludingArchived);
    expect(next).toBe('G4W-R-0004');
    expect(isRacerIdUnique(next, issuedIncludingArchived)).toBe(true);
  });
});

describe('isRacerIdUnique', () => {
  it('rejects a duplicate (case-insensitively)', () => {
    expect(isRacerIdUnique('G4W-R-0001', ['g4w-r-0001'])).toBe(false);
  });

  it('accepts an ID not already present', () => {
    expect(isRacerIdUnique('G4W-R-0005', ['G4W-R-0001'])).toBe(true);
  });
});

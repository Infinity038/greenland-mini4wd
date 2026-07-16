import { describe, it, expect } from 'vitest';
import { lookupRacerByScan, MOCK_RACER_DIRECTORY } from './posRacerDirectory';

describe('posRacerDirectory', () => {
  it('resolves a racer by exact Racer ID', () => {
    expect(lookupRacerByScan('G4W-R-0047')).toEqual(MOCK_RACER_DIRECTORY[0]);
  });

  it('returns null for an unknown scan', () => {
    expect(lookupRacerByScan('G4W-R-9999')).toBeNull();
  });
});

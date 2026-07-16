import { describe, expect, it } from 'vitest';
import { formatClubCarId, isClubCarIdUnique, generateNextClubCarId, requiresNewClubCarId, CATEGORY_CODES } from './clubCarId';

describe('formatClubCarId', () => {
  it('matches the worked examples: Box Stock #47 -> G4W-BS-0047, B-MAX #128 -> G4W-BM-0128', () => {
    expect(formatClubCarId('Box Stock', 47)).toBe('G4W-BS-0047');
    expect(formatClubCarId('B-MAX', 128)).toBe('G4W-BM-0128');
  });

  it('is category-aware — every category gets a distinct code', () => {
    const codes = Object.values(CATEGORY_CODES);
    expect(new Set(codes).size).toBe(codes.length);
    expect(formatClubCarId('Open Box Stock', 1)).toBe('G4W-OBS-0001');
    expect(formatClubCarId('Open Class', 1)).toBe('G4W-OPEN-0001');
  });
});

describe('isClubCarIdUnique', () => {
  it('is unique when not already present', () => {
    expect(isClubCarIdUnique('G4W-BS-0001', ['G4W-BS-0002', 'G4W-BM-0001'])).toBe(true);
  });

  it('is not unique (case-insensitively) when already present', () => {
    expect(isClubCarIdUnique('G4W-BS-0001', ['g4w-bs-0001'])).toBe(false);
  });
});

describe('generateNextClubCarId', () => {
  it('starts each category at 0001 independently', () => {
    expect(generateNextClubCarId('Box Stock', [])).toBe('G4W-BS-0001');
    expect(generateNextClubCarId('B-MAX', ['G4W-BS-0001', 'G4W-BS-0002'])).toBe('G4W-BM-0001');
  });

  it('continues the sequence for an already-populated category', () => {
    expect(generateNextClubCarId('Box Stock', ['G4W-BS-0001', 'G4W-BS-0047'])).toBe('G4W-BS-0048');
  });

  it('never collides with an existing ID in the same category', () => {
    const existing = ['G4W-BS-0001', 'G4W-BS-0002', 'G4W-BS-0003'];
    const next = generateNextClubCarId('Box Stock', existing);
    expect(isClubCarIdUnique(next, existing)).toBe(true);
  });
});

describe('requiresNewClubCarId', () => {
  it('requires a new ID when the chassis actually changes', () => {
    expect(requiresNewClubCarId('VZ', 'MA')).toBe(true);
  });

  it('does not require a new ID when the chassis is unchanged (case/whitespace-insensitive)', () => {
    expect(requiresNewClubCarId('VZ', ' vz ')).toBe(false);
  });
});

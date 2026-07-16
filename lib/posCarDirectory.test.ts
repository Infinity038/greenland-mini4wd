import { describe, it, expect } from 'vitest';
import { lookupCarByQrToken, searchCars, carsForRacer, MOCK_CAR_DIRECTORY } from './posCarDirectory';

describe('lookupCarByQrToken', () => {
  it('identifies the registered chassis for a valid Club Car QR token', () => {
    const car = lookupCarByQrToken('tok_car_0047');
    expect(car).toEqual(MOCK_CAR_DIRECTORY.find(c => c.clubCarId === 'G4W-BS-0047'));
  });

  it('returns null for an unknown token', () => {
    expect(lookupCarByQrToken('tok_unknown')).toBeNull();
  });

  it('a retired chassis and its replacement have distinct Club Car IDs and QR tokens', () => {
    const retired = lookupCarByQrToken('tok_car_0031_old');
    const replacement = lookupCarByQrToken('tok_car_0031');
    expect(retired?.clubCarId).not.toBe(replacement?.clubCarId);
    expect(retired?.registrationStatus).toBe('Retired');
    expect(replacement?.registrationStatus).toBe('Approved');
  });
});

describe('searchCars', () => {
  it('finds a car by Club Car ID', () => {
    expect(searchCars('G4W-BS-0047').map(c => c.clubCarId)).toContain('G4W-BS-0047');
  });

  it('finds a car by owner/racer name', () => {
    expect(searchCars('nielsen').map(c => c.clubCarId)).toContain('G4W-BM-0012');
  });

  it('finds a car by model', () => {
    expect(searchCars('Dragon Slash').map(c => c.clubCarId)).toContain('G4W-OBS-0099');
  });

  it('finds a car by chassis', () => {
    expect(searchCars('Super-X').map(c => c.clubCarId)).toContain('G4W-BM-0012');
  });
});

describe('carsForRacer', () => {
  it('lists only active (non-retired) cars for a racer', () => {
    const cars = carsForRacer('G4W-R-0031');
    expect(cars.map(c => c.clubCarId)).toEqual(['G4W-OPEN-0031']);
  });
});

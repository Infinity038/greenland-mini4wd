// Mock registered-car (Club Car) directory for the POS QR/search flow. A
// Club Car QR belongs to the chassis, not the racer — replacing the chassis
// requires a new Club Car ID and QR (see lib/clubCarId.ts for the ID format).
// Not wired to any live table.

export type CarRegistrationStatus = 'Approved' | 'Pending Review' | 'Rejected' | 'Retired';

export interface PosCarRecord {
  clubCarId: string;
  qrToken: string;
  racerId: string;
  ownerName: string;
  model: string;
  chassis: string;
  category: string;
  mainColor: string;
  registrationStatus: CarRegistrationStatus;
  photoUrl: string | null;
}

export const MOCK_CAR_DIRECTORY: PosCarRecord[] = [
  { clubCarId: 'G4W-BS-0047', qrToken: 'tok_car_0047', racerId: 'G4W-R-0047', ownerName: 'J. Racer',    model: 'Ray Spear',      chassis: 'MA',       category: 'Box Stock',      mainColor: 'Blue',   registrationStatus: 'Approved',      photoUrl: null },
  { clubCarId: 'G4W-BM-0012', qrToken: 'tok_car_0012', racerId: 'G4W-R-0012', ownerName: 'A. Nielsen',  model: 'Astral Star',    chassis: 'Super-X',  category: 'B-MAX',          mainColor: 'Red',    registrationStatus: 'Approved',      photoUrl: null },
  { clubCarId: 'G4W-BS-0031', qrToken: 'tok_car_0031_old', racerId: 'G4W-R-0031', ownerName: 'M. Lund', model: 'Thunder Shadow', chassis: 'FM-A',     category: 'Open Class',     mainColor: 'Black',  registrationStatus: 'Retired',       photoUrl: null },
  { clubCarId: 'G4W-OPEN-0031', qrToken: 'tok_car_0031', racerId: 'G4W-R-0031', ownerName: 'M. Lund',  model: 'Thunder Shadow V2', chassis: 'FM-A',   category: 'Open Class',     mainColor: 'Black',  registrationStatus: 'Approved',      photoUrl: null },
  { clubCarId: 'G4W-OBS-0099', qrToken: 'tok_car_0099', racerId: 'G4W-R-0099', ownerName: 'K. Petersen', model: 'Dragon Slash',  chassis: 'MS',       category: 'Open Box Stock', mainColor: 'Green',  registrationStatus: 'Pending Review', photoUrl: null },
];

export function lookupCarByQrToken(token: string, directory: PosCarRecord[] = MOCK_CAR_DIRECTORY): PosCarRecord | null {
  return directory.find(c => c.qrToken === token) ?? null;
}

// Searches Club Car ID, racer name, model, and chassis.
export function searchCars(query: string, directory: PosCarRecord[] = MOCK_CAR_DIRECTORY): PosCarRecord[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return directory.filter(c =>
    c.clubCarId.toLowerCase().includes(q) ||
    c.ownerName.toLowerCase().includes(q) ||
    c.model.toLowerCase().includes(q) ||
    c.chassis.toLowerCase().includes(q)
  );
}

export function carsForRacer(racerId: string, directory: PosCarRecord[] = MOCK_CAR_DIRECTORY): PosCarRecord[] {
  return directory.filter(c => c.racerId === racerId && c.registrationStatus !== 'Retired');
}

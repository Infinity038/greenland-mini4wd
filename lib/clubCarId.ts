// Club Car ID — persistent identifier for a registered chassis, e.g. G4W-BS-0047
// (Box Stock) or G4W-BM-0128 (B-MAX). Pure/presentational reference implementation
// only: no Supabase table exists for this yet. Actual storage (a `cars.club_car_id`
// column or dedicated table) is a proposed, unexecuted migration pending schema
// review — see docs/PROPOSED-admin-auth-plan.md conventions for how that will be
// delivered once the live schema is confirmed.
//
// The Club Car ID encodes no personal information — only a category code and a
// sequence number, never a racer's email/phone/name.

export type CarCategory = 'Box Stock' | 'Open Box Stock' | 'B-MAX' | 'Open Class';

export const CATEGORY_CODES: Record<CarCategory, string> = {
  'Box Stock': 'BS',
  'Open Box Stock': 'OBS',
  'B-MAX': 'BM',
  'Open Class': 'OPEN',
};

const CLUB_PREFIX = 'G4W';

export interface ClubCarRecord {
  clubCarId: string;
  racerId: string;
  model: string;
  chassis: string;
  mainColor: string;
  category: CarCategory;
  registeredAt: string;
  photoUrl?: string | null;
  status: 'active' | 'retired' | 'transferred';
}

// Formats a category-aware, zero-padded Club Car ID, e.g. ('Box Stock', 47) -> 'G4W-BS-0047'.
export function formatClubCarId(category: CarCategory, sequence: number): string {
  const code = CATEGORY_CODES[category];
  const padded = String(sequence).padStart(4, '0');
  return `${CLUB_PREFIX}-${code}-${padded}`;
}

// True only if `id` does not already appear (case-insensitively) among `existingIds`.
export function isClubCarIdUnique(id: string, existingIds: string[]): boolean {
  const normalized = id.trim().toUpperCase();
  return !existingIds.some(existing => existing.trim().toUpperCase() === normalized);
}

// Generates the next sequential, guaranteed-unique Club Car ID for a category,
// scanning only that category's existing IDs (sequences are independent per category
// — Box Stock and B-MAX both start from 0001).
export function generateNextClubCarId(category: CarCategory, existingIdsForCategory: string[]): string {
  const code = CATEGORY_CODES[category];
  const prefix = `${CLUB_PREFIX}-${code}-`;
  const usedSequences = existingIdsForCategory
    .filter(id => id.toUpperCase().startsWith(prefix))
    .map(id => parseInt(id.slice(prefix.length), 10))
    .filter(n => Number.isFinite(n));
  const nextSequence = usedSequences.length > 0 ? Math.max(...usedSequences) + 1 : 1;
  return formatClubCarId(category, nextSequence);
}

// The Club Car ID belongs to the registered chassis — replacing the chassis
// requires registering a new car and receiving a new Club Car ID. Normal legal
// parts/body changes within the same chassis do not require a new ID.
export function requiresNewClubCarId(registeredChassis: string, actualChassis: string): boolean {
  return registeredChassis.trim().toUpperCase() !== actualChassis.trim().toUpperCase();
}

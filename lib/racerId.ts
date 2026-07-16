// Permanent, public-facing Racer ID — e.g. G4W-R-0047. Separate from the internal
// Supabase UUID; never derived from email, phone, or the UUID itself. Pure
// reference implementation only: no Supabase table exists for this yet (see
// lib/clubCarId.ts for the equivalent, already-shipped car-identity pattern).

const RACER_ID_PREFIX = 'G4W-R-';
const RACER_ID_PATTERN = /^G4W-R-\d{4,}$/;

export function formatRacerId(sequence: number): string {
  return `${RACER_ID_PREFIX}${String(sequence).padStart(4, '0')}`;
}

export function isValidRacerIdFormat(id: string): boolean {
  return RACER_ID_PATTERN.test(id.trim());
}

export function isRacerIdUnique(id: string, existingIds: string[]): boolean {
  const normalized = id.trim().toUpperCase();
  return !existingIds.some(existing => existing.trim().toUpperCase() === normalized);
}

// Generates the next sequential, guaranteed-unique Racer ID. Never reused —
// callers should pass every ID that has ever been issued, including archived
// accounts, so a retired Racer ID is never handed out again.
export function generateNextRacerId(allIssuedIds: string[]): string {
  const usedSequences = allIssuedIds
    .filter(id => id.toUpperCase().startsWith(RACER_ID_PREFIX))
    .map(id => parseInt(id.slice(RACER_ID_PREFIX.length), 10))
    .filter(n => Number.isFinite(n));
  const nextSequence = usedSequences.length > 0 ? Math.max(...usedSequences) + 1 : 1;
  return formatRacerId(nextSequence);
}

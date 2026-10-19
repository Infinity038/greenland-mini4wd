/**
 * MCL sporting rules only. No money, user identity, wallet or club result writes.
 * These functions are deterministic so a future authoritative server can persist
 * a published draw and reproduce standings from confirmed physical finish orders.
 */
export const MCL_COLORS = [
  { key: 'R', name: 'Red', hex: '#ef4545' },
  { key: 'B', name: 'Blue', hex: '#3297f5' },
  { key: 'G', name: 'Green', hex: '#18b883' },
  { key: 'Y', name: 'Yellow', hex: '#efc84a' },
  { key: 'P', name: 'Purple', hex: '#af77ed' },
  { key: 'O', name: 'Orange', hex: '#f39440' },
] as const;
export const MCL_POINTS = [6, 5, 4, 3, 2, 1] as const;
export const MCL_PREVIEW_START_UTC = '2026-10-20T05:00:00.000Z'; // 13:00 PHT

export type Marble = { id: string; color: string; colorName: string; number: number; hex: string };
export type Race = { id: string; matchday: number; scheduledAt: string; lineup: string[]; lanes: Record<string, number> };
export type Result = { raceId: string; order: string[] };
export type Standing = { id: string; races: number; points: number; finishes: number[] };

export function createMarbles(perColor = 4): Marble[] {
  if (!Number.isInteger(perColor) || perColor < 2 || perColor > 12) throw new Error('Invalid roster size');
  return MCL_COLORS.flatMap(color => Array.from({ length: perColor }, (_, index) => ({
    id: `${color.key}${String(index + 1).padStart(2, '0')}`,
    color: color.key, colorName: color.name, hex: color.hex, number: index + 1,
  })));
}
function shuffle<T>(items: readonly T[], seed: number): T[] {
  const result = [...items];
  let value = seed >>> 0;
  for (let i = result.length - 1; i > 0; i--) {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    const j = value % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
/** A matchday consists of N heats of six: one of each color per heat. */
export function generateRegularSeason(marbles = createMarbles(), matchdays = 10, seed = 20261019, startUtc = MCL_PREVIEW_START_UTC): Race[] {
  if (marbles.length % 6 !== 0 || marbles.length < 12 || !Number.isInteger(matchdays) || matchdays < 1 || matchdays > 50) {
    throw new Error('A matchday requires six equally represented colors');
  }
  const perColor = marbles.length / 6;
  if (MCL_COLORS.some(color => marbles.filter(m => m.color === color.key).length !== perColor)) {
    throw new Error('Unequal color families');
  }
  const start = Date.parse(startUtc);
  if (!Number.isFinite(start)) throw new Error('Invalid schedule start');
  const races: Race[] = [];
  for (let day = 0; day < matchdays; day++) {
    const drawn = MCL_COLORS.map((color, colorIndex) =>
      shuffle(marbles.filter(m => m.color === color.key), seed + day * 137 + colorIndex * 977));
    for (let group = 0; group < perColor; group++) {
      const lineup = drawn.map(family => family[group].id);
      const lanes = Object.fromEntries(lineup.map((id, colorIndex) => [id, ((colorIndex + group + day) % 6) + 1]));
      races.push({
        id: `MD${String(day + 1).padStart(2, '0')}-R${String(group + 1).padStart(2, '0')}`,
        matchday: day + 1,
        scheduledAt: new Date(start + day * 86400000 + group * 15 * 60000).toISOString(),
        lineup, lanes,
      });
    }
  }
  return races;
}

export function validateResult(race: Race, order: readonly string[]): void {
  if (order.length !== 6 || new Set(order).size !== 6 ||
      order.some(id => !race.lineup.includes(id))) throw new Error('Finishing order must contain each racer exactly once');
}

export function calculateStandings(marbles: readonly Marble[], races: readonly Race[], results: readonly Result[]): Standing[] {
  const knownRaces = new Map(races.map(r => [r.id, r]));
  const knownMarbles = new Set(marbles.map(m => m.id));
  const standings = new Map(marbles.map(m => [m.id, { id: m.id, races: 0, points: 0, finishes: [0, 0, 0, 0, 0, 0] }]));
  const settled = new Set<string>();
  for (const result of results) {
    const race = knownRaces.get(result.raceId);
    if (!race || settled.has(result.raceId)) throw new Error('Unknown or duplicate race result');
    validateResult(race, result.order);
    settled.add(result.raceId);
    result.order.forEach((id, position) => {
      if (!knownMarbles.has(id)) throw new Error('Unknown marble');
      const row = standings.get(id)!;
      row.races += 1;
      row.points += MCL_POINTS[position];
      row.finishes[position] += 1;
    });
  }
  return [...standings.values()].sort((a, b) =>
    b.points - a.points ||
    a.finishes.reduce((comparison, count, index) => comparison || (b.finishes[index] - count), 0) ||
    a.id.localeCompare(b.id));
}
/** Identical scores and finish records at the 12/13 boundary require a host-approved tie breaker. */
export function playoffDraw(standings: readonly Standing[], requiredMatchdays = 10): { a: string[]; b: string[] } {
  if (standings.length < 12 || standings.some(s => s.races !== requiredMatchdays)) throw new Error('Regular season incomplete');
  const a = standings[11], b = standings[12];
  if (b && a.points === b.points && a.finishes.every((v, i) => v === b.finishes[i])) {
    throw new Error('Qualification tie requires a preannounced tie-break race');
  }
  const rank = (seed: number) => standings[seed - 1].id;
  return {
    a: [1, 4, 5, 8, 9, 12].map(rank),
    b: [2, 3, 6, 7, 10, 11].map(rank),
  };
}
export function finalists(a: readonly string[], b: readonly string[]): string[] {
  if (a.length !== 6 || b.length !== 6 || new Set([...a, ...b]).size !== 12) throw new Error('Invalid playoff result');
  return [...a.slice(0, 3), ...b.slice(0, 3)];
}

import { describe, expect, it } from 'vitest';
import { calculateStandings, createMarbles, finalists, generateRegularSeason, MCL_POINTS, playoffDraw, validateResult } from './league';

describe('MCL sporting core', () => {
  it('generates four six-marble races every day, all 24 participating once with one of each color', () => {
    const marbles = createMarbles();
    const schedule = generateRegularSeason(marbles);
    expect(schedule).toHaveLength(40);
    for (let day = 1; day <= 10; day++) {
      const races = schedule.filter(r => r.matchday === day);
      expect(races).toHaveLength(4);
      const ids = races.flatMap(r => r.lineup);
      expect(new Set(ids).size).toBe(24);
      expect(new Set(ids)).toEqual(new Set(marbles.map(m => m.id)));
      races.forEach(r => {
        expect(r.lineup).toHaveLength(6);
        expect(new Set(r.lineup.map(id => marbles.find(m => m.id === id)?.color)).size).toBe(6);
        expect(new Set(Object.values(r.lanes))).toEqual(new Set([1, 2, 3, 4, 5, 6]));
      });
    }
    expect(schedule[0].scheduledAt).toBe('2026-10-20T05:00:00.000Z');
    expect(generateRegularSeason(marbles)).toEqual(schedule);
  });
  it('rejects duplicate results and invalid finishing order', () => {
    const marbles = createMarbles();
    const race = generateRegularSeason(marbles, 1)[0];
    expect(() => validateResult(race, Array(6).fill(race.lineup[0]))).toThrow();
    const result = { raceId: race.id, order: race.lineup };
    expect(() => calculateStandings(marbles, [race], [result, result])).toThrow();
    expect(() => calculateStandings(marbles, [race], [{ ...result, order: ['UNKNOWN', ...race.lineup.slice(1)] }])).toThrow();
  });
  it('awards 6 to 1 points, then forms two balanced top-12 races and one six-marble final', () => {
    const marbles = createMarbles();
    const races = generateRegularSeason(marbles);
    const completed = races.map(r => ({raceId: r.id, order: [...r.lineup]}));
    const standings = calculateStandings(marbles, races, completed);
    expect(standings.reduce((sum, m) => sum + m.points, 0)).toBe(40 * MCL_POINTS.reduce((a, b) => a + b, 0));
    expect(standings.every(m => m.races === 10)).toBe(true);
    const boundary = standings[11], below = standings[12];
    if (boundary.points === below.points && boundary.finishes.every((v,i) => v === below.finishes[i])) {
      expect(() => playoffDraw(standings)).toThrow(/tie/);
    } else {
      const draw = playoffDraw(standings);
      expect(draw.a).toHaveLength(6); expect(draw.b).toHaveLength(6);
      expect(new Set([...draw.a,...draw.b]).size).toBe(12);
      expect(finalists(draw.a, draw.b)).toHaveLength(6);
    }
  });
  it('rejects an unequal family roster', () => {
    expect(() => generateRegularSeason(createMarbles().slice(0, 18))).toThrow();
  });
});

import { describe, it, expect } from 'vitest';
import { classifyInventoryAge } from './inventoryAge';

describe('inventoryAge — classification buckets (locked)', () => {
  it.each([
    [0, 'normal'],
    [89, 'normal'],
    [90, 'consider_promotion'],
    [179, 'consider_promotion'],
    [180, 'slow_moving'],
    [269, 'slow_moving'],
    [270, 'clearance_candidate'],
    [364, 'clearance_candidate'],
    [365, 'high_priority_clearance'],
    [1000, 'high_priority_clearance'],
  ] as const)('%d days -> %s', (days, expected) => {
    expect(classifyInventoryAge(days).bucket).toBe(expected);
  });

  it('rejects a negative age', () => {
    expect(() => classifyInventoryAge(-1)).toThrow();
  });
});

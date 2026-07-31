import { describe, expect, it } from 'vitest';
import {
  CLASS_MATRIX,
  GENERAL_RULES,
  GUIDE_TOPICS,
  MACHINE_LIMITS,
  MOTOR_MATRIX,
  RULE_CLASSES,
  RULEBOOK_VERSION,
  getGuideTopic,
  getRuleClass,
} from './rulesGuidesContent';

describe('Rules and Guides content', () => {
  it('publishes a versioned four-class rulebook', () => {
    expect(RULEBOOK_VERSION.version).toBeTruthy();
    expect(RULE_CLASSES.map((entry) => entry.slug)).toEqual([
      'box-stock',
      'open-box-stock',
      'b-max',
      'open-class',
    ]);
  });

  it('uses the official tire measurement range', () => {
    expect(MACHINE_LIMITS).toContainEqual(['Tire diameter', '22–35 mm']);
    expect(MACHINE_LIMITS).toContainEqual(['Tire width', '8–26 mm']);
  });

  it('does not describe Open Class as unrestricted', () => {
    const open = getRuleClass('open-class');
    expect(open).toBeDefined();
    expect(open?.summary.toLowerCase()).not.toContain('no restrictions');
    expect(open?.prohibited.length).toBeGreaterThan(0);
  });

  it('has detailed allowed, conditional, prohibited and inspection rules for every class', () => {
    for (const entry of RULE_CLASSES) {
      expect(entry.allowed.length).toBeGreaterThanOrEqual(5);
      expect(entry.conditional.length).toBeGreaterThanOrEqual(2);
      expect(entry.prohibited.length).toBeGreaterThanOrEqual(5);
      expect(entry.inspection.length).toBeGreaterThanOrEqual(5);
    }
  });

  it('publishes a complete guide library with unique routes', () => {
    const slugs = GUIDE_TOPICS.map((entry) => entry.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(slugs).toEqual(expect.arrayContaining([
      'start-here',
      'motors',
      'gearing',
      'chassis',
      'tires-wheels',
      'rollers-stabilizers',
      'brakes-dampers',
      'batteries-maintenance',
      'parts-compatibility',
    ]));
    expect(GUIDE_TOPICS.every((entry) => entry.sections.length >= 3)).toBe(true);
  });

  it('resolves class and guide routes safely', () => {
    expect(getRuleClass('b-max')?.name).toBe('B-Max');
    expect(getGuideTopic('motors')?.title).toBe('Motor Guide');
    expect(getRuleClass('missing')).toBeUndefined();
    expect(getGuideTopic('missing')).toBeUndefined();
  });

  it('includes general rules, class comparison and motor legality data', () => {
    expect(GENERAL_RULES.length).toBeGreaterThanOrEqual(8);
    expect(CLASS_MATRIX.length).toBeGreaterThanOrEqual(10);
    expect(MOTOR_MATRIX.some((row) => row[0].includes('Ultra-Dash'))).toBe(true);
    expect(MOTOR_MATRIX.some((row) => row[0].includes('Opened'))).toBe(true);
  });
});

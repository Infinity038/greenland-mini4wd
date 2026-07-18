// Static-source proof for this milestone's reconciliation of the Phase 1/2
// auth migration proposals — these files are still unapplied SQL (never
// executed by this or any test), so this only verifies the text itself
// matches the approved owner decisions.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

const DIR = join(process.cwd(), 'supabase', 'migrations-proposed');
const MIGRATIONS_DIR = join(process.cwd(), 'supabase', 'migrations');

function read(dir: string, name: string): string {
  return readFileSync(join(dir, name), 'utf-8');
}

describe('phase2_staff_roles_forward.sql — approved owner decisions', () => {
  const src = read(DIR, 'phase2_staff_roles_forward.sql');

  it('does not add a separate owner enum value', () => {
    const enumBlock = src.slice(src.indexOf('create type public.staff_role'), src.indexOf(');', src.indexOf('create type public.staff_role')));
    expect(enumBlock).not.toMatch(/'owner'/);
  });

  it('retains exactly the six reviewed granular roles', () => {
    for (const role of ['admin', 'registration_staff', 'checkin_staff', 'shop_staff', 'race_marshal', 'viewer']) {
      expect(src).toMatch(new RegExp(`'${role}'`));
    }
  });

  it('documents that refunds are admin-only', () => {
    expect(src).toMatch(/REFUNDS ARE ADMIN-ONLY/);
    expect(src).toMatch(/is_admin\(\)/);
  });

  it('documents "owner" as an operational designation, not a new enum value', () => {
    expect(src).toMatch(/OWNER DESIGNATION/);
    expect(src).toMatch(/operational designation/i);
  });

  it('keeps the bootstrap admin INSERT commented out with a placeholder UUID, never a real one', () => {
    const bootstrapLine = src.split('\n').find(line => line.includes('insert into public.staff_roles'));
    expect(bootstrapLine).toBeDefined();
    expect(bootstrapLine!.trim().startsWith('--')).toBe(true);
    expect(bootstrapLine).toMatch(/<real-auth-user-id>/);
    // No UUID literal (8-4-4-4-12 hex) anywhere in the file.
    expect(src).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  });
});

describe('every reviewed forward migration proposal has a matching rollback file', () => {
  const forwardFiles = [
    'phase1_auth_foundation_forward.sql',
    'phase2_staff_roles_forward.sql',
  ];

  for (const forward of forwardFiles) {
    it(`${forward} has a corresponding _rollback.sql`, () => {
      const rollback = forward.replace('_forward.sql', '_rollback.sql');
      expect(existsSync(join(DIR, rollback))).toBe(true);
    });
  }

  it('the already-applied-proposal bmax catalog/inventory migration also has a matching rollback', () => {
    expect(existsSync(join(MIGRATIONS_DIR, '20260715_bmax_catalog_and_inventory.sql'))).toBe(true);
    expect(existsSync(join(MIGRATIONS_DIR, '20260716_bmax_catalog_and_inventory_rollback.sql'))).toBe(true);
  });
});

describe('phase1/phase2 migrations remain unapplied proposals', () => {
  for (const name of [
    'phase1_auth_foundation_forward.sql',
    'phase1_auth_foundation_rollback.sql',
    'phase2_staff_roles_forward.sql',
    'phase2_staff_roles_rollback.sql',
  ]) {
    it(`${name} still opens with the "DO NOT RUN" proposal header`, () => {
      const src = read(DIR, name);
      expect(src.trimStart().startsWith('-- DO NOT RUN — REVIEWED PROPOSAL ONLY')).toBe(true);
    });
  }
});

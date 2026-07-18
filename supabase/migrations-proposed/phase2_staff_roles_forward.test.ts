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

describe('current_staff_roles() — RLS-compatible client read path (Phase B.1 fix)', () => {
  const src = read(DIR, 'phase2_staff_roles_forward.sql');
  // Isolate just the function definition (from its CREATE up to its closing
  // `$$;`) so assertions below can't accidentally match unrelated text
  // elsewhere in the file (e.g. has_staff_role's own `security definer`).
  const fnStart = src.indexOf('create or replace function public.current_staff_roles()');
  const fnEnd = src.indexOf('$$;', fnStart) + '$$;'.length;
  const fnBlock = src.slice(fnStart, fnEnd);
  // Grant/revoke statements sit just after the function body.
  const privilegeBlock = src.slice(fnEnd, src.indexOf('commit;', fnEnd));

  it('exists as a function named current_staff_roles', () => {
    expect(fnStart).toBeGreaterThan(-1);
  });

  it('accepts no user identifier — empty parameter list', () => {
    expect(fnBlock).toMatch(/create or replace function public\.current_staff_roles\(\)/);
  });

  it('filters using auth.uid(), never a passed-in argument', () => {
    expect(fnBlock).toMatch(/auth\.uid\(\)/);
    // No parameter name (e.g. p_user_id, user_id_param) appears anywhere in
    // the function signature or body that could accept a caller-supplied id.
    expect(fnBlock).not.toMatch(/\(\s*\w+\s+uuid\s*\)/);
  });

  it('is language sql and stable', () => {
    expect(fnBlock).toMatch(/language sql/);
    expect(fnBlock).toMatch(/\bstable\b/);
  });

  it('is SECURITY DEFINER', () => {
    expect(fnBlock).toMatch(/security definer/);
  });

  it('has a fixed search_path', () => {
    expect(fnBlock).toMatch(/set search_path = public/);
  });

  it('returns only a role column, shaped as public.staff_role', () => {
    expect(fnBlock).toMatch(/returns table \(role public\.staff_role\)/);
    // The query body selects only the role column off the staff_roles alias
    // — not granted_by/granted_at/id/user_id or `select *`.
    expect(fnBlock).toMatch(/select sr\.role/);
    expect(fnBlock).not.toMatch(/select \*/);
    expect(fnBlock).not.toMatch(/granted_by|granted_at/);
  });

  it('fully qualifies the table and type it references', () => {
    expect(fnBlock).toMatch(/public\.staff_roles/);
    expect(fnBlock).toMatch(/public\.staff_role\)/);
  });

  it('revokes EXECUTE from public', () => {
    expect(privilegeBlock).toMatch(/revoke execute on function public\.current_staff_roles\(\) from public;/);
  });

  it('revokes EXECUTE from anon', () => {
    expect(privilegeBlock).toMatch(/revoke execute on function public\.current_staff_roles\(\) from anon;/);
  });

  it('grants EXECUTE to authenticated', () => {
    expect(privilegeBlock).toMatch(/grant execute on function public\.current_staff_roles\(\) to authenticated;/);
  });

  it('the revoke-from-public/anon statements precede the grant-to-authenticated statement', () => {
    const revokePublicIdx = privilegeBlock.indexOf('revoke execute on function public.current_staff_roles() from public;');
    const revokeAnonIdx = privilegeBlock.indexOf('revoke execute on function public.current_staff_roles() from anon;');
    const grantIdx = privilegeBlock.indexOf('grant execute on function public.current_staff_roles() to authenticated;');
    expect(revokePublicIdx).toBeGreaterThan(-1);
    expect(revokeAnonIdx).toBeGreaterThan(-1);
    expect(grantIdx).toBeGreaterThan(revokePublicIdx);
    expect(grantIdx).toBeGreaterThan(revokeAnonIdx);
  });
});

describe('staff_roles RLS remains default-deny in Phase 2 — no self-read policy added', () => {
  const src = read(DIR, 'phase2_staff_roles_forward.sql');

  it('still enables RLS on staff_roles', () => {
    expect(src).toMatch(/alter table public\.staff_roles enable row level security;/);
  });

  it('adds no CREATE POLICY statement of any kind in this phase', () => {
    expect(src).not.toMatch(/create policy/i);
  });

  it('current_staff_roles() is the only new read path added for this table — no other new SELECT-shaped grant on staff_roles itself', () => {
    // The only "grant"/"revoke" statements in this file target the function,
    // never the staff_roles table directly.
    const grantOrRevokeLines = src.split('\n').filter(line => /^\s*(grant|revoke)\b/i.test(line));
    for (const line of grantOrRevokeLines) {
      expect(line).toMatch(/current_staff_roles/);
    }
  });
});

describe('phase2_staff_roles_rollback.sql — drops current_staff_roles() in correct dependency order', () => {
  const src = read(DIR, 'phase2_staff_roles_rollback.sql');

  it('drops current_staff_roles()', () => {
    expect(src).toMatch(/drop function if exists public\.current_staff_roles\(\);/);
  });

  it('drops current_staff_roles() before is_admin(), has_staff_role(), the staff_roles table, and the staff_role enum', () => {
    const idx = {
      currentStaffRoles: src.indexOf('drop function if exists public.current_staff_roles();'),
      isAdmin: src.indexOf('drop function if exists public.is_admin();'),
      hasStaffRole: src.indexOf('drop function if exists public.has_staff_role(public.staff_role[]);'),
      table: src.indexOf('drop table if exists public.staff_roles;'),
      enumType: src.indexOf('drop type if exists public.staff_role;'),
    };
    for (const [name, position] of Object.entries(idx)) {
      expect(position, `expected to find the drop statement for ${name}`).toBeGreaterThan(-1);
    }
    expect(idx.currentStaffRoles).toBeLessThan(idx.isAdmin);
    expect(idx.currentStaffRoles).toBeLessThan(idx.hasStaffRole);
    expect(idx.currentStaffRoles).toBeLessThan(idx.table);
    expect(idx.currentStaffRoles).toBeLessThan(idx.enumType);
    // The table must still come after both functions, and the enum after
    // the table — unchanged ordering requirements from before this fix.
    expect(idx.isAdmin).toBeLessThan(idx.table);
    expect(idx.hasStaffRole).toBeLessThan(idx.table);
    expect(idx.table).toBeLessThan(idx.enumType);
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

// Static-source proof for Phase B.2's correction of the Phase 1 auth
// migration proposal — these files are still unapplied SQL (never executed
// by this or any test); this only verifies the text itself matches the
// approved "Admin API only, never direct auth.users/auth.identities SQL"
// design.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const DIR = join(process.cwd(), 'supabase', 'migrations-proposed');

function read(name: string): string {
  return readFileSync(join(DIR, name), 'utf-8');
}

// Strips `--`-comment lines before running "must not contain destructive
// SQL" checks — this file's own doc comments legitimately *describe*, in
// prose, the raw SQL statements that must never actually execute (e.g.
// "there is deliberately no `delete from auth.users`"), which would
// otherwise false-positive a naive substring/regex match against the
// comment text itself rather than real SQL.
function stripSqlComments(src: string): string {
  return src
    .split('\n')
    .filter(line => !line.trim().startsWith('--'))
    .join('\n');
}

describe('phase1_auth_foundation_forward.sql — no direct auth.users/auth.identities writes', () => {
  const src = read('phase1_auth_foundation_forward.sql');
  const code = stripSqlComments(src);

  it('contains no INSERT into auth.users', () => {
    expect(code).not.toMatch(/insert\s+into\s+auth\.users/i);
  });
  it('contains no UPDATE of auth.users', () => {
    expect(code).not.toMatch(/update\s+auth\.users/i);
  });
  it('contains no INSERT into auth.identities', () => {
    expect(code).not.toMatch(/insert\s+into\s+auth\.identities/i);
  });
  it('contains no UPDATE of auth.identities', () => {
    expect(code).not.toMatch(/update\s+auth\.identities/i);
  });
  it('never references encrypted_password (the raw-SQL-only auth.users column) in real SQL', () => {
    expect(code).not.toMatch(/encrypted_password/i);
  });
  it('never references raw_user_meta_data/raw_app_meta_data (auth.users-only columns) in real SQL', () => {
    expect(code).not.toMatch(/raw_user_meta_data|raw_app_meta_data/i);
  });

  it('documents that Auth users are created exclusively through the Admin API', () => {
    expect(src).toMatch(/Admin API/);
    expect(src).toMatch(/auth\.admin\.createUser/);
    expect(src).toMatch(/auth\.admin\.inviteUserByEmail/);
  });

  it('points to the separate importer script rather than performing the migration itself', () => {
    expect(src).toMatch(/scripts\/migrateMembersToSupabaseAuth\.mjs/);
  });
});

describe('phase1_auth_foundation_forward.sql — public-schema changes only', () => {
  const src = read('phase1_auth_foundation_forward.sql');
  const code = stripSqlComments(src);

  it('adds members.auth_user_id', () => {
    expect(code).toMatch(/alter table public\.members\s*\n\s*add column if not exists auth_user_id uuid references auth\.users\(id\)/);
  });

  it('adds the partial unique index on members.auth_user_id', () => {
    expect(code).toMatch(/create unique index if not exists members_auth_user_id_key/);
    expect(code).toMatch(/where auth_user_id is not null/);
  });

  it('does not write to any existing members row (no UPDATE of members)', () => {
    expect(code).not.toMatch(/update\s+public\.members/i);
  });
});

describe('current_member_id() — privileges match current_staff_roles()\'s reviewed pattern', () => {
  const src = read('phase1_auth_foundation_forward.sql');
  const fnStart = src.indexOf('create or replace function public.current_member_id()');
  const fnEnd = src.indexOf('$$;', fnStart) + '$$;'.length;
  const fnBlock = src.slice(fnStart, fnEnd);
  const privilegeBlock = src.slice(fnEnd, src.indexOf('commit;', fnEnd));

  it('exists, takes no argument, and is scoped to auth.uid()', () => {
    expect(fnStart).toBeGreaterThan(-1);
    expect(fnBlock).toMatch(/create or replace function public\.current_member_id\(\)/);
    expect(fnBlock).toMatch(/auth\.uid\(\)/);
  });

  it('is language sql, stable, and SECURITY DEFINER with a fixed search_path', () => {
    expect(fnBlock).toMatch(/language sql/);
    expect(fnBlock).toMatch(/\bstable\b/);
    expect(fnBlock).toMatch(/security definer/);
    expect(fnBlock).toMatch(/set search_path = public/);
  });

  it('fully qualifies the members table it references', () => {
    expect(fnBlock).toMatch(/public\.members/);
  });

  it('revokes EXECUTE from public and anon, grants only to authenticated', () => {
    expect(privilegeBlock).toMatch(/revoke execute on function public\.current_member_id\(\) from public;/);
    expect(privilegeBlock).toMatch(/revoke execute on function public\.current_member_id\(\) from anon;/);
    expect(privilegeBlock).toMatch(/grant execute on function public\.current_member_id\(\) to authenticated;/);
  });

  it('grants come after the revokes', () => {
    const revokePublicIdx = privilegeBlock.indexOf('revoke execute on function public.current_member_id() from public;');
    const revokeAnonIdx = privilegeBlock.indexOf('revoke execute on function public.current_member_id() from anon;');
    const grantIdx = privilegeBlock.indexOf('grant execute on function public.current_member_id() to authenticated;');
    expect(revokePublicIdx).toBeGreaterThan(-1);
    expect(revokeAnonIdx).toBeGreaterThan(-1);
    expect(grantIdx).toBeGreaterThan(revokePublicIdx);
    expect(grantIdx).toBeGreaterThan(revokeAnonIdx);
  });
});

describe('phase1_auth_foundation_rollback.sql — never deletes Auth users, correct drop order', () => {
  const src = read('phase1_auth_foundation_rollback.sql');
  const code = stripSqlComments(src);

  it('contains no DELETE of auth.users', () => {
    expect(code).not.toMatch(/delete\s+from\s+auth\.users/i);
  });
  it('contains no reference to auth.admin.deleteUser being called automatically by this SQL', () => {
    // The doc comment may *mention* auth.admin.deleteUser as the manual,
    // separate tool an operator could use — but this file must never call
    // it or any auth.* DML itself. Checked against real SQL only (comments
    // stripped) since the doc comments legitimately describe, in prose,
    // the exact statements that must never actually run.
    expect(code).not.toMatch(/delete\s+from\s+auth\./i);
  });

  it('explicitly documents that it does not delete Supabase Auth users', () => {
    expect(src).toMatch(/DOES NOT DELETE SUPABASE AUTH USERS/);
  });
  it('explicitly documents that importer-created Auth users require separate, deliberate handling', () => {
    expect(src).toMatch(/SEPARATE, DELIBERATE HANDLING/);
  });
  it('explicitly documents it must never automatically delete an existing Auth identity', () => {
    expect(src).toMatch(/MUST NEVER AUTOMATICALLY DELETE AN EXISTING AUTH IDENTITY/);
  });

  it('drops current_member_id(), then the unique index, then the column, in that order', () => {
    const idx = {
      fn: src.indexOf('drop function if exists public.current_member_id();'),
      index: src.indexOf('drop index if exists public.members_auth_user_id_key;'),
      column: src.indexOf('alter table public.members drop column if exists auth_user_id;'),
    };
    for (const [name, position] of Object.entries(idx)) {
      expect(position, `expected to find the drop statement for ${name}`).toBeGreaterThan(-1);
    }
    expect(idx.fn).toBeLessThan(idx.index);
    expect(idx.index).toBeLessThan(idx.column);
  });
});

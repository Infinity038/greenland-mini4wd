import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (...parts: string[]) => readFileSync(join(process.cwd(), ...parts), 'utf8');
const middleware = read('middleware.ts');
const loginPage = read('app', 'admin', 'login', 'page.tsx');
const setupPage = read('app', 'admin', 'setup', 'page.tsx');
const confirmationRoute = read('app', 'auth', 'confirm', 'route.ts');
const phase1 = read('supabase', 'migrations', '20260719_auth_phase1_foundation.sql');
const phase2 = read('supabase', 'migrations', '20260719_auth_phase2_staff_roles.sql');
const bootstrap = read('supabase', 'migrations', '20260719_auth_owner_bootstrap.sql');
const scanner = read('scripts', 'assert-no-legacy-admin-auth.mjs');

describe('admin route security', () => {
  it('protects the entire admin namespace in middleware', () => {
    expect(middleware).toContain("pathname.startsWith('/admin')");
    expect(middleware).toContain('supabase.auth.getUser()');
    expect(middleware).toContain("supabase.rpc('current_staff_roles')");
  });

  it('keeps only login and one-time setup public', () => {
    expect(middleware).toContain("new Set(['/admin/login', '/admin/setup'])");
    expect(middleware).toContain("pathname === '/admin/setup'");
    expect(middleware).toContain("pathname === '/admin/login'");
  });

  it('uses Supabase password authentication rather than the legacy shared password', () => {
    expect(loginPage).toContain('signInWithPassword');
    expect(loginPage).toContain('resolveStaffSession');
    expect(loginPage).not.toMatch(/mini4wd2026|adminSession|ADMIN_PASSWORD/);
  });

  it('uses a fixed owner identity for first-time setup', () => {
    expect(setupPage).toContain("const OWNER_EMAIL = 'alltfarmer@gmail.com'");
    expect(setupPage).toContain("client.rpc('bootstrap_owner_admin')");
    expect(setupPage).not.toContain('service_role');
  });

  it('verifies email confirmation through the server callback', () => {
    expect(confirmationRoute).toContain('verifyOtp');
    expect(confirmationRoute).toContain('resolveSafeNextPath');
    expect(confirmationRoute).not.toContain('service_role');
  });
});

describe('database Auth security', () => {
  it('adds a nullable unique member-to-auth link', () => {
    expect(phase1).toMatch(/add column if not exists auth_user_id uuid references auth\.users\(id\) on delete set null/);
    expect(phase1).toMatch(/create unique index if not exists members_auth_user_id_key/);
    expect(phase1).toMatch(/where auth_user_id is not null/);
  });

  it('enables and forces RLS on staff roles and revokes direct access', () => {
    expect(phase2).toContain('alter table public.staff_roles enable row level security');
    expect(phase2).toContain('alter table public.staff_roles force row level security');
    expect(phase2).toContain('revoke all on public.staff_roles from anon, authenticated');
  });

  it('exposes staff roles only through authenticated helper functions', () => {
    expect(phase2).toContain('security definer');
    expect(phase2).toContain('set search_path = public, pg_temp');
    expect(phase2).toContain('grant execute on function public.current_staff_roles() to authenticated');
    expect(phase2).toContain('revoke all on function public.current_staff_roles() from anon');
  });

  it('restricts owner bootstrap to the confirmed owner and first role only', () => {
    expect(bootstrap).toContain("current_user_email is distinct from 'alltfarmer@gmail.com'");
    expect(bootstrap).toContain('current_user_confirmed_at is null');
    expect(bootstrap).toContain('existing_staff_count <> 0');
    expect(bootstrap).toContain("grant execute on function public.bootstrap_owner_admin() to authenticated");
    expect(bootstrap).toContain("revoke all on function public.bootstrap_owner_admin() from anon");
  });

  it('keeps a permanent build guard against legacy Auth returning', () => {
    expect(scanner).toContain('mini4wd2026');
    expect(scanner).toContain('adminSession');
    expect(scanner).toContain('ADMIN_PASSWORD');
    expect(scanner).toContain('Legacy admin password and local-session authentication: 0 occurrences.');
  });
});

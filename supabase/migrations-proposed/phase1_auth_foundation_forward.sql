-- DO NOT RUN — REVIEWED PROPOSAL ONLY
--
-- PHASE 1 — SUPABASE AUTH FOUNDATION (public-schema changes only)
--
-- SCOPE CORRECTION (Phase B.2 — do not regress): this file previously
-- inserted migrated members directly into `auth.users`/`auth.identities`
-- via raw SQL `insert`/`update` statements. That is not an approved
-- execution path — creating or linking Supabase Auth identities must only
-- ever happen through the Supabase Auth Admin API (`auth.admin.createUser`,
-- `auth.admin.inviteUserByEmail`), which is the only interface that
-- correctly creates the paired `auth.identities` row, sets up the
-- password/identity provider state Supabase Auth itself expects, and keeps
-- that mechanism upgrade-safe against future Supabase schema changes this
-- repo does not control. This file now performs ONLY public-schema
-- changes:
--
--   - add public.members.auth_user_id (nullable FK to auth.users(id));
--   - add the partial unique index enforcing at most one member per
--     linked Auth user;
--   - define public.current_member_id() (SECURITY DEFINER, auth.uid()-scoped);
--   - grant/revoke that function's execute privilege correctly.
--
-- The actual member-to-Auth-user migration (Path A: existing bcrypt hash
-- via auth.admin.createUser({ password_hash }); Path B: no usable hash via
-- auth.admin.inviteUserByEmail()) is performed by the separate, server-only,
-- dry-run-by-default script `scripts/migrateMembersToSupabaseAuth.mjs` —
-- see that script and docs/MEMBER-AUTH-MIGRATION-PLAN.md for the full
-- procedure. That script is the only thing that ever writes
-- `members.auth_user_id`, using the real Auth user id the Admin API
-- returns — never a value this SQL file invents or assumes.
--
-- PREREQUISITES:
--   - Phase 0 read (no schema dependency, informational only).
--   - Read docs/MEMBER-AUTH-MIGRATION-PLAN.md and
--     docs/PRE-MIGRATION-BACKUP-AND-VALIDATION.md in full before running
--     this file or the importer script — both describe the required
--     branch-first, backup-first, one-member-pilot-first sequence.
--
-- CODE DEPENDENCIES (not applied in this pass):
--   - app/register/page.tsx: replace the bcryptjs hash/compare block with
--     supabase.auth.signUp() / signInWithPassword().
--   - lib/member.ts: isRegistered()/getMemberData()/saveMemberData()/logout()
--     replaced by supabase.auth.getSession() / onAuthStateChange(), dropping
--     the localStorage/cookie-based session entirely.
--   - Every `.select('*')` on `members` (lib/member.ts, lib/loyalty.ts,
--     app/orders/page.tsx, app/admin/members/page.tsx) needs an explicit
--     column list once `password_hash` stops being the live credential (it
--     becomes a legacy/inert column after the importer script runs — see
--     the rollback file's note on why this SQL never touches those rows).
--
-- DATA BACKFILL: none in this file — this file adds an empty, nullable
--   column only. Every actual member row is linked later, one write at a
--   time, by scripts/migrateMembersToSupabaseAuth.mjs (dry-run by default,
--   `--apply` required, `--confirm-bulk` required beyond a single
--   `--member-id` pilot row). This file does not, and must not, populate
--   `members.auth_user_id` for any row itself.
--
-- TESTING: docs/PRE-MIGRATION-BACKUP-AND-VALIDATION.md §1 (branch), §4
--   (per-phase gate) — apply this file on a branch, confirm
--   `current_member_id()` returns null for a session with no linked member,
--   THEN run the importer script in dry-run mode, THEN a single
--   `--member-id` pilot with `--apply`, THEN confirm that one member can
--   sign in with their existing password before considering the rest.
--
-- VERIFICATION QUERIES:
--   select column_name from information_schema.columns where table_name = 'members' and column_name = 'auth_user_id';
--   select public.current_member_id(); -- run as any authenticated session; expect null until the importer links that member
--
-- RISKS:
--   - This file alone grants no one Auth access to anything — it only adds
--     an empty column, an index, and a function that returns null until a
--     row is actually linked. All the real risk is in the importer script
--     (service-role Admin API calls), not here — see that script's own
--     safety controls.
--   - bcrypt truncates input over 72 bytes; this is pre-existing behavior
--     inherited from the original hash, not a new issue introduced here or
--     by the importer.
--
-- STOP CONDITIONS: none for this file specifically — purely additive, no
--   existing table touched, no row written. See
--   scripts/migrateMembersToSupabaseAuth.mjs for the importer's own stop
--   conditions (duplicate member emails, ambiguous existing-Auth-user
--   collisions, etc.).
--
-- ROLLBACK TRIGGERS: see phase1_auth_foundation_rollback.sql. Run this
-- before rolling back Phase 2/3 if any of those have shipped since — later
-- phases depend on auth_user_id and staff_roles, so they must be unwound
-- first.

begin;

-- ── Schema: link members to Supabase Auth ──────────────────────────────
alter table public.members
  add column if not exists auth_user_id uuid references auth.users(id) on delete set null;

create unique index if not exists members_auth_user_id_key
  on public.members (auth_user_id)
  where auth_user_id is not null;

-- Returns only the calling session's own linked member id — auth.uid()
-- only, never a passed-in argument, so no caller can resolve another
-- user's member id through this function. Returns null (not an error) when
-- the authenticated user has no linked members row yet, which is the
-- normal state for every member until the importer script actually links
-- them.
create or replace function public.current_member_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select m.id
  from public.members m
  where m.auth_user_id = auth.uid();
$$;

-- Postgres grants EXECUTE to PUBLIC by default on function creation —
-- explicitly close that, then open only to authenticated. Mirrors the same
-- explicit-revoke-then-grant style already used for
-- public.current_staff_roles() (phase2_staff_roles_forward.sql).
revoke execute on function public.current_member_id() from public;
revoke execute on function public.current_member_id() from anon;
grant execute on function public.current_member_id() to authenticated;

commit;

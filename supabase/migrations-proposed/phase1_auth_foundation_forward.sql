-- DO NOT RUN — REVIEWED PROPOSAL ONLY
--
-- PHASE 1 — SUPABASE AUTH FOUNDATION
--
-- PREREQUISITES:
--   - Phase 0 read (no schema dependency, informational only).
--   - Run docs/PRE-MIGRATION-BACKUP-AND-VALIDATION.md in full on a Supabase
--     branch first: apply this file to the branch, run the Path A/B import
--     against ONE test member row, confirm supabase.auth.signInWithPassword
--     succeeds with that member's real existing password, THEN proceed.
--   - Read docs/MEMBER-AUTH-MIGRATION-PLAN.md in full before running the
--     Path A/B blocks below — they are not auto-conditional; each has real
--     row-selection criteria you must re-review against the current data.
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
--     becomes a legacy/inert column after this phase — see rollback note).
--
-- DATA BACKFILL: Path A/B below, against the 7 live `members` rows. Expected
--   split (recompute at run time, do not assume): count of password_hash
--   values matching `^\$2[aby]\$` = Path A; remainder = Path B. Zero rows are
--   silently dropped — every members row gets EITHER an imported password
--   (Path A) OR an invite/reset path (Path B).
--
-- TESTING: docs/PRE-MIGRATION-BACKUP-AND-VALIDATION.md §1 (branch), §4
--   (per-phase gate). Additionally: confirm §4 duplicate-email query in
--   docs/MEMBER-AUTH-MIGRATION-PLAN.md returns zero rows before running the
--   bulk INSERT below.
--
-- VERIFICATION QUERIES: see docs/MEMBER-AUTH-MIGRATION-PLAN.md §8.
--
-- RISKS:
--   - Writing directly into auth.users is a privileged operation (requires
--     the service role / SQL editor, not the anon or authenticated role).
--     A mistake here can lock out real members from Auth-based login even
--     though their old localStorage-based "session" still nominally works
--     until app code is switched over — test on a branch first, always.
--   - bcrypt truncates input over 72 bytes; this is pre-existing behavior
--     inherited from the original hash, not a new issue introduced here.
--
-- STOP CONDITIONS:
--   - The duplicate-email check (docs/MEMBER-AUTH-MIGRATION-PLAN.md §4)
--     returns any row — resolve manually before running the bulk INSERT.
--   - The single test-account sign-in (prerequisite above) fails.
--
-- ROLLBACK TRIGGERS: any member reports they can no longer log in with
-- their existing password after this phase ships to Production, and the
-- cause traces to the import (not to a code bug in the new sign-in call).

begin;

-- ── Schema: link members to Supabase Auth ──────────────────────────────
alter table public.members
  add column if not exists auth_user_id uuid references auth.users(id) on delete set null;

create unique index if not exists members_auth_user_id_key
  on public.members (auth_user_id)
  where auth_user_id is not null;

create or replace function public.current_member_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.members where auth_user_id = auth.uid();
$$;

-- ── Path A: bulk-import members with a valid bcrypt hash ───────────────
-- REVIEW ROW SELECTION BEFORE RUNNING. Preserves each member's existing
-- password unchanged — no reset email needed for these rows.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_user_meta_data, raw_app_meta_data
)
select
  '00000000-0000-0000-0000-000000000000'::uuid,
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  lower(m.email),
  m.password_hash,
  now(),
  now(),
  now(),
  jsonb_build_object('migrated_from_members_id', m.id::text),
  jsonb_build_object('provider', 'email', 'providers', array['email'])
from public.members m
where m.auth_user_id is null
  and m.password_hash ~ '^\$2[aby]\$'
on conflict do nothing
returning id;

update public.members m
set auth_user_id = u.id
from auth.users u
where u.raw_user_meta_data ->> 'migrated_from_members_id' = m.id::text
  and m.auth_user_id is null;

-- ── Path B: members with no usable hash — account shell only ──────────
-- No password is set here. After this runs, use the Supabase Admin API
-- (auth.admin.inviteUserByEmail) — outside SQL — to actually send each of
-- these members a password-setup email. This block only creates the row
-- so there is something to invite.
insert into auth.users (
  instance_id, id, aud, role, email,
  email_confirmed_at, created_at, updated_at,
  raw_user_meta_data, raw_app_meta_data
)
select
  '00000000-0000-0000-0000-000000000000'::uuid,
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  lower(m.email),
  now(),
  now(),
  now(),
  jsonb_build_object('migrated_from_members_id', m.id::text, 'requires_password_reset', true),
  jsonb_build_object('provider', 'email', 'providers', array['email'])
from public.members m
where m.auth_user_id is null
  and (m.password_hash is null or m.password_hash !~ '^\$2[aby]\$')
  and m.member_status <> 'guest'  -- guests never had a password; leave unmigrated
on conflict do nothing
returning id;

update public.members m
set auth_user_id = u.id
from auth.users u
where u.raw_user_meta_data ->> 'migrated_from_members_id' = m.id::text
  and m.auth_user_id is null;

commit;

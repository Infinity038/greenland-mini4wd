-- DO NOT RUN — REVIEWED PROPOSAL ONLY
--
-- PHASE 2 — STAFF ROLES AND ROLE-CHECKING HELPERS
--
-- PREREQUISITES: Phase 1 applied (auth.users / members.auth_user_id exist —
--   staff are just auth.users rows with a staff_roles entry, same account
--   system as racers, per the architecture decision to use one Auth system
--   for both).
--
-- CODE DEPENDENCIES (not applied in this pass): none yet — this phase only
--   creates the table/functions. Phase 4 is where admin pages actually
--   start calling has_staff_role()/is_admin() server-side instead of the
--   hardcoded password.
--
-- DATA BACKFILL: none automatic. A bootstrap admin must be inserted manually,
--   once, by running the commented INSERT template at the bottom of this
--   file with a real auth.users.id — intentionally not something this
--   migration does on its own, since baking any specific person's identity
--   into a committed SQL file is inappropriate.
--
-- TESTING: docs/PRE-MIGRATION-BACKUP-AND-VALIDATION.md — verify has_staff_role()
--   and is_admin() both return false for a random authenticated user with no
--   staff_roles row, and true only after the bootstrap INSERT.
--
-- VERIFICATION QUERIES:
--   select * from public.staff_roles;  -- as service role only, post-bootstrap
--   select public.is_admin();          -- run as the bootstrap admin's session
--
-- RISKS: staff_roles has RLS enabled with NO policies in this phase — by
--   design (see below), so it is unreadable/unwritable by anon/authenticated
--   until Phase 3 adds the Group D admin-only policy. This is intentionally
--   the safe default-deny direction, not a gap.
--
-- STOP CONDITIONS: none — purely additive, no existing table touched.
--
-- ROLLBACK TRIGGERS: none expected; only relevant once Phase 3/4 depend on
-- these functions, at which point roll those back first.
--
-- OWNER DESIGNATION (reviewed decision — do not add an 'owner' enum value):
--   "Owner" is an operational designation, not a database role. The owner is
--   simply the first bootstrap 'admin' row inserted below. There is exactly
--   one enum value above 'admin' in the privilege sense — no separate
--   'owner' value exists or should be added. If a hard distinction between
--   the bootstrap admin and later admins is ever needed (e.g. "only the
--   owner may grant admin to someone else"), that is a future, separately
--   reviewed change — not assumed here.
--
-- PERMISSION MODEL NOTE — REFUNDS ARE ADMIN-ONLY (reviewed decision):
--   shop_staff may review payment proofs and approve ordinary payments
--   (once the payment-approval RPC milestone lands — still blocked on this
--   phase and Phase 3 RLS being live first, see phase9_inventory_after_payment).
--   shop_staff must NOT be able to execute a refund. Any future
--   refund_order_payment()-style RPC must gate on public.is_admin() alone,
--   never on has_staff_role(array['shop_staff','admin']) — refunds move
--   money and inventory back and are intentionally a narrower grant than
--   routine order approval. This note documents the requirement for the
--   RPC that will be written in that later, still-blocked milestone; no
--   refund function exists yet in this phase.

begin;

create type public.staff_role as enum (
  'admin',
  'registration_staff',
  'checkin_staff',
  'shop_staff',
  'race_marshal',
  'viewer'
);

create table public.staff_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.staff_role not null,
  granted_at timestamptz not null default now(),
  granted_by uuid references auth.users(id),
  unique (user_id, role)
);

-- RLS enabled now, policies deferred to Phase 3 (Group D) on purpose —
-- default-deny is the correct state for a table nobody should read/write
-- via the client yet.
alter table public.staff_roles enable row level security;

create or replace function public.has_staff_role(required_roles public.staff_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.staff_roles
    where user_id = auth.uid() and role = any(required_roles)
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_staff_role(array['admin']::public.staff_role[]);
$$;

commit;

-- ── Bootstrap admin (run manually, once, after confirming the intended
--    admin's real auth.users.id — NOT part of the transaction above) ──
-- insert into public.staff_roles (user_id, role) values ('<real-auth-user-id>', 'admin');

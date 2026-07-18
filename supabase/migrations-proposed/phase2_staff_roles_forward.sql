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
--   staff_roles row, and true only after the bootstrap INSERT. Also verify
--   current_staff_roles() (below) returns zero rows for that same random
--   user, and the correct role rows only for the bootstrap admin's own
--   session — never for another user's id, since it takes no argument at all.
--
-- VERIFICATION QUERIES:
--   select * from public.staff_roles;      -- as service role only, post-bootstrap
--   select public.is_admin();               -- run as the bootstrap admin's session
--   select * from public.current_staff_roles(); -- run as the bootstrap admin's session; expect one row, role = 'admin'
--
-- RISKS: staff_roles has RLS enabled with NO policies in this phase — by
--   design (see below), so it is unreadable/unwritable by anon/authenticated
--   until Phase 3 adds the Group D admin-only policy. This is intentionally
--   the safe default-deny direction, not a gap.
--
-- CLIENT/APP COMPATIBILITY (Phase B.1 fix — do not regress): a client-side
--   session resolver must never query `staff_roles` directly with
--   `.from('staff_roles').select('role').eq('user_id', ...)` — RLS on this
--   table is default-deny with no SELECT policy in this phase (and Phase 3
--   only ever adds an admin-only read policy, never a general authenticated
--   self-read policy, see docs/RLS-POLICY-MATRIX.md Group D), so that query
--   would be denied for every legitimate staff account, not just intruders.
--   `current_staff_roles()` below is the sanctioned read path: SECURITY
--   DEFINER lets it read the table despite RLS, while `auth.uid()`-only
--   filtering (no argument) makes it impossible for any caller to ask for
--   another user's roles. lib/supabaseAuth/resolveStaffSession.ts calls this
--   RPC, never the table directly — see that file for the client side of
--   this fix.
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

-- Sanctioned client-facing read path for "what are my own staff roles" —
-- see the CLIENT/APP COMPATIBILITY note above for why this exists instead
-- of a direct `.from('staff_roles')` query. Takes no argument at all: the
-- only identity it can ever resolve is auth.uid(), so no caller — no matter
-- what it sends — can request another user's roles. SECURITY DEFINER lets
-- it read past staff_roles' default-deny RLS without adding any SELECT
-- policy to the table itself; the function's own row-filter is the entire
-- access boundary, not RLS. When auth.uid() is null (no authenticated
-- session), the `= null` comparison is never true, so this naturally
-- returns zero rows with no special-cased null check needed. Returns only
-- `role` — never id/granted_at/granted_by or any other staff_roles column.
create or replace function public.current_staff_roles()
returns table (role public.staff_role)
language sql
stable
security definer
set search_path = public
as $$
  select sr.role
  from public.staff_roles sr
  where sr.user_id = auth.uid();
$$;

-- Postgres grants EXECUTE to PUBLIC by default on function creation —
-- explicitly close that, then open only to authenticated. Mirrors the
-- explicit-revoke-then-grant style already used for table privileges
-- elsewhere in this migration set (e.g. phase4_remove_hardcoded_admin_forward.sql).
revoke execute on function public.current_staff_roles() from public;
revoke execute on function public.current_staff_roles() from anon;
grant execute on function public.current_staff_roles() to authenticated;

commit;

-- ── Bootstrap admin (run manually, once, after confirming the intended
--    admin's real auth.users.id — NOT part of the transaction above) ──
-- insert into public.staff_roles (user_id, role) values ('<real-auth-user-id>', 'admin');

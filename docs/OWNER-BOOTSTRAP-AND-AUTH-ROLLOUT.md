# Owner Bootstrap & Supabase Auth Rollout — Operational Procedure

Status: procedure only, nothing here has been executed. No Auth user has
been created, no migration has been applied, no staff has been invited. This
document describes the manual steps a project owner performs later, once
`phase1_auth_foundation_forward.sql` and `phase2_staff_roles_forward.sql`
(`supabase/migrations-proposed/`) are reviewed and applied on a Supabase
branch, then Production.

Contains no real email address, password, or UUID — every placeholder below
is literal placeholder text to be filled in at execution time, never
committed.

## What this milestone actually shipped (code/scaffolding only)

- `lib/supabaseAuth/browserClient.ts` / `serverClient.ts` / `middlewareClient.ts`
  — shared Supabase Auth client infrastructure (SSR-compatible), not wired
  into `middleware.ts` yet.
- `lib/supabaseAuth/roles.ts` / `resolveStaffSession.ts` — role/session
  helpers, fail-closed by design.
- `app/admin/login/SupabaseAuthLoginScreen.tsx`, feature-flagged behind
  `NEXT_PUBLIC_SUPABASE_AUTH_ENABLED` (`lib/featureFlags.ts`) — defaults to
  **off** everywhere. While off, `app/admin/login/page.tsx`'s existing
  hardcoded-password screen is unchanged.
- `phase1_auth_foundation_forward.sql` / `phase2_staff_roles_forward.sql` —
  reviewed, still unapplied, with clarifying comments added (owner
  designation, refund-is-admin-only) but no structural change.
- **Phase B.1 fix — `staff_roles` stays directly unreadable, even from the
  client's own authenticated session.** `phase2_staff_roles_forward.sql`
  enables RLS on `staff_roles` with no policies at all in Phase 2, and Phase
  3 (`phase3_rls_policies_forward.sql`) only ever adds an **admin-only**
  read policy to it — never a general "authenticated users may read their
  own row" policy (see `docs/RLS-POLICY-MATRIX.md`, Group D). A client-side
  `.from('staff_roles').select('role').eq('user_id', ...)` query would
  therefore be denied for every legitimate staff account once Phase 2 is
  applied, not just for intruders. Staff identity resolution instead calls
  the `current_staff_roles()` RPC (added to `phase2_staff_roles_forward.sql`
  in this fix): `SECURITY DEFINER`, no arguments, filters only by
  `auth.uid()` server-side, returns just the `role` column. No caller can
  ever request another user's roles through it, and no new SELECT policy
  was added to `staff_roles` itself — the function is the entire read
  boundary. `lib/supabaseAuth/resolveStaffSession.ts` calls this RPC, never
  the table directly.
- **Phase B.2 fix — member Auth accounts are created only through the
  Supabase Auth Admin API, never by inserting/updating
  `auth.users`/`auth.identities` with raw SQL.** An earlier draft of
  `phase1_auth_foundation_forward.sql` migrated existing members by
  `insert`ing directly into `auth.users` (and, implicitly, relying on
  Supabase to backfill `auth.identities`) inside the migration transaction
  itself. That is not an approved execution path — it bypasses the Admin
  API's own identity-provider bookkeeping and is not something this repo
  should be doing with raw SQL against a schema Supabase owns and evolves.
  `phase1_auth_foundation_forward.sql` now performs **only** public-schema
  changes (`members.auth_user_id`, its partial unique index,
  `current_member_id()`) and creates zero Auth users itself. The actual
  member-to-Auth-user linking is performed by the separate, server-only,
  dry-run-by-default script `scripts/migrateMembersToSupabaseAuth.mjs`,
  which calls `auth.admin.createUser({ password_hash })` for members with a
  usable existing bcrypt hash, or `auth.admin.inviteUserByEmail()` for
  members without one — see `docs/MEMBER-AUTH-MIGRATION-PLAN.md` (updated)
  and `docs/PRE-MIGRATION-BACKUP-AND-VALIDATION.md` §7 for the full,
  required execution sequence. This script has not been run — dry-run or
  otherwise — against anything.
- **Phase B.2.1 fix — the importer's safety controls were hardened further:**
  an unscoped `--apply` is now refused unconditionally (never inferred from
  how many rows are writable); `--member-id` is validated as a real,
  existing UUID rather than silently degrading to an unscoped run;
  duplicate-email detection always runs against the full members dataset
  before `--member-id` scoping; an Auth-lookup failure now fails the entire
  run closed instead of risking being read as "no existing user"; and
  sending a real invitation email now requires a separate, explicit
  `--send-invitations` flag in addition to `--apply` (`--confirm-bulk` alone
  no longer authorizes contacting anyone). See
  `docs/MEMBER-AUTH-MIGRATION-PLAN.md`'s "Safety hardening (Phase B.2.1)"
  note and §3a for the approved command shapes — still none of them
  approved for actual execution.

None of this alone grants anyone admin access, changes Production behavior,
or touches live data. The steps below are what turns this scaffolding into a
working system — all still pending, all requiring explicit, separate
approval before execution.

## Procedure

### 1. Create or invite the owner through Supabase Auth

Once Phase 1 (the public-schema-only migration) is applied on a branch and
verified, create the real owner's account via Supabase Auth — either a
normal sign-up, or `auth.admin.inviteUserByEmail(...)` run from the Supabase
dashboard/Admin API (not from app code, and not as part of any committed
script). Exactly like the bulk member importer
(`scripts/migrateMembersToSupabaseAuth.mjs`), this is Admin-API-only — never
a raw SQL `insert into auth.users`. The owner is a **one-off, manual**
Admin API action, distinct from the bulk importer script: the owner is not
necessarily an existing `members` row with a bcrypt hash to import, so
running the bulk script is neither required nor the right tool for this
step. This is the "owner" purely as an operational designation — there is
no separate `owner` database role; the owner is simply the first
`admin`-role row in `staff_roles` (see `phase2_staff_roles_forward.sql`'s
OWNER DESIGNATION note).

### 2. Obtain the real `auth.users` UUID

After the account exists, read its `id` from the Supabase dashboard
(Authentication → Users) or via a read-only `select id from auth.users
where email = '<real email, not committed>'`. Record it somewhere outside
version control (password manager, secure note) — never in a commit, PR
description, or code comment.

### 3. Run the reviewed bootstrap `staff_roles` INSERT manually

Run the commented template already at the bottom of
`phase2_staff_roles_forward.sql`, filling in the real UUID from step 2, as a
one-off statement outside the migration's own transaction — exactly as that
file's header already specifies:

```sql
insert into public.staff_roles (user_id, role) values ('<real-auth-user-id>', 'admin');
```

Never commit this filled-in statement to the repository.

### 4. Verify `is_admin()` for that authenticated session

Sign in as the owner (e.g. via the Supabase client in a scratch/branch
context, or the SQL editor's "run as user" support if available) and
confirm `select public.is_admin();` returns `true`. If it returns `false`
or errors, stop — do not proceed to step 5 until this is resolved.

### 5. Enable the Auth feature flag in Preview first

`NEXT_PUBLIC_SUPABASE_AUTH_ENABLED` must remain **disabled** — in every
environment, including Preview — until all five of the following are true:

1. Phase 1 (`phase1_auth_foundation_forward.sql` — public-schema changes
   only: `members.auth_user_id`, its partial unique index,
   `current_member_id()`) is applied. This step alone creates zero Auth
   users.
2. Phase 2 (`phase2_staff_roles_forward.sql`), **including
   `current_staff_roles()`**, is applied — not just the table/enum/
   `has_staff_role()`/`is_admin()` from an earlier pass of this phase; the
   RPC is what makes staff-role resolution actually work once RLS is on
   (see the Phase B.1 fix above). `resolveStaffSession.ts` fails closed
   (`authenticated_no_staff_role`) if this RPC doesn't exist yet, so
   enabling the flag before this step doesn't break anything unsafely — it
   just means nobody, including the real owner, can reach the dashboard.
3. The owner's Auth user exists (step 1 above).
4. The owner's `admin` row is bootstrapped in `staff_roles` (step 3 above).
5. Both `current_staff_roles()` and `is_admin()` are verified using the
   owner's own authenticated session (step 4 above, extended to also check
   `select * from public.current_staff_roles();` returns the expected
   `admin` row) — not merely confirmed to exist in the schema.

Only once all five hold does setting
`NEXT_PUBLIC_SUPABASE_AUTH_ENABLED=true` on the **Preview** Vercel
environment actually let the owner reach the dashboard. Production stays
unset/`false` until every later step below is complete and separately
approved. This is the only environment variable this rollout ever needs the
owner to set by hand — no code change is required to flip it.

### 6. Confirm admin login and logout

On the Preview deployment, visit `/admin/login`, sign in with the owner's
real credentials, and confirm:

- a valid staff (admin) session redirects straight to `/admin` (via
  `router.replace`, per `SupabaseAuthLoginScreen.tsx`) and the dashboard
  header lists `admin` among the resolved roles;
- **Sign Out** (from the dashboard) clears the session and returns to the
  login form;
- a second, non-staff Supabase Auth account (any ordinary racer account,
  once Phase 1's member migration is live) is **denied** — sees
  `AccessDeniedScreen`, never the dashboard — see
  `resolveStaffSession.ts`'s fail-closed handling of
  `authenticated_no_staff_role`, and that this codebase's own tests
  (`app/admin/login/SupabaseAuthLoginScreen.test.tsx`, `app/admin/page.test.tsx`,
  `lib/supabaseAuth/roles.test.ts`) already assert this without needing a
  live account to check it manually first.

### 7. Only later replace every hardcoded-password gate — and only in the corrected order below

**Sequencing correction, binding for every future phase:** the hardcoded
`mini4wd2026` password (16 files, see the prior Auth/RLS foundation planning
report) must be fully removed **before**, not after, any of the following
privileged features are built:

- the catalog importer's write path;
- the payment-approval RPC;
- the refund RPC;
- the inventory-deduction RPC.

Concretely, once this milestone's scaffolding is proven in Preview (steps
1-6 above) and RLS (`phase3_rls_policies_forward.sql`) is live, the next
phases run in this order:

1. Apply Phase 3 RLS (group by group, on a branch first, per
   `docs/PHASED-SUPABASE-MIGRATION-PLAN.md`).
2. Wire all 16 admin pages to the real session/role helpers already added in
   this milestone (`lib/supabaseAuth/`), replacing every
   `password === 'mini4wd2026'` check and every `localStorage.adminSession`
   read.
3. Remove `middleware.ts`'s blanket `/admin` exemption, replacing it with a
   real server-side session check.
4. Delete the `mini4wd2026` literal and the feature flag itself (Auth becomes
   the only path, not an opt-in).
5. **Only after step 4 is live** does work begin on the catalog importer's
   write path, the payment-approval RPC, the refund RPC, or the
   inventory-deduction RPC — each of those is a privileged, money- or
   stock-affecting action, and none of them should ever be reachable behind
   the old password gate, even transiently.

This reorders an earlier draft sequencing (which had password removal as
the last step, after those four features) — the corrected order above is
authoritative.

### 8. Emergency owner recovery

If the owner's account becomes inaccessible (lost credentials, compromised
account) and no second admin exists to grant a replacement:

1. Access the Supabase project dashboard directly (this requires whatever
   access already protects the Supabase project itself — organization
   membership, not anything this app controls).
2. Create or identify a replacement Auth account **through the dashboard or
   the Admin API** (`auth.admin.createUser`/a dashboard invite) — never a
   raw SQL `insert into auth.users`, consistent with the Phase B.2
   correction above.
3. Run the same bootstrap `staff_roles` `INSERT` pattern from step 3 above
   (a plain `public.staff_roles` row — an ordinary public-schema table, not
   `auth.*`) for the replacement UUID.
4. Optionally revoke the old `staff_roles` row for the compromised account
   (`delete from public.staff_roles where user_id = '<old-uuid>'`).

This recovery path is deliberately **outside** the application — there is
no in-app "recover owner access" feature, since building one would itself
be a privilege-escalation risk. This is the same reasoning already
documented for staff role assignment generally (admin-only, never
self-service) in the Auth/RLS foundation planning report.

## Explicitly not done by this document or this milestone

No Auth user was created. No migration was applied. No staff was invited.
No RLS policy was activated. No environment variable was changed on any
real Vercel environment. This document only records the steps for later,
separately-approved execution.

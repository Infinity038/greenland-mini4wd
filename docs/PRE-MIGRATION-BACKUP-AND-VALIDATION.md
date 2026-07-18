# Pre-Migration Backup & Validation Procedure

Applies to every phase in `docs/PHASED-SUPABASE-MIGRATION-PLAN.md`. No phase
should be applied to the live project without completing this checklist
first, in order.

## 1. Use a Supabase database branch, not the live project, for first-pass testing

This project supports Supabase branching (`create_branch` / `list_branches`).
Every phase's forward SQL should be applied to a **branch** first:

1. `create_branch` off the live `eojdjqihmxxaqltudqjx` project.
2. Apply that phase's forward SQL to the branch only.
3. Run the phase's verification queries and the relevant app code paths
   against the branch's connection string (temporarily, in a local `.env`,
   never committed).
4. Only after the branch confirms clean does the same SQL get applied to the
   live project, and only with explicit sign-off (per the standing rule: no
   migration executes without your approval).
5. `delete_branch` once confirmed — branches are not a substitute for the
   live backup in step 2 below, just a safe rehearsal space.

## 2. Point-in-time / logical backup before touching the live project

Even with branch testing, take an explicit backup immediately before
applying anything to the live project:

- Confirm Supabase's automatic backup/PITR window for this project's plan
  tier (Dashboard → Database → Backups) covers "right now" — note the
  timestamp of the most recent automatic backup.
- Additionally, run a logical export of the tables the phase touches (via
  `pg_dump --table=... --data-only`, or the Dashboard's "Export" for each
  affected table) and store it outside the repo (never commit a data dump —
  it would contain real member PII).

## 3. Snapshot queries — run and save the output before every phase

```sql
-- Row counts, before/after comparison. Counts only, no row data.
select 'members' t, count(*) from members
union all select 'orders', count(*) from orders
union all select 'products', count(*) from products
union all select 'cars', count(*) from cars
union all select 'race_tickets', count(*) from race_tickets
union all select 'race_entries', count(*) from race_entries
union all select 'points_transactions', count(*) from points_transactions
union all select 'loyalty_points', count(*) from loyalty_points
union all select 'tournaments', count(*) from tournaments
union all select 'seasons', count(*) from seasons;

-- RLS state, before/after comparison.
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;

-- Policy inventory, before/after comparison.
select schemaname, tablename, policyname, cmd, roles
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
```

Every phase's rollback script assumes these counts are unchanged for tables
it didn't intend to modify — a mismatch here is a **stop condition**, not
something to investigate after the fact.

## 4. Per-phase validation gate (apply this before moving to the next phase)

1. Row counts from §3 match expectations (unchanged, or changed only in the
   way the phase's own doc says they should).
2. `SELECT * FROM pg_policies WHERE schemaname='public'` shows exactly the
   policies that phase's SQL added — nothing missing, nothing extra left
   over from a partial prior run.
3. The specific app pages that read/write the affected tables are smoke
   tested against the **branch** (§1) — for RLS-introducing phases in
   particular, a page that used to work under "no RLS at all" can start
   silently returning empty results under "RLS enabled, policy missing or
   too narrow" instead of erroring, so a passing HTTP 200 is not sufficient;
   check that real data is present in the response.
4. Rollback SQL for the phase has itself been dry-run on the **branch**
   (apply forward → apply rollback → confirm state matches the pre-phase
   snapshot) before the forward SQL ever touches the live project.

## 5. Reconciliation report format (per phase)

Every phase that touches `members`, `orders`, or any ledger-adjacent table
produces a short report using **counts and status labels only** — consistent
with the standing rule never to display or export password hashes or
unnecessary PII:

| check | expected | actual | pass/fail |
|---|---|---|---|
| row count unchanged (tables not targeted by this phase) | matches §3 snapshot | | |
| new rows created (tables targeted by this phase) | matches phase's stated backfill count | | |
| orphan check (new FK columns all resolve to a real row) | 0 orphans | | |
| RLS state matches `docs/RLS-POLICY-MATRIX.md` for tables touched this phase | yes | | |

## 6. Stop conditions (apply to every phase, in addition to phase-specific ones)

- Any snapshot query in §3 returns a materially different result than
  expected for a table the phase was not supposed to touch.
- The branch smoke test (§4.3) shows a previously-working page now silently
  returning empty/missing data.
- The rollback dry-run (§4.4) does not restore the branch to its pre-phase
  state exactly.
- Anything in this procedure requires reading real customer PII (email,
  phone, hash values, order contents) beyond aggregate counts — stop and
  ask, rather than broadening the read to "just check."

If any stop condition is hit, do not proceed to the next phase and do not
apply the current phase's forward SQL to the live project — report back with
the specific check that failed.

## 7. Phase 1 / member-Auth-import specific sequence (required execution order)

Phase 1 is two separate mechanisms that must run in this exact order — the
schema-only SQL migration, then the separate Admin-API-based importer script
(`scripts/migrateMembersToSupabaseAuth.mjs`) — never the other way around,
and never skipping the single-member pilot in the middle:

1. Create a Supabase database branch or an otherwise fully isolated test
   environment (§1) — never the live project for any step below except the
   final, separately-approved one.
2. Back up current member data (§2) — both the automatic-backup timestamp
   check and an explicit logical export.
3. Apply the public-schema-only Phase 1 migration
   (`phase1_auth_foundation_forward.sql` — `members.auth_user_id`, its
   partial unique index, `current_member_id()`) to the branch. This step
   creates zero Auth users; it only adds an empty column and a function that
   returns null until something links a row.
4. Dry-run the importer (`node scripts/migrateMembersToSupabaseAuth.mjs`,
   no `--apply`) against the branch. Read the report (§9 of
   `docs/MEMBER-AUTH-MIGRATION-PLAN.md`) — confirm the expected
   `existing_bcrypt`/`invitation_required`/`guest_skipped` split before
   anything is written.
5. Migrate exactly one selected test member
   (`node scripts/migrateMembersToSupabaseAuth.mjs --member-id=<id> --apply`)
   — a single-member run does not require `--confirm-bulk`.
6. Verify that member can sign in with their existing password
   (`supabase.auth.signInWithPassword({ email, password })`, using their
   real, already-known password — never a newly-invented one) against the
   branch.
7. Verify `auth.users` and `auth.identities` rows were created **by
   Supabase Auth itself** (i.e., exist and look normal via the dashboard or
   a read-only `select`) — not by inspecting any SQL this repo ran, since
   none touches those tables directly.
8. Verify `members.auth_user_id` linkage for that one row matches the Auth
   user id from step 7.
9. Only after steps 4-8 all pass does the remaining member set get
   considered — re-run the importer with `--apply --confirm-bulk` (still on
   the branch first, per §1, before ever touching the live project).
10. Apply Phase 2 (`phase2_staff_roles_forward.sql`, including
    `current_staff_roles()`) only after Phase 1 is fully verified per steps
    1-9 — Phase 2's staff-role resolution assumes `members.auth_user_id` /
    Supabase Auth sessions already work correctly.
11. Create and bootstrap the owner separately (see
    `docs/OWNER-BOOTSTRAP-AND-AUTH-ROLLOUT.md`) — not folded into the bulk
    member migration; the owner is a staff account, not a migrated member
    row, even though both ultimately end up as `auth.users` rows.
12. Keep `NEXT_PUBLIC_SUPABASE_AUTH_ENABLED` disabled — in every
    environment, including Preview — until every check above passes, on the
    branch, and the same phases are then separately re-applied and
    re-verified against the live project before the flag is ever considered.

This sequence is authoritative for Phase 1; it supersedes any earlier,
less-specific ordering implied elsewhere in this document.

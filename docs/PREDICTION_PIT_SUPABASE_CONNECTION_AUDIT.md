# Prediction Pit — Supabase Connection Audit (2026-10-16)

Read-only. No secrets, no DB writes, no migrations, PR #14 not merged. Non-sensitive metadata only.

## 1. Verified project identity
| Item | Result |
|---|---|
| Vercel team | `infinity038-s-projects` (`team_CNIqPgR0dVSnk8qQOAmPale5`) |
| Vercel project | `greenland-mini4wd` (`prj_G3wNanoLQcuHyvXk8MitSVu7Yh2b`), Next.js, Node 24.x |
| Latest prod deployment | `dpl_pDMc2YRw7tM8aDfSa7yo3bYZveaH`, READY, target production |
| Prod env vars present | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (production+preview); preview-branch-only `NEXT_PUBLIC_SUPABASE_AUTH_ENABLED` |
| Env var type | **sensitive** — values are write-only via API, so the Supabase project ref **cannot be read** from Vercel |
| Supabase ref / region of Greenland | **NOT VERIFIED** |
| Supabase projects visible to the connected account (org `hjywefzdubyscsqtspoc`, "Infinity038's Org") | `straks-timelog` (`dyjccfczzyclrhhehzst`, eu-central-1), `property-app` (`iahpyluxfoilbvsrtpwa`, eu-west-1), `straks-saas` (`xzdipnbenqnqeohhkjcz`, eu-central-1) |

None of the three visible projects is Greenland Mini4WD by name; none was queried. The repo hard-codes no project URL/ref (all clients read `process.env.NEXT_PUBLIC_SUPABASE_*`). The production HTML fetched from `greenland-mini4wd.vercel.app` returned 200 but the ref lives in JS chunks that were not inspected.

## 2. Connection status
- Supabase MCP: connected, **wrong/insufficient scope** — Greenland project is not in the connected org (matches blocker 1 in the integration gate doc). Not guessed from names; STRAKS / property-app untouched.
- Vercel MCP: connected, project metadata readable, env values hidden (sensitive).
- No Supabase CLI token or service key in the sandbox. No `.env*` files in repo.
- Live schema, RLS, row counts, Auth users: **not inspected**. Everything in §3–§5 is **inferred from repo code/migrations, not verified live**.

## 3. Schema findings (repo-inferred; UNVERIFIED live)
Tables the site queries: `members`, `cars`, `tournaments`, `race_entries`, `race_tickets`, `race_results`, `seasons`, `season_standings` (comment in `app/admin/race-results/page.tsx` says it is a **live VIEW** with total_wins, best_lap, races_attended, total_points, podiums, win_pct, season_rank), `loyalty_points`, `points_transactions`, `orders`, `payment_proofs`, `hall_of_fame`, `admin_config`, etc.
- `members.auth_user_id uuid → auth.users` added by repo migration `20260719_auth_phase1_foundation.sql` (partial unique index; `current_member_id()` helper). Marked applied in `docs/AUTH-ROLLOUT-STATUS.md` (2026-07-24) — **unconfirmed live**.
- `cars` is keyed by `id` with `member_name` / `member_email` text columns (admin cars page) — **ownership appears email/text based, not a `member_id` FK**. Needs live check.
- Race tables' FK shape (`race_entries` → member/car/tournament; `race_tickets` → member/tournament) not determinable from repo; no table-creation DDL for them exists in `supabase/migrations`.
- Leaderboard = `season_standings` view (`app/leaderboard/page.tsx`, read client-side with anon key).

## 4. Authentication & RLS findings
- Staff auth: Supabase Auth + `staff_roles` table (FORCE RLS, no direct grants), `has_staff_role()`, `is_admin()`, `current_staff_roles()`, owner bootstrap for `alltfarmer@gmail.com`. Executable by `authenticated` only.
- **Customer auth is NOT Supabase Auth.** `app/register/page.tsx` stores `password_hash` (bcrypt) in `members`, compares **in the browser** (`bcrypt.compare`), then sets a plain cookie `gm4wd_registered=1` + localStorage `gm4wd_member`. Consequences:
  - No server-verifiable customer identity; `auth.uid()` is null for customers → `prediction_pit_allowed()` returns false for every customer today.
  - Login requires the anon key to read `password_hash` for an email → **hashes are likely readable by anon via RLS/SELECT** (verify live; high-severity if true).
  - So **yes: customer authentication needs migration** (link members → Supabase Auth users) before private access can be enabled.
- RLS state of members/cars/race_*: unknown (not inspected). Several admin pages use the anon client directly (`createClient(URL, ANON)`); their protection depends entirely on RLS.

## 5. Reusable data (after live verification)
- Identity: `members.id` (+ `auth_user_id` once linked), `cars.id`, `tournaments.id`, `race_entries`, `race_tickets` (ticket **references** only).
- Official stats read-only: `race_results`, `season_standings` view (wins, podiums, best lap, win_pct) as odds input. Never write to these from Prediction Pit.
- Staff authz: reuse `is_admin()` / `has_staff_role()`.

## 6. Problems preventing integration
1. Greenland Supabase project not reachable from the connected account; ref unknown. (Blocker)
2. Customer auth is client-side bcrypt + cookie; no Auth linkage. (Blocker for member access; admin-only access could work today.)
3. Possible anon-readable `password_hash` (verify).
4. `cars` ownership by email text, not FK → ownership reconciliation needed.
5. Official-data anomalies noted in the site audit (standings/tickets mismatches) unverified.
6. Proposed migration review (§7) corrections.

## 7. Review of proposed migration `20261016_prediction_pit_access_forward.sql` and spec
Matches repo: `members.id`, `members.auth_user_id`, `is_admin()` exist in repo migrations. Required corrections before applying:
- **Type assumptions**: `m.name::text`, `m.email::text` fine if columns exist; confirm `members.id` is `uuid` (FK `references public.members(id)` fails otherwise) and that `members.name`/`email` exist as named.
- **Prereq check**: migration depends on phase1/phase2 auth migrations being applied live; add an upfront guard (`do $$ ... raise exception if to_regprocedure('public.is_admin()') is null or column auth_user_id missing`) so it fails closed instead of at function call time.
- **Admin-bypass**: `prediction_pit_allowed()` returns true for any `is_admin()`; confirm intended for all staff admins, not only owner.
- **Missing FORCE RLS** on the two tables (staff_roles uses `force row level security`); add for consistency, plus explicit deny-all policies.
- **Audit table** has no INSERT guard besides the SECURITY DEFINER function (acceptable); consider `revoke ... from service_role`-style review and immutability trigger (no update/delete).
- **`on delete cascade` to members**: deleting a member silently erases access + audit history; prefer `restrict`/`set null` for audit.
- **Roster function** exposes all member emails to any admin — fine, but confirm no role below admin (e.g. staff/cashier) should see it; currently admin-only (good).
- Fixed-search-path and revokes from `public, anon` are correct.
- Spec assumption "reconcile via member IDs" is blocked by cars using email text (see §3).
- Spec assumption that "cookie/localStorage is not authority" is correct and must hold; current register flow contradicts it until customer migration.

## 8. Recommended next steps
1. Owner: connect/authorize the **Greenland** Supabase project (or supply its ref and add the account to the MCP org), or provide a project-scoped read-only access token. Confirm region.
2. With access: read-only run — table/column/FK list, `pg_policies`, grants for `anon`/`authenticated` on `members`, `cars`, `race_*`, whether `password_hash` is selectable by anon, `list_migrations`, advisors (security).
3. Take backup / confirm PITR before any migration.
4. Design customer Supabase Auth migration: invite/reset-password email flow, link by verified email → `members.auth_user_id`, retire client bcrypt + cookie, remove anon read of `password_hash`.
5. Apply corrected access migration to a **branch/staging** copy first.
6. Then build the private virtual-wallet/prediction tables (separate schema, no touching loyalty/orders/results).

## 9. Requires owner authorization
- Access to the Greenland Supabase org/project (read-only first).
- Confirming which Supabase project production uses (cannot be read from sensitive Vercel envs; owner can view in Vercel dashboard → Settings → Environment Variables, or in Supabase dashboard).
- Creating a Supabase dev branch (billable) for migration rehearsal.
- Customer Auth migration plan and member communications.
- Any migration to production.

## 10. Re-check after owner authorization (2026-10-16, second pass)
- Supabase MCP `list_organizations`: still exactly one org, "Infinity038's Org" (`hjywefzdubyscsqtspoc`).
- `list_projects`: still exactly `straks-timelog`, `property-app`, `straks-saas`. **No Greenland Mini4WD project.** All three are unrelated projects and were not queried.
- **VERIFIED blocker:** the connected Supabase account/token has no membership in the organization that owns the Greenland Mini4WD project. Vercel stores `NEXT_PUBLIC_SUPABASE_URL` as a sensitive (write-only) variable, so the project ref cannot be derived from Vercel either.
- Consequence: items "verify live schema / FKs / RLS / staff permissions / anon grants on `members.password_hash`" and "corrected migration" are **not performed**. Section 3-6 findings remain **repo-inferred, unverified**. The migration file was not modified.
- Exact fix needed from owner (any one): (a) invite the connected Supabase account to the org that owns the Greenland project (Supabase dashboard → Organization → Team → Invite, read-only/developer role), and reconnect the MCP; or (b) state the project ref (from Supabase dashboard URL or Vercel env value) so access can be verified; or (c) provide a read-only DB role connection via the secure channel.
- No writes, migrations, projects or branches were created.

## 11. Third pass — correct Supabase org now connected (2026-10-16)
**VERIFIED (Supabase management API, metadata only):**
- Connected org: "Arctic Force" (`kvhjxwswpmvfxqcubxnm`).
- Projects in org:
  | Name | Ref | Region | Status | Created |
  |---|---|---|---|---|
  | `greenland-mini4wd` | `eojdjqihmxxaqltudqjx` | us-east-1 | **INACTIVE (paused)** | 2026-05-17 |
  | `greenland-mini4wd-auth-test` | `srtqqgyaemugmkjuhczx` | us-east-1 | **INACTIVE (paused)** | 2026-07-18 |
  | `SCT Rengøring ApS` | `cwwldjpgdkoyztoncqpm` | eu-west-1 | INACTIVE | 2026-05-29 (unrelated; not touched) |
- A read-only `list_tables` on `eojdjqihmxxaqltudqjx` failed with *connection timeout* — consistent with a paused database.

**PROBABLE (not verified):** production uses `greenland-mini4wd` (`eojdjqihmxxaqltudqjx`): name match, created the day before the Vercel project (2026-05-18), `-auth-test` created 2026-07-18 alongside the auth-rollout migrations. Vercel env values are sensitive/unreadable, so this cannot be confirmed from Vercel. Note: if production is serving live traffic while this project reports INACTIVE, the site is likely failing live reads — matches the "stale-data / failed live-record refresh" symptoms in `FULL_SITE_AUDIT_PUBLIC_ADMIN_2026-10-16.md`; i.e. the production project may itself be paused. Owner should confirm in the dashboard.

**Remaining blocker (exact):** both Greenland projects are paused. Un-pausing (`restore_project`) is a state change on the production project (and may carry billing/availability implications). It was outside the "read-only, no account changes" authorization, so it was NOT done. No schema, FK, RLS, grant, `password_hash` exposure, migration-compat or auth-linkage findings could be verified; §3–§6 remain repo-inferred. The proposed migration was not changed (corrections in §7 stand as recommendations).

**Owner decision needed (any one):**
1. Explicitly authorize restoring `greenland-mini4wd` (`eojdjqihmxxaqltudqjx`) so read-only inspection can proceed (recommended: take/confirm a backup first; restore is non-destructive but changes project state), or
2. Restore it yourself in the Supabase dashboard (Project → Restore), then re-run this audit, or
3. Authorize restoring `greenland-mini4wd-auth-test` only, for schema/RLS inspection on a non-production copy (note: it may not hold production data or match live schema).

**Planned read-only checks after restore:** `list_tables(verbose)` for FKs; `pg_policies`; `information_schema.role_table_grants` / column grants for `anon` and `authenticated` on `members`, `cars`, `race_*`, `season_standings`; `has_column_privilege('anon','public.members','password_hash','SELECT')` (privilege test only, no data read); `list_migrations`; security advisors; count-only queries for members with/without `auth_user_id`; type check of `members.id`.

**Secure Prediction Pit access design (to be validated live):** server-verified Supabase Auth session → `members.auth_user_id` link → `prediction_pit_allowed()` evaluated server-side on every request (RSC/route handler, 404 on false) and again in RLS/RPC for all Prediction Pit tables; tab visibility is UX only. Cookie/localStorage never authoritative. Requires customer Auth migration first (not started).

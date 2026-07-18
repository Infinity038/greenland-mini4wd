# Member Auth Migration Plan — bcrypt → Supabase Auth

Proposal only. No `auth.users` row has been created, no `members` row has been
read beyond aggregate counts, and no password hash value has been displayed,
logged, or exported anywhere in producing this document.

**Design correction (Phase B.2):** an earlier draft of this plan (and of
`phase1_auth_foundation_forward.sql`) performed the actual migration by
inserting/updating `auth.users`/`auth.identities` directly with raw SQL. That
is not an approved execution path. Every Auth user created or invited by this
plan now goes exclusively through the **Supabase Auth Admin API**
(`auth.admin.createUser`, `auth.admin.inviteUserByEmail`), run by the
separate, server-only, dry-run-by-default script
`scripts/migrateMembersToSupabaseAuth.mjs` — never by SQL `insert`/`update`
against `auth.*` tables. `phase1_auth_foundation_forward.sql` now performs
only public-schema changes (`members.auth_user_id`, its partial unique index,
`current_member_id()`); it does not create or touch a single Auth user.

**Safety hardening (Phase B.2.1):** the importer script itself now enforces
several controls beyond the design above, all covered by mocked tests
(`scripts/migrateMembersToSupabaseAuth.test.ts`):

- An unscoped `--apply` (no `--member-id`) is **always** refused unless
  `--confirm-bulk` is also passed — refused unconditionally, never inferred
  from how many rows happen to be writable (even a run with exactly one
  writable row is refused without `--confirm-bulk`).
- `--member-id` is validated as a well-formed UUID that actually exists in
  the members table; a missing value, malformed UUID, or nonexistent id is a
  fatal error with zero writes — never silently treated as "no `--member-id`
  was given" (which would otherwise turn a rejected pilot into an unscoped
  bulk run).
- Duplicate-email detection (§4 below) always runs against the **full**
  members dataset before `--member-id` scoping is applied, so a one-member
  pilot can never bypass a duplicate sitting elsewhere in the table.
- An Auth-lookup failure (`auth.admin.listUsers()` erroring, throwing, or
  returning a malformed response) fails the **entire run** closed — it is
  never classified as "no existing user," and the run stops before any
  `createUser`/`inviteUserByEmail`/members write, for that member or any
  member not yet checked.
- Sending a real invitation email (`auth.admin.inviteUserByEmail`) requires
  **both** `--apply` and the separate `--send-invitations` flag.
  `--confirm-bulk` does not imply invitation consent — a mixed bulk run
  applies Path A (bcrypt) writes normally but reports Path B rows as
  `invitation_not_authorized` unless `--send-invitations` is also passed.
- Every report, error, and duplicate/collision listing uses `maskedEmail`
  only — no output ever includes a full member email address.
- Unknown CLI flags are rejected outright rather than silently ignored, and
  `--help`/`-h` prints full usage without touching any environment variable
  or creating a Supabase client.

**Trusted provenance + error sanitization (Phase B.2.2):** two further
corrections, also covered by mocked tests:

- Automatic relinking of an existing Auth user (`relink_existing`) is
  authorized **only** by a matching
  `auth.users.app_metadata.migrated_from_members_id` value.
  `user_metadata` is editable by the account owner themselves and is
  **never** read for this purpose — a matching key found only in
  `user_metadata` is ignored outright, and that Auth user is still treated
  as `collision_manual_review`, never auto-attached. `app_metadata` is only
  ever writable through the Admin API (`auth.admin.updateUserById`), which
  is exactly why it — and only it — is trusted as proof an Auth user was
  created by this importer for a specific member.
- `createUser()`/`inviteUserByEmail()` payloads carry no provenance at all.
  Provenance is stamped as a **separate, subsequent**
  `auth.admin.updateUserById()` call, merging `migrated_from_members_id`
  onto whatever `app_metadata` Supabase Auth already set (e.g.
  `provider`/`providers`) — never overwriting it — and `members.auth_user_id`
  is linked **only** after that stamp is written **and verified** from the
  Admin API's own response (matching user id, matching
  `migrated_from_members_id`); an `updateUserById()` call that returns no
  error is not, by itself, treated as proof the stamp took effect. A failed
  or unverifiable stamp (`partial_auth_created_provenance_failed`) leaves
  `members.auth_user_id` unlinked and requires manual review — an
  administrator must deliberately repair that Auth user's `app_metadata`
  before any rerun will trust it. See §10a below for the full failure-state
  breakdown.
- No raw Admin API/PostgREST error or thrown exception is ever written to a
  report, a log line, or console output — every one passes through
  `sanitizeImporterError()` first, which redacts email addresses, bcrypt
  hashes, JWT/access/refresh-token-shaped strings, any explicitly-known
  secret value, and control/ANSI escape sequences, and caps the output
  length.

**No command below is currently approved for execution** — see
`docs/PRE-MIGRATION-BACKUP-AND-VALIDATION.md` §7 for the required
backup/branch/pilot sequence that must precede running any of them for real.

## 1. Compatibility analysis

Source (`app/register/page.tsx:54-55,112-113`, read for logic only, no data
read):

```ts
const bcrypt = await import("bcryptjs");
const password_hash = await bcrypt.hash(reg.password, 10);   // registration
...
const match = await bcrypt.compare(login.password, data.password_hash); // login
```

This is a **plain bcryptjs hash over the raw password, cost factor 10, no
pepper/pre-hash/HMAC step**. Supabase Auth's `auth.users.encrypted_password`
column is also a bcrypt hash, and GoTrue verifies logins with a direct bcrypt
compare against that column. **Structurally, these are the same algorithm
family and the existing hashes are very likely importable as-is** — bcrypt
hashes are self-describing (the cost factor and salt are embedded in the
string itself), so a hash produced at cost 10 verifies correctly regardless
of what cost factor Supabase's own hashing would have used. The Admin API's
`auth.admin.createUser({ password_hash })` parameter is exactly the
supported, documented way to import an existing hash — GoTrue stores it as
the account's `encrypted_password` internally; this plan never writes that
column directly.

This is **not** a guarantee for every row. Two things are checked per-row
before import — by the importer script itself
(`isValidBcryptHash()`/`BCRYPT_HASH_PATTERN` in
`scripts/migrateMembersToSupabaseAuth.mjs`), never by printing or exporting
the value itself:

- The stored value matches a valid bcrypt shape: `^\$2[aby]\$\d{2}\$.{53}$`
  (60 characters total). A boolean/count check
  (`password_hash ~ '^\$2[aby]\$'`) is safe to run and report; the hash
  string itself is never selected out, logged, or included in any report.
- The value is non-null (guest-status members registered without ever setting
  a password have `password_hash IS NULL` and are not candidates for Path A —
  see §4).

Anything failing either check goes to **Path B**, not a blocked migration —
nobody is left unable to log in.

## 2. Path A — compatible hashes, Admin API import

For every `members` row where `password_hash` is non-null and matches the
bcrypt shape check above, `scripts/migrateMembersToSupabaseAuth.mjs`:

1. Calls `supabase.auth.admin.createUser({ email: lower(members.email),
   password_hash: members.password_hash, email_confirm: true })` — the
   **existing** hash travels as `password_hash`, never as `password` (there
   is no `password` key in the payload at all — see the script's
   `buildCreateUserPayload()` and its own tests asserting this shape).
   `email_confirmed_at` is set by `email_confirm: true`: they are already an
   existing, real member — this is not a new signup that needs email
   verification. The payload carries **no** migration provenance — see
   step 2.
2. Only after that call succeeds, calls `supabase.auth.admin.updateUserById(
   authUserId, { app_metadata: { ...existingAppMetadata,
   migrated_from_members_id: members.id } })` to stamp trusted provenance
   (`buildAppMetadataStamp()`), merged on top of whatever `app_metadata`
   Supabase Auth already set — never overwritten — and **verifies** the
   response actually reflects it (`verifyAppMetadataStamp()`: matching user
   id, matching `migrated_from_members_id`) before trusting it.
3. Only after that stamp is written **and verified**, updates that exact
   `members.auth_user_id` to the returned id — never before, never
   speculatively, never for a different row. See §10a for what happens if
   any of these three steps fails partway through.
4. Result: the member's **existing password continues to work unchanged**
   the next time they use `supabase.auth.signInWithPassword({ email,
   password })` — no reset required, no email sent, because GoTrue's bcrypt
   compare succeeds against the imported hash exactly as it would have
   against a hash GoTrue generated itself.

Before bulk-applying: run the script against **exactly one** test/throwaway
account first (`--member-id=<id> --apply`, see
`docs/PRE-MIGRATION-BACKUP-AND-VALIDATION.md`), confirm
`signInWithPassword` succeeds with that account's real password, *then*
apply to the remaining rows (`--apply --confirm-bulk`) in the same phase.

## 3. Path B — incompatible, invalid, or missing hashes

For every non-guest `members` row where `password_hash` is null, fails the
bcrypt shape check, or is otherwise unusable, the same script:

1. Calls `supabase.auth.admin.inviteUserByEmail(email, { data: {
   requires_password_reset: true } })` — no password or hash of any kind is
   ever sent for this path; Supabase's own invitation email is what lets
   the member set their own password. **Never generate or assign a
   password on their behalf.** `requires_password_reset` is a non-sensitive
   UX hint only — it is never read to authorize anything. The payload
   carries no migration provenance; invite data is never treated as trusted
   provenance.
2. Only after the invitation call succeeds, stamps and verifies trusted
   `app_metadata` provenance exactly as Path A step 2 does.
3. Only after that stamp is written and verified, updates that exact
   `members.auth_user_id` — same rule as Path A.
4. Sending a real invitation email is gated behind **both** `--apply` and
   the separate `--send-invitations` consent flag, like every other write
   this script performs; dry-run output identifies these rows
   (`path: invitation_required`) without contacting anyone.

## 3a. Safe example commands (reference only — none approved for execution)

These are the only command shapes this plan endorses. Every one of them
still requires `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_URL` (or
`NEXT_PUBLIC_SUPABASE_URL`) in the environment (never committed), and every
one of them is still subject to the full backup/branch/pilot sequence in
`docs/PRE-MIGRATION-BACKUP-AND-VALIDATION.md` §7 before it may ever run
against anything other than an isolated branch. **No command below has been
run — this table is documentation, not a green light.**

| # | Command | What it does |
|---|---|---|
| 1 | `node scripts/migrateMembersToSupabaseAuth.mjs` | Dry run, no flags. Reports the full Path A/B/skip split for every member. No Admin API call, no write, no email sent. |
| 2 | `node scripts/migrateMembersToSupabaseAuth.mjs --member-id=<uuid> --apply` | Single-member pilot, Path A (bcrypt). Writes exactly one `auth.users` row via `createUser({ password_hash })` and links that one `members.auth_user_id` — only if that member's `password_hash` is a valid bcrypt hash. No `--confirm-bulk` needed for a scoped single-member run. |
| 3 | `node scripts/migrateMembersToSupabaseAuth.mjs --member-id=<uuid> --apply --send-invitations` | Single-member pilot, Path B (invitation). Sends **one real invitation email** to that member via `inviteUserByEmail`. `--send-invitations` is required in addition to `--apply` for this member to be contacted at all — omitting it reports the row as `invitation_not_authorized` and sends nothing. |
| 4 | `node scripts/migrateMembersToSupabaseAuth.mjs --apply --confirm-bulk` | Bulk run, Path A only. Writes every eligible bcrypt-hash member's Auth account and link. Any `invitation_required` row is reported as `invitation_not_authorized` and **not contacted**, since `--send-invitations` is absent. |
| 5 | `node scripts/migrateMembersToSupabaseAuth.mjs --apply --confirm-bulk --send-invitations` | Bulk run, Path A and Path B together. Writes every eligible bcrypt-hash member's Auth account and link, **and sends a real invitation email to every `invitation_required` member**. This is the only command shape that ever sends bulk invitation email — it requires deliberately combining three separate flags, none of which alone is sufficient. |

`--help` (or `-h`) prints the full flag reference without requiring any
environment variable or creating a Supabase client — safe to run at any
time, including with no `.env` configured at all.

## 4. Duplicate-email handling

`members.email` has a database-level `UNIQUE` constraint (`members_email_key`)
— confirmed via `information_schema.table_constraints`, no data read. This
rules out **exact-string** duplicates, but not case-variant duplicates
(`Racer@x.com` vs `racer@x.com` can both satisfy a case-sensitive unique
index while colliding once normalized to lowercase, which is what
`auth.users.email` migration must use). Two independent layers catch this
before any write:

1. A manual pre-flight SQL check, run by hand before the script:

   ```sql
   -- Verification query — returns lowercase email + count only, never the row.
   select lower(email) as normalized_email, count(*) as duplicate_count
   from members
   group by lower(email)
   having count(*) > 1;
   ```

2. The importer script's own `detectDuplicateMemberEmails()` runs the same
   check in-process, automatically, on every invocation (including dry-run)
   — if any duplicate exists among the members rows it was given, the
   **entire run stops** (`fatalError: 'duplicate_member_emails'`) before a
   single Admin API call or `findExistingAuthUser` lookup happens, not just
   before the write.

Any email flagged by either check is pulled out for **manual review** (which
of the duplicate rows is canonical? are both real, separate people who happen
to share a normalized email, or the same person registered twice?) — never
auto-merged, never auto-imported. Both checks must return/report zero
duplicates before Path A/B proceeds for the rest of the table.

## 5. Missing-email handling

Supabase Auth's password flow requires a non-null email. Any `members` row
with a null/blank `email` (schema allows it — `email` is `NOT NULL` at the
column level so this is currently impossible, but re-verified here since a
future column relaxation could reintroduce it) cannot get a password-based
`auth.users` account and is excluded from both paths until resolved by hand
(correct the record, or accept the account cannot use Auth-based login).

## 6. Inactive / archived accounts

`member_status` (`guest | registered | official`) and `is_active_member` /
`membership_expires_at` are club-membership concepts, not account-existence
concepts — they must not be conflated with whether someone gets a login:

- **`guest`** rows typically never set a password (`password_hash IS NULL`)
  — the importer script classifies them `guest_skipped` and excludes them
  from migration by default, reporting them as intentionally skipped rather
  than silently creating an Auth user for them. They get an `auth.users` row
  only if/when they actually register a password later through the normal
  Supabase Auth sign-up flow.
- **`registered` / `official`** rows get an `auth.users` account regardless
  of `is_active_member` or an expired `membership_expires_at` — an expired
  club membership is not the same thing as "can't log in to see your own
  history." Access to member-only *features* is enforced separately, in RLS
  policies and route guards (Phase 3 / Phase 4), not by withholding the
  account itself.

## 7. Rollback strategy

The schema change only ever *adds* a column/index/function — nothing
pre-existing in `members` is altered or deleted — so the SQL rollback
(`phase1_auth_foundation_rollback.sql`) is a clean subtraction of exactly
that: `current_member_id()`, the partial unique index, then
`members.auth_user_id`. **It does not, and must not, delete any
`auth.users`/`auth.identities` row** — those are owned by Supabase Auth,
created by the importer script's Admin API calls, and are entirely outside
what a SQL rollback can safely reason about (see that rollback file's own
header for the full explanation).

If Auth users created by the importer genuinely need to be removed as part
of a rollback, that is a **separate, deliberate decision**, made with the
real list of already-migrated members in hand, executed one at a time
through the Supabase Auth Admin API (`auth.admin.deleteUser()`) — never a
raw SQL `delete from auth.users`, and never automated as part of this SQL
rollback file.

Take a snapshot of the `id → auth_user_id` mapping (see
`docs/PRE-MIGRATION-BACKUP-AND-VALIDATION.md`) **before** Phase 3 (RLS) is
applied, since RLS policies will start depending on `auth_user_id` — rolling
back Phase 1 after Phase 3 is live requires rolling back Phase 3 first.

## 8. Verification queries (counts/status only, never hash values)

```sql
-- How many members are eligible for each path, before doing anything:
select
  count(*) filter (where password_hash ~ '^\$2[aby]\$') as path_a_candidates,
  count(*) filter (where password_hash is null or password_hash !~ '^\$2[aby]\$') as path_b_candidates,
  count(*) as total_members
from members;

-- Post-migration reconciliation: every members row should now have exactly
-- one auth_user_id, and every auth_user_id should point to a real row.
select
  (select count(*) from members) as members_total,
  (select count(*) from members where auth_user_id is not null) as members_linked,
  (select count(*) from auth.users u where not exists (
     select 1 from members m where m.auth_user_id = u.id
   )) as orphaned_auth_users; -- should be 0
```

## 9. Reconciliation report (format, not data)

Every real run of `scripts/migrateMembersToSupabaseAuth.mjs` (dry-run or
`--apply`) prints a report with exactly these fields per member — no email,
no name, no hash value, no service-role key, no Auth token
(`buildReportEntry()`, and its own tests, enforce this shape):

| memberId | maskedEmail | currentLinkage | path | outcome | errorCode |
|---|---|---|---|---|---|
| `<uuid>` | `ra***@example.com` | linked / unlinked | existing_bcrypt / invitation_required / guest_skipped / already_linked / collision_manual_review / relink_existing | created / invited / relinked / skipped / invitation_not_authorized / auth_creation_failed / auth_invitation_failed / partial_auth_created_provenance_failed / partial_migration_link_failed | (present only on a failure outcome) |

Any `error` value that accompanies a failure outcome has always already
passed through `sanitizeImporterError()` — see §10a.

## 10. Rule preventing duplicate Auth accounts

Enforced at two independent layers:

1. **Schema level**, not just process discipline:

   ```sql
   create unique index members_auth_user_id_key
     on members (auth_user_id)
     where auth_user_id is not null;
   ```

   A `members` row can be linked to at most one `auth.users` row, and —
   because `auth.users.email` itself is unique in Supabase's own `auth`
   schema — no two `members` rows can end up pointing at the same Auth
   account either.

2. **Importer level**: before writing anything, the script looks up whether
   an Auth user already exists for the target email
   (`findExistingAuthUser`). If one exists with `app_metadata` verifying it
   was created by this script *for this exact member* (`relink_existing`),
   it is safely relinked rather than duplicated. `user_metadata` is never
   read for this check — a matching key found only there is ignored, since
   it is editable by the account owner and proves nothing about who created
   the account. If no such **trusted** `app_metadata` exists — whether
   because the account is genuinely unrelated, or because a prior run's
   provenance stamp failed (§10a) — **it is never auto-attached**; the row
   is flagged `collision_manual_review` and left untouched until a human
   resolves it.

Combined with the §4 pre-migration duplicate-email checks, this closes every
direction of the "duplicate account" risk without ever guessing.

## 10a. Partial-failure states (provenance stamping is a separate, verified step)

Because linking a member spans up to three independent calls — create/invite,
stamp `app_metadata`, link `members.auth_user_id` — each stage's real outcome
is reported individually, and each implies a different safe rerun behavior:

- **`auth_creation_failed` / `auth_invitation_failed`** — the Admin API call
  itself failed. Nothing was created. Safe to retry from scratch on a
  rerun.
- **`partial_auth_created_provenance_failed`** — `createUser()`/
  `inviteUserByEmail()` succeeded (the report includes the real `authUserId`
  for manual reference), but the subsequent `updateUserById()` app_metadata
  stamp either errored or could not be **verified** from its response
  (`errorCode: auth_provenance_update_failed` or
  `auth_provenance_verification_failed`). `members.auth_user_id` is **never**
  linked in this state. Because trusted provenance was never established,
  this Auth user has no `app_metadata.migrated_from_members_id` — a rerun's
  lookup will (correctly) classify it as `collision_manual_review`, never
  reuse or duplicate it. An administrator must deliberately repair that Auth
  user's `app_metadata` by hand before any rerun will trust it.
- **`partial_migration_link_failed`** — the `app_metadata` stamp was written
  **and verified**, but the `members.auth_user_id` write itself failed
  (`errorCode: member_link_failed`). Because provenance is already verified,
  a rerun's lookup finds the matching `app_metadata` and safely selects
  `relink_existing` — it never calls `createUser()`/`inviteUserByEmail()`
  again for that member.

Full forward/rollback SQL for the schema-only portion of this phase:
`supabase/migrations-proposed/phase1_auth_foundation_forward.sql` /
`..._rollback.sql`. The actual member-linking logic lives in
`scripts/migrateMembersToSupabaseAuth.mjs`, not in either SQL file.

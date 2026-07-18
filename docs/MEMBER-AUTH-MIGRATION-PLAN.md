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
   password_hash: members.password_hash, email_confirm: true, user_metadata:
   { migrated_from_members_id: members.id } })` — the **existing** hash
   travels as `password_hash`, never as `password` (there is no `password`
   key in the payload at all — see the script's `buildCreateUserPayload()`
   and its own tests asserting this shape). `email_confirmed_at` is set by
   `email_confirm: true`: they are already an existing, real member — this is
   not a new signup that needs email verification.
2. Only after the Admin API call succeeds and returns a real Auth user id,
   updates that exact `members.auth_user_id` to the returned id — never
   before, never speculatively, never for a different row.
3. Result: the member's **existing password continues to work unchanged**
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
   migrated_from_members_id: members.id, requires_password_reset: true } })`
   — no password or hash of any kind is ever sent for this path; Supabase's
   own invitation email is what lets the member set their own password.
   **Never generate or assign a password on their behalf.**
2. Only after the invitation call succeeds and returns a real Auth user id,
   updates that exact `members.auth_user_id` — same rule as Path A.
3. Sending a real invitation email is gated behind `--apply` like every
   other write this script performs; dry-run output identifies these rows
   (`path: invitation_required`) without contacting anyone.

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

| memberId | maskedEmail | currentLinkage | path | outcome |
|---|---|---|---|---|
| `<uuid>` | `ra***@example.com` | linked / unlinked | existing_bcrypt / invitation_required / guest_skipped / already_linked / collision_manual_review / relink_existing | created / invited / relinked / skipped / failed_creation / failed_linking / partial_migration_manual_repair |

`partial_migration_manual_repair` means the Admin API call succeeded (a real
Auth user id is included in the report for manual reference) but the
subsequent `members.auth_user_id` write failed — this is reported plainly,
not silently retried or hidden; the next run safely relinks that exact
member via verified `migrated_from_members_id` metadata (`relink_existing`)
rather than creating a second Auth user.

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
   (`findExistingAuthUser`). If one exists with `user_metadata` verifying it
   was created by this script *for this exact member* (`relink_existing`),
   it is safely relinked rather than duplicated. If one exists with no such
   metadata — an unrelated account that happens to share an email —
   **it is never auto-attached**; the row is flagged `collision_manual_review`
   and left untouched until a human resolves it.

Combined with the §4 pre-migration duplicate-email checks, this closes every
direction of the "duplicate account" risk without ever guessing.

Full forward/rollback SQL for the schema-only portion of this phase:
`supabase/migrations-proposed/phase1_auth_foundation_forward.sql` /
`..._rollback.sql`. The actual member-linking logic lives in
`scripts/migrateMembersToSupabaseAuth.mjs`, not in either SQL file.

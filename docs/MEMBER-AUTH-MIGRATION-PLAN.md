# Member Auth Migration Plan — bcrypt → Supabase Auth

Proposal only. No `auth.users` row has been created, no `members` row has been
read beyond aggregate counts, and no password hash value has been displayed,
logged, or exported anywhere in producing this document.

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
column is also a bcrypt hash (via Postgres `pgcrypto`'s `crypt()` with
`gen_salt('bf')`), and GoTrue verifies logins with a direct bcrypt compare
against that column. **Structurally, these are the same algorithm family and
the existing hashes are very likely importable as-is** — bcrypt hashes are
self-describing (the cost factor and salt are embedded in the string itself),
so a hash produced at cost 10 verifies correctly regardless of what cost
factor Supabase's own hashing would have used.

This is **not** a guarantee for every row. Two things must be checked
per-row before import, using shape/validity checks only — never printing or
exporting the value itself:

- The stored value matches a valid bcrypt shape: `^\$2[aby]\$\d{2}\$.{53}$`
  (60 characters total). A boolean/count check (`password_hash ~ '^\$2[aby]\$'`)
  is safe to run and report; the hash string itself is never selected out.
- The value is non-null (guest-status members registered without ever setting
  a password have `password_hash IS NULL` and are not candidates for Path A —
  see §4).

Anything failing either check goes to **Path B**, not a blocked migration —
nobody is left unable to log in.

## 2. Path A — compatible hashes, direct import

For every `members` row where `password_hash` is non-null and matches the
bcrypt shape check above:

1. Create one `auth.users` row with `encrypted_password` set to the
   **existing** `members.password_hash` value (copied row-to-row inside a
   single SQL statement/transaction — never selected into application code,
   never displayed), `email` = `lower(members.email)`, `email_confirmed_at =
   now()` (they are already an existing, real member — this is not a new
   signup that needs email verification), and `raw_user_meta_data` recording
   `{"migrated_from_members_id": "<members.id>"}` for traceability.
2. Set `members.auth_user_id` to the new `auth.users.id`.
3. Result: the member's **existing password continues to work unchanged**
   the next time they use `supabase.auth.signInWithPassword({ email,
   password })` — no reset required, no email sent, because GoTrue's bcrypt
   compare succeeds against the imported hash exactly as it would have
   against a hash GoTrue generated itself.

Before bulk-applying: run this against **exactly one** test/throwaway account
first (see `docs/PRE-MIGRATION-BACKUP-AND-VALIDATION.md`), confirm
`signInWithPassword` succeeds with that account's real password, *then* apply
to the remaining rows in the same phase.

## 3. Path B — incompatible, invalid, or missing hashes

For every `members` row where `password_hash` is null, fails the bcrypt shape
check, or is otherwise unusable:

1. Create the `auth.users` row anyway (so the member has an account to
   attach going forward), but with **no usable password set** — Supabase
   supports creating a user record and immediately issuing a recovery/invite
   link rather than a real password.
2. Set `members.auth_user_id` as in Path A.
3. Send (or queue, pending your approval of the actual send step — this
   phase only prepares the mechanism) a Supabase password-recovery email so
   the member sets a brand-new password themselves. **Never generate or
   assign a password on their behalf.**

## 4. Duplicate-email handling

`members.email` has a database-level `UNIQUE` constraint (`members_email_key`)
— confirmed via `information_schema.table_constraints`, no data read. This
rules out **exact-string** duplicates, but not case-variant duplicates
(`Racer@x.com` vs `racer@x.com` can both satisfy a case-sensitive unique
index while colliding once normalized to lowercase, which is what
`auth.users.email` migration should use). Before running Path A/B:

```sql
-- Verification query — returns lowercase email + count only, never the row.
select lower(email) as normalized_email, count(*) as duplicate_count
from members
group by lower(email)
having count(*) > 1;
```

Any email returned here is pulled out for **manual review** (which of the
duplicate rows is canonical? are both real, separate people who happen to
share a normalized email, or the same person registered twice?) — never
auto-merged, never auto-imported. This must return zero rows before Path A/B
proceeds for the rest of the table.

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
  — they're not migrated to Path A/B at all in this phase; they get an
  `auth.users` row only if/when they actually register a password later
  through the normal Supabase Auth sign-up flow.
- **`registered` / `official`** rows get an `auth.users` account regardless
  of `is_active_member` or an expired `membership_expires_at` — an expired
  club membership is not the same thing as "can't log in to see your own
  history." Access to member-only *features* is enforced separately, in RLS
  policies and route guards (Phase 3 / Phase 4), not by withholding the
  account itself.

## 7. Rollback strategy

Both paths only ever *add* rows/columns — nothing pre-existing in `members`
is altered or deleted, so rollback is a clean subtraction:

1. `delete from auth.users where raw_user_meta_data->>'migrated_from_members_id' is not null;`
   — the `members.auth_user_id` FK is `on delete set null`, so this
   automatically clears the link without touching the `members` row itself.
2. If fully reverting Phase 1: `alter table members drop column auth_user_id;`
   (see `phase1_auth_foundation_rollback.sql`).

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

The actual migration run (Phase 1, once approved) should produce a report
with these columns only — no email, no name, no hash value:

| members.id | path | auth_user_id created? | outcome |
|---|---|---|---|
| `<uuid>` | A / B / manual-review | yes/no | imported / invite-sent / skipped-guest / skipped-duplicate |

## 10. Rule preventing duplicate Auth accounts

Enforced at the schema level, not just by process discipline:

```sql
create unique index members_auth_user_id_key
  on members (auth_user_id)
  where auth_user_id is not null;
```

A `members` row can be linked to at most one `auth.users` row, and — because
`auth.users.email` itself is unique in Supabase's own `auth` schema — no two
`members` rows can end up pointing at the same Auth account either. Combined
with the §4 pre-migration duplicate-email check, this closes both directions
of the "duplicate account" risk.

Full forward/rollback SQL for this phase: `supabase/migrations-proposed/phase1_auth_foundation_forward.sql` /
`..._rollback.sql`.

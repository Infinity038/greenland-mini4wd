# Pre-execution review hold — local restore rehearsal

**As of 2026-10-17: PREPARATION ONLY. NO BACKUP EXECUTED.**

Review of the current `scripts/backup/40_restore_rehearsal.sh` confirms the managed-schema issue Claude noted: it loads managed `data_managed.sql` into an initialized Docker Supabase Postgres without ensuring the local `auth`, `storage` and `supabase_migrations` schema definitions/configuration match the source dump. A syntax-only pass is not a restore test. A fresh-container test may stop with missing table/constraint conflicts. **Do not run the full backup-to-rehearsal sequence or declare it recoverable on this revision.**

Required before executing the production export:
1. Keep the target a **disposable localhost-only Docker instance**, with no cloud Supabase project or production schema changes. Do not blindly drop managed schemas from a live or shared database. If schema reset is necessary in the disposable container, precisely scope it, prove target is local/throwaway and check dependencies/extensions first.
2. Review and stage a reproducible local managed-schema bootstrap from `schema_managed_REFERENCE_ONLY.sql` or an appropriate version-matched Supabase bootstrap. Show how `auth.users`, Storage metadata and `supabase_migrations` can be restored in dependency-safe order. A managed schema export marked 'reference only' is **not** automatically a complete service bootstrap.
3. Run syntax/static checks, and dry-run the restore script against a **synthetic dataset** or an appropriately configured blank disposable instance before running the real production export. Real backup data must stay locally encrypted/off GitHub/Claude chat.
4. Preserve strict stop-on-error and verify **all** public, auth, storage, and migration table counts, required objects/grants/RLS/functions, actual encrypted archive decryptability, and the manually documented service config. Matching public counts alone is inadequate; matching counts alone still does not prove Supabase Auth service functionality.
5. Confirm the actual production Vercel Supabase URL matches project ref before backup. Database credentials entered only into local hidden prompt; no connection strings/passwords in remote Claude conversation.
6. Keep only Stage 1 **local tooling / storage setup and bash syntax checks** authorized until this rehearsal repair is code-reviewed. Do not apply any production migration, open direct table access, merge this PR, or deploy Prediction Pit.

The owner may proceed with non-mutating PC prerequisites now. Next approval gate: reviewed rehearsal implementation, tool installation/preflight success, verified destination encryption and confirmed project identity.

## Resolution proposal (2026-10-17, Claude) — awaiting Ace code review
- `40_restore_rehearsal.sh` no longer touches the image's managed schemas. It creates a NEW empty database (`template0`) in the disposable loopback container, recreates production extensions from `extensions.tsv`, removes only that DB's empty default `public` (RESTRICT), then loads `schema_all.sql` and `data_all.dump`. Safety guards: loopback host, container started by the script, refuses the production ref.
- `10_backup.sh` now writes ONE schema dump and ONE data dump across `public, auth, storage, supabase_migrations`: pg_dump orders cross-schema dependencies (e.g. auth trigger → public function) and the data is a single consistent snapshot. Adds `extensions.tsv` and `objects_before.tsv` (structure inventory, names only).
- Data loads with triggers disabled (prevents auth-trigger side effects such as duplicate member rows), then every FK is re-validated.
- Rehearsal fails on: any SQL error, any count mismatch (all four schemas, both directions), any structure difference (RLS flags, policies, functions, triggers, constraints, grants), or FK violation.
- `lib.sh`: TLS still forced for every non-loopback host; server-version read now fails loudly.
- `tests/synthetic_e2e.sh` + `tests/synthetic_seed.sql`: synthetic-only dry run incl. negative tests.
- Validated in Claude's sandbox with PostgreSQL 16 standing in for Docker: SYNTHETIC E2E PASSED (counts, 61-item structure inventory, FK re-validation, tamper + mismatch negatives, age encrypt/decrypt/sha256). **Still required on the owner PC: the same test against the real `supabase/postgres:17.6.1.155` image** (extensions, roles, image auth).
- Limits unchanged: no proof of Auth service sign-in/config, Storage files, role passwords or project settings — manual §6 checklist remains mandatory.

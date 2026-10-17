# Greenland Mini4WD — manual Supabase backup procedure (PREPARED, NOT EXECUTED)

No export has been run. No credentials were requested or used. No customer data is in this repo or in any cloud staging area.

## 1. Verified target (non-secret)
| Item | Value | Basis |
|---|---|---|
| Org / project | Arctic Force / `greenland-mini4wd` | Supabase management API |
| Ref | `eojdjqihmxxaqltudqjx` | Supabase API |
| Region / Postgres | us-east-1 / 17.6.1.155 | Supabase API |
| Status | ACTIVE_HEALTHY (re-checked 2026-10-17) | Supabase API |
| Plan / backups | Free; **no provider backups, no PITR** | Owner dashboard evidence (see `SECURITY_REMEDIATION_GATE_2026-10-16.md`) |
| Prod ↔ Vercel match | **Still unconfirmed** — Vercel value is sensitive. Owner must compare production `NEXT_PUBLIC_SUPABASE_URL` host (`<ref>.supabase.co`) with the ref above before exporting | |
| Do NOT back up | `greenland-mini4wd-auth-test` (`srtqqgyaemugmkjuhczx`) — not production | |

Sizing (count-only, prior audit): members 7, cars 5, tournaments 2, orders 4, payment_proofs 7, race_tickets 4, race_results 2, auth.users 1, storage.objects 0 (1 bucket). Expect a few MB. The dashboard's row estimates read 0 — ignore them. Need ≥1 GB free.

## 2. What the backup covers / does not
Covered (logical export via `pg_dump`, read-only): `public` schema + data (tables, views, functions, **grants, RLS state**), `auth` data (identities/hashes), `storage` metadata, `supabase_migrations` history, role names/flags (no secrets), bucket list.
NOT covered (manual, section 6): Auth dashboard settings (SMTP, redirect URLs, providers, templates), Storage object files (0 rows today — re-check), Edge Functions (none listed earlier — re-check), Vercel env **names**, DNS/domain config. A logical dump is not a point-in-time recovery; call it "recoverable" only after the rehearsal passes.

## 3. Tools (owner's PC; Windows → use WSL2 Ubuntu)
- PostgreSQL client **17+** (`pg_dump`, `pg_restore`, `psql`): server is 17, older pg_dump refuses. Ubuntu: add apt.postgresql.org, `sudo apt install postgresql-client-17`.
- `age` (preferred) or `gpg`; `sha256sum`, `tar`.
- Docker (Desktop with WSL integration) — only for the local restore rehearsal.
- Encrypted disk (BitLocker/FileVault/LUKS) for `BACKUP_ROOT`, **outside this repo**.

## 4. Credentials & storage
- Needed from the owner, typed locally only: DB password (Dashboard → Project Settings → Database → reset/reveal) and the **Session pooler** host (Dashboard → Connect; direct host is IPv6-only). User is `postgres.<ref>`. Passed via hidden prompt / process env — never in git, logs, chat, or ZIPs. The scripts refuse a host/user that doesn't contain the expected ref.
- Not needed: service-role key, anon key, access tokens, Vercel access.
- Encryption: `age-keygen -o ~/greenland-backup.key` once; keep that key file OFFLINE (password manager + paper/USB), set `AGE_RECIPIENT=age1…` (public key). Fallback: gpg symmetric passphrase.
- Storage: plaintext only in `BACKUP_ROOT` on an encrypted disk; encrypted archive + `.sha256` copied to ≥1 off-device owner-controlled location. No cloud staging by Claude.

## 5. Procedure
```bash
git pull   # get scripts/backup on the security branch
export BACKUP_ROOT=/path/on/encrypted/disk/greenland-backups    # outside the repo
bash scripts/backup/00_preflight.sh        # read-only; confirms tools, versions, connectivity, free space
# Announce a short write freeze (no orders/payments/race edits/registrations), then:
bash scripts/backup/10_backup.sh           # read-only export; prints output dir
bash scripts/backup/20_verify.sh  "$OUT"   # checksums, TOC readable, tables present, counts stable, no secrets in text files
bash scripts/backup/40_restore_rehearsal.sh "$OUT"   # disposable local Docker restore; counts must match
export AGE_RECIPIENT=age1...               # your public key
bash scripts/backup/30_encrypt.sh "$OUT"   # tar + encrypt + sha256
```
Then: decrypt-test the archive (`age -d -i ~/greenland-backup.key FILE | tar -t`), copy archive + `.sha256` off-device, record the sha256 in the manifest note, and delete the plaintext folder (SSD-safe deletion relies on disk encryption).

## 6. Manual config snapshot (no secrets)
Screenshot/export, store with the archive: Auth → URL Configuration, Providers, Email templates, SMTP host (not password); Storage → bucket list/policies; Edge Functions list; Database → Extensions; Vercel → env var **names** and target environments; domain/DNS. If `storage.objects` > 0, download files separately (Dashboard or Storage API) and hash them.

## 7. Integrity checklist (all must pass)
1. `20_verify.sh` prints ALL CHECKS PASSED. 2. `counts_before.tsv == counts_after.tsv`. 3. Rehearsal: every `public.*`, `auth.*`, `storage.*` and `supabase_migrations.*` table count `PASS`, with no suppressed SQL restore error. Matching counts must be supplemented by manual configuration/restore-coverage checks; never call an incomplete managed restore recoverable. 4. Encrypted archive decrypts with the offline key and `tar -t` lists the folder. 5. Archive sha256 recorded and re-checked on the off-device copy. 6. Plaintext removed.

## 8. Recovery (if production data is damaged)
Do not restore over production blindly. (a) Restore into a NEW Supabase project (Pro required — needs separate cost approval) or a local Postgres first; (b) `psql -f schema_public.sql`, then `pg_restore --data-only --disable-triggers -d <db> data_public.dump`; (c) restore `auth`/`storage` data from `data_managed.sql` into a project with matching Auth version (best effort — check `backup.log`); (d) re-apply Auth settings from section 6 snapshot; (e) point the app at the restored project only after owner sign-off. Auth user sessions will need re-login. A standalone local Docker row-count rehearsal is necessary but is not an end-to-end Supabase Auth/Storage service recovery test; document any untested managed-service configuration before authorizing production cutover.

## 9. Go/No-go for security work
RLS/grant/Auth migrations stay BLOCKED until sections 5 and 7 are evidenced (manifest + hashes, no data). Do not apply `20261016_prediction_pit_access_forward.sql` or any cutover before then.

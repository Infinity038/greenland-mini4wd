# RESUME FROM HERE — Greenland Mini4WD manual backup

**State (2026-10-17):** preparation done; **nothing exported, no credentials used, no DB writes.**
Target: Arctic Force → `greenland-mini4wd`, ref `eojdjqihmxxaqltudqjx`, us-east-1, PG 17, Free plan, no provider backups, ACTIVE_HEALTHY.
Branch: `security/verified-member-auth-rls-plan-2026-10-16`. Full detail: `docs/backup/BACKUP_PROCEDURE.md`.

## When your PC is available — do in order
1. [ ] Confirm production Vercel `NEXT_PUBLIC_SUPABASE_URL` host = `eojdjqihmxxaqltudqjx.supabase.co` (Vercel dashboard; don't paste it anywhere).
2. [ ] Install PG client 17+, `age`, Docker (WSL2 on Windows). Create age key; keep private key offline; note public key `age1…`.
3. [ ] Pick `BACKUP_ROOT` on an encrypted disk, outside the repo; ≥1 GB free.
4. [ ] `git pull` this branch.
5. [ ] Supabase Dashboard → Connect: copy **Session pooler** host; have DB password ready (type it only at the hidden prompt).
6. [ ] `bash scripts/backup/00_preflight.sh` — must print OK.
7. [ ] Short write freeze (orders, payments, race results, registrations).
8. [ ] `bash scripts/backup/10_backup.sh` → note the output folder.
9. [ ] `bash scripts/backup/20_verify.sh <folder>` → ALL CHECKS PASSED.
10. [ ] `bash scripts/backup/40_restore_rehearsal.sh <folder>` → all `public.*` PASS.
11. [ ] Take the manual config snapshot (procedure §6); check `storage.objects` count (0 expected).
12. [ ] `AGE_RECIPIENT=age1… bash scripts/backup/30_encrypt.sh <folder>`; test decrypt; copy archive + `.sha256` off-device; delete plaintext; lift freeze.
13. [ ] Tell Ace/Claude: pass/fail per step + archive sha256 + counts (no data, no secrets). Claude then records evidence in the security gate doc and unblocks the next phase.

## Rules
- Never commit/paste/upload: DB password, connection strings, dumps, archives, keys, counts files with customer content.
- Do not use `greenland-mini4wd-auth-test` as a substitute. Do not apply any migration/RLS change until step 13 is recorded.
- If any step fails, stop and send the sanitized error text (no host/password).

## Known assumptions to verify on first run
- Docker image tag `supabase/postgres:17.6.1.155` may not exist → set `SUPABASE_PG_IMAGE` to a nearby 17.x tag.
- **Strict stop gate:** the local rehearsal now fails on managed Auth/Storage SQL errors or mismatched counts (including Auth, Storage and migration tables). A version mismatch is a blocker to resolve, not a passing backup. Even matching counts alone do not validate Auth sign-in, role/config settings or actual Storage files; complete manual configuration/recovery checklist.
- Pooler may require user `postgres.<ref>` (default in scripts).

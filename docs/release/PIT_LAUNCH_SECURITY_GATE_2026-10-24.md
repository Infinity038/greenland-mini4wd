# Prediction Pit / GM4WD — security gate checkpoint (24 October 2026)
Status: READ-ONLY AUDIT, not a release authorization. The exact production revision and database state must be rechecked before any further action.

## Confirmed connected environments
- GM4WD website: Vercel project `greenland-mini4wd`, Supabase project `greenland-mini4wd`.
- Pit: separate Vercel project `prediction-pit-preview` and Supabase project `prediction-pit-preview`.
- The archived Oct 21–22 CLI Vercel Pit deployments contain a recoverable source file tree. This is **reference source**, NOT the latest Oct 24 local-only SSO branch and must not overwrite that branch.
- Pit is still behind Vercel Authentication. Never change that protection without the complete replacement auth and negative tests.

## Shipping state
- Navigation-only PR #20 was merged to GM4WD main as commit `3313916e`; Vercel production build reported READY. Former missing operator/access routes are intentionally displayed as Pending labels.
- This is not an SSO release and does not grant game access. The local Oct 24 SSO code was NOT pushed by PR #20.
- Pit database does not have the locally proposed SQL 40/41 GM4WD handoff/owner-link objects. No hosted schema changes were authorized here.
- Owner's existing Pit account, wallet, ledger and history must be preserved; never join accounts merely by email or issue new wallets to existing identities.

## GM4WD P4 security audit — read only
Live metadata at checkpoint:
- `public.members`: RLS OFF, anonymous SELECT and INSERT still allowed, with `password_hash` among the columns. **Security exposure remains.**
- P4_01's limited revocation already in place: anonymous UPDATE/DELETE/TRUNCATE are unavailable; authenticated DELETE/TRUNCATE unavailable.
- Six production `club_*` / rate-limit functions present, one staff role assigned; data counts were read but no personal rows or hashes were inspected.
- Run repeatable metadata-only script `scripts/security/P4_members_READ_ONLY_audit.sql`. This performs SELECT only and prints no user rows, email addresses, hashes, or credentials.

## Next gate; do not skip
1. Preserve an independently verified fresh production backup and tested restore/rollback. An older restore rehearsal noted strict storage grant/owner mismatches; do not call it an unqualified PASS.
2. Complete the production P3 functional checks in `docs/release/RELEASE_RUNBOOK_members_security.md`: actual controlled owner login and admin pages, synthetic register/login/profile/logout, production write-path checks on **synthetic records only**, and pre/post table counts. Do not use real member records to test.
3. Only then execute the already-authored `supabase/release/P4_02_r4_r5_lockdown.sql` as one transaction. **Never execute R4 on its own.** Do not reapply the already-completed P4_01 merely to advance a checklist.
4. Verify signed-out denial of reads, inserts, updates and deletes on members (including password_hash), member login/registration, owner admin, non-admin denial, old sessions, no data mutation, and existing app functionality. Roll back with the existing runbook if necessary. Then schedule R6 for the other exposed public tables and security-definer view.
5. After P4, review and import the latest local GM4WD SSO source into an isolated branch. The older Vercel source tree is useful for comparison only. Perform authenticated-club backport tests, Pit backup, SQL40/41 review and rollout, signing keys, owner-link preservation, and end-to-end access/revocation tests before unprotecting the Pit host.
6. No gameplay integration/live betting release, balance reseeding, member import, migration, Vercel Authentication removal, or alteration of MCL economics is included in this checkpoint.

### Principles
Fail closed; never implement auth bypasses or public Pit signup as shortcuts. The released GM4WD dashboard must not advertise a working Host link until the real authenticated route and owner link exist.

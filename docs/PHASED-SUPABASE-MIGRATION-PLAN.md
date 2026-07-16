# Phased Supabase Migration Plan — Greenland Mini4WD

Proposal only. Nothing in this document has been applied. No SQL beyond
`SELECT` has been executed against the live project. No schema, data,
authentication, or RLS has been changed. Every phase's actual forward/
rollback SQL lives in `supabase/migrations-proposed/phaseN_..._forward.sql` /
`..._rollback.sql`, each opening with `DO NOT RUN — REVIEWED PROPOSAL ONLY`
and its own prerequisites/code-dependencies/backfill/testing/verification/
risks/stop-conditions/rollback-triggers. This document is the narrative
overview; the SQL files are the source of truth for exact statements.

Background: `docs/LIVE-SCHEMA-SECURITY-AUDIT.md` (what exists today),
`docs/MEMBER-AUTH-MIGRATION-PLAN.md` (bcrypt → Supabase Auth detail),
`docs/RLS-POLICY-MATRIX.md` (target-state policy table),
`docs/PRE-MIGRATION-BACKUP-AND-VALIDATION.md` (procedure every phase must
follow before touching the live project).

## Architecture decision

**Supabase Auth is the target authentication system for both racers and
staff — one account system, not two.** Staff are simply `auth.users` rows
with a row in the new `staff_roles` table; racers are `auth.users` rows
linked from `members.auth_user_id`. No new custom password/session system is
introduced anywhere in this plan. The client-side `mini4wd2026` check and the
bcrypt/localStorage member system are both fully removed (Phases 1, 2, 4),
replaced by `supabase.auth.signInWithPassword()` + server-verified sessions +
role-checked RLS (`auth.uid()`, `has_staff_role()`, `is_admin()`).

## Phase 0 — Immediate containment (no schema change)

No RLS is enabled here — enabling it blindly, before Phase 1-3 exist, would
instantly deny every anon/authenticated read across the whole site (see
`phase0_containment_forward.sql`). Containment at this stage is necessarily
narrow and code-level, not schema-level.

| Table | Current exposure | App dependency today | Would immediate RLS break Prod? | Required code prep | Temporary containment | Permanent policy |
|---|---|---|---|---|---|---|
| `members` | anon can read/write every row incl. `password_hash`, email, phone | `lib/member.ts`, `lib/loyalty.ts`, `app/orders/page.tsx`, `app/admin/members/page.tsx` all `select('*')` | Yes — every page reading a member would return empty | Stop selecting `password_hash` explicitly (drop `select('*')` → named columns) in the 4 call sites above | Code-only column-list fix (no RLS yet) | Phase 3 Group B (`members read own row` / `staff read all members`) |
| `admin_config` | anon can read/write both feature-flag keys | none confirmed reading it client-side beyond feature-flag checks | Low risk either way — only 2 non-secret keys | none required | Could enable RLS now with a temporary "authenticated read, no write" policy, but simplest to wait for Phase 3 Group D (`is_admin()`) so it isn't done twice | Phase 3 Group D |
| `orders` | anon can read/write/delete every order, incl. `payment_status`, `admin_notes` | `lib/member.ts` (`getMemberOrdersFromSupabase`), `app/orders/page.tsx`, every `app/admin/orders` page | Yes | Confirm no page relies on writing `status`/`payment_status` directly from the client before Phase 3 removes that ability | none safe before Phase 1-3 | Phase 3 Group B + C |
| `payment_proofs` | anon can read/write every payment proof, incl. `reviewed_by` | `app/admin/orders` (review flow) | Yes | none beyond Phase 3 readiness | none safe before Phase 1-3 | Phase 3 Group B + C |
| `points_transactions` | anon can insert arbitrary point grants for any member | not currently written directly by client code (checked) | Low — nothing writes it today, so RLS here alone wouldn't break a page, but doing it in isolation still risks missing a read path | none | Could restrict `INSERT`/`UPDATE`/`DELETE` for `anon`/`authenticated` right now via a narrow `REVOKE`, independent of full RLS rollout, since nothing currently needs write access to this table from the client | Phase 3 Group B (read-only) + Phase 8 (ledger functions are the only writer) |
| `discount_code_redemptions` | anon can read/write every redemption record | not currently read/written by any confirmed client code path | Low | Confirm no hidden caller before restricting | Could restrict now (see `points_transactions` note) | Phase 3 Group D |
| `referrals` | anon can read every referrer/referred email pair and forge `reward_given` | `lib/member.ts` (`getReferralStats`) | Yes for reads | none beyond Phase 3 readiness | none safe before Phase 1-3 | Phase 3 Group B (read-only) |
| `profile_edit_requests` | anon can read/write every pending name/avatar change request | `app/admin/profile-requests` | Yes | none beyond Phase 3 readiness | none safe before Phase 1-3 | Phase 3 Group B + C |
| Tables with phone/email but not yet listed above (`cars`, `race_tickets`, `tickets`, `rsvps`, `wishlist`, `preorders`) | same blanket anon read/write exposure via `member_email` | various member-facing pages | Yes | none beyond Phase 3 readiness | none safe before Phase 1-3 | Phase 3 Group B + C |

**Bottom line for Phase 0:** the only containment action that is both safe
and immediately available, without any of Phase 1-3, is the code-only fix to
stop selecting `password_hash` in the 4 call sites listed for `members`, plus
optionally revoking write privileges (not full RLS) on the two ledger-style
tables nothing currently writes to (`points_transactions`,
`discount_code_redemptions`). Everything else genuinely needs Phase 1-3 to
land together, in order, on a branch first — see
`docs/PRE-MIGRATION-BACKUP-AND-VALIDATION.md`.

## Phase 1 — Supabase Auth foundation

Adds `members.auth_user_id`, migrates the 7 live members to real
`auth.users` accounts via Path A (bcrypt-compatible, password preserved) or
Path B (invite/reset), per `docs/MEMBER-AUTH-MIGRATION-PLAN.md`. Full SQL:
`phase1_auth_foundation_forward.sql` / `_rollback.sql`.

## Phase 2 — Staff roles and role-checking helpers

Adds `staff_role` enum, `staff_roles` table, `has_staff_role()`, `is_admin()`
— all default-deny (RLS enabled, zero policies) until Phase 3. One bootstrap
admin is inserted manually, outside the transaction, with a real
`auth.users.id` — never baked into a committed file. Full SQL:
`phase2_staff_roles_forward.sql` / `_rollback.sql`.

## Phase 3 — RLS policies, table group by table group

Implements all four groups from `docs/RLS-POLICY-MATRIX.md` (A: public
read-only, B: racer-owned, C: staff-managed, D: admin-only) across all 29
tables plus the `season_standings` view fix (removes `SECURITY DEFINER`).
This is the highest-blast-radius phase in the whole plan — apply group by
group on a branch, never all at once against Production untested, even
though it's captured as one reviewed file. Full SQL:
`phase3_rls_policies_forward.sql` / `_rollback.sql`.

## Phase 4 — Remove hardcoded admin password and client-side admin auth

Mostly a code change (delete `mini4wd2026` from 17 files, delete
`localStorage.adminSession`, rebuild `/admin/login` on
`supabase.auth.signInWithPassword`, fix `middleware.ts`'s blanket `/admin`
exemption) — the real security boundary was already established in Phase 3;
this phase deletes the now-decorative old one and adds a defense-in-depth
`REVOKE`/`GRANT` on the admin-only tables. Full SQL:
`phase4_remove_hardcoded_admin_forward.sql` / `_rollback.sql`.

## Phase 5 — Racer IDs, profile pictures, QR identity, physical cards

Adds `members.racer_id` (`G4W-R-1001...`, offset to avoid colliding with the
Preview-only mock constant `G4W-R-0047`), `members.qr_token` (rotatable
bearer credential for the physical/digital QR), and a `racer_cards` table for
issuance/revocation history. Profile pictures reuse the existing
`members.avatar_url` — no new column needed. Full SQL:
`phase5_racer_identity_qr_forward.sql` / `_rollback.sql`.

## Phase 6 — Club Car IDs and car QR records

Mirrors Phase 5's pattern on `cars`: `club_car_id`, `qr_token`,
`rotate_car_qr_token()`. Full SQL: `phase6_club_car_qr_forward.sql` /
`_rollback.sql`.

## Phase 7 — POS sales, sale items, payment confirmation, audit logs

New `pos_sales`, `pos_sale_items`, `audit_log` tables and
`log_admin_action()` — the first real (non-mock) backing store for the POS
terminal already built in this branch. `audit_log` is append-only at the RLS
layer (no UPDATE/DELETE policy for anyone, including admin). Full SQL:
`phase7_pos_sales_audit_forward.sql` / `_rollback.sql`.

## Phase 8 — Append-only Loyalty Points and Shop Credit ledgers

Adds the missing `shop_credit` / `shop_credit_transactions` tables (no live
equivalent exists today) and 4 ledger functions
(`award_points`/`redeem_points`/`add_shop_credit`/`redeem_shop_credit`), then
**tightens** Phase 3's original blanket admin policy on `loyalty_points` down
to read-only — even admin can no longer directly `UPDATE` a balance once
this phase ships; every balance change must go through a ledger function.
Full SQL: `phase8_loyalty_shopcredit_ledger_forward.sql` / `_rollback.sql`.

## Phase 9 — Inventory deduction only after confirmed payment

Builds on the already-existing, still-unapplied
`supabase/migrations/20260715_bmax_catalog_and_inventory.sql` (its
`reserve_order_inventory()`/`release_order_inventory()` RPCs), adding a
trigger that calls them automatically when `orders.payment_status` actually
transitions, and revoking the direct client `EXECUTE` grant that migration
had left open. Full SQL: `phase9_inventory_after_payment_forward.sql` /
`_rollback.sql`.

## Phase 10 — Race Check-In, event payments, official results, leaderboard

Adds `race_entries.checked_in_at`/`checked_in_by` + `check_in_racer()`, and
`race_results.recorded_by` + `record_race_result()` for accountability. The
leaderboard (`season_standings`) was already fixed in Phase 3. Full SQL:
`phase10_race_checkin_results_forward.sql` / `_rollback.sql`.

## Phase 11 — Supabase Storage buckets and image migration

Creates 4 buckets (`product-images`, `gallery-images`, `car-images`,
`avatars`) with public-read/staff-or-owner-write policies. Does **not**
migrate existing Cloudinary URLs — that is a separate data-movement script
(fetch + re-upload + only then update the column), never a blind
overwrite. Full SQL: `phase11_storage_buckets_forward.sql` /
`_rollback.sql`.

## Phase 12 — Preserve and deprecate legacy ticket/membership-day systems

Freezes new writes to `tickets`/`race_tickets`/`ticket_transactions` and
flags `members.membership_expires_at` as legacy, once Phase 10's Race
Check-In model is confirmed live — **never deletes a row**, only marks
(`deprecated_at`, table/column comments) and narrows write access to
admin-only for historical corrections. Full SQL:
`phase12_legacy_deprecation_forward.sql` / `_rollback.sql`.

## Sequencing dependency graph

```
Phase 0 (containment, code-only)
   │
Phase 1 (Auth) → Phase 2 (staff_roles) → Phase 3 (RLS, all groups)
                                             │
                              ┌──────────────┼───────────────┐
                              ▼              ▼               ▼
                        Phase 4 (kill    Phase 5 (racer   Phase 6 (car
                        hardcoded pw)     ID/QR/cards)     ID/QR)
                                             │               │
                                             └───────┬───────┘
                                                      ▼
                                              Phase 7 (POS/audit)
                                                      │
                                                      ▼
                                    Phase 8 (ledgers) → Phase 9 (inventory)
                                                      │
                                                      ▼
                                              Phase 10 (check-in/results)
                                                      │
                                    ┌─────────────────┴─────────────────┐
                                    ▼                                   ▼
                        Phase 11 (storage/images)          Phase 12 (legacy deprecation)
```

Phase 12 explicitly waits until after Phase 10, since it depends on Race
Check-In being the confirmed, live replacement before legacy ticket writes
are frozen.

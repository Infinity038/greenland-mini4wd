# Policy matrix and negative test gate — DRAFT; no production SQL

**No generic allow-all SELECT or write policy may be used to preserve compatibility.** Every current browser query in source must be classified as public, member-self or authorized staff. For 29 public tables with RLS off, each cutover requires corresponding server/client changes and a deliberate policy. These groups are proposed, not verified customer-facing permissions.

| Data | Proposed anonymous access | Verified member | Staff/Admin |
|---|---|---|---|
| members | NO base-table SELECT, especially password_hash; public summary via explicit safe fields/view only if required | Self read/update of vetted fields through auth_user_id with server checks | Role-scoped directory; no password hashes returned |
| cars | Public approved-car directory via projection only; NO direct writes | Own cars, keyed to member UUID after ownership migration | Approve/reject via verified staff endpoint |
| tournaments/events/seasons/leaderboard | Public published subset via read-only projection, not blanket table access | Same public projection + own entry state | Role-scoped updates; verify standings view security_invoker or explicit safe projection |
| orders/payment_proofs/preorders | No listing or arbitrary write; explicit public request handler only where business requires | Own records only; private proof upload bound to auth.uid | Verified payment desk and separate proofs, atomic/idempotent reward status |
| tickets/race_tickets/race_entries | Public event counts only via safe aggregate, not participant/customer financial records | Own ticket/entry records only | Registration/check-in roles with server-side transaction |
| loyalty_points/points_transactions/referrals/wishlist | No base-table anonymous access | Only own account / referrals with privacy-limited fields | Exact per-role RPC grants, audit trail |
| race_results/hall_of_fame | Sanitized public verified outcome/season view | Public plus private self detail as needed | Authorized marshal/admin write, with idempotency |
| admin_config/discount_codes/shop_inventory/products | Public catalog via safe view/columns only; never inventory writes, secret discounts or control data | Normal catalog/checkout endpoints | Per-role server mutations; no anon table writes |
| gallery_items/news_posts/signups/rsvps/product_inquiries | Published content read-only as applicable, explicitly restricted submissions through rate-limited functions/handlers | Own submissions where applicable | Relevant staff approval functions |
| staff_roles | No table grants; existing admin helper only with verified Auth | No role writes | Owner only, audited |
| Prediction Pit (future) | Nothing | Server-verified allowlist, own virtual ledger/picks only | Owner host controls; no paid ticket or loyalty mutations |

## Required tests before any RLS/grant change
- Existing legacy registration/login works **before** cutover; secure email flow and verified member linking work in isolated preview and staging; **after** cutover legacy password login is disabled, not allowed to fall back to anon password_hash read.
- New and legacy existing members are not duplicated. Confirm any ambiguous, missing or reused email is manually reviewed.
- Under direct PostgREST anonymous access, base `members.password_hash` is denied; `members`, `orders`, `loyalty_points`, `race_tickets`, `race_results`, `cars` cannot be listed, inserted, updated, deleted or truncated arbitrarily.
- Staff member listing, ticket confirmation, car approval, event editing, result entry and single payment/reward desk remain functional through authenticated role authorization; test failure injection and idempotency to avoid duplicate points or partially applied payments.
- Published catalog, event list, season leaderboard, news/gallery and approved car gallery remain visible logged out through vetted public data projections.
- Logged-in member A cannot read or mutate member B by guessed UUID, email or crafted localStorage/cookie.
- Unauthorized, revoked, tampered-token and anonymous access to Prediction Pit all denied independently at route, RPC and RLS levels.
- No real-money entry fee/prize/loyalty/history automatically adjusted by virtual prediction-game operations.
- Confirm Supabase lint after changes. Relevant docs: https://supabase.com/docs/guides/database/database-linter?lint=0013_rls_disabled_in_public and https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view.

## Operational rollback
- A verified **restorable** database backup/recovery point precedes the transaction. Record actual Vercel production SHA and migration version.
- Roll back the *application* only if its old data paths are still compatible with the new permissions; otherwise use a separately reviewed compatibility/rollback release. Do not simply open broad anon access to restore convenience.
- Any proposed SQL rollback must restore **exact captured grants and policies**, not guessed defaults, and require incident acknowledgement. Restore database only following owner authorization and expert recovery plan; check payments created after snapshot before restoring.
- Keep new Auth links reversible by a separate audited procedure; never mass-reset/delete members or email identities as a rollback shortcut.

**Approval gates:** production Supabase identity confirmed, real backup evidenced, migration SQL reviewed against live schema, isolated rehearsal passed, owner approves defined maintenance/cutover window.

# Private Prediction Pit — isolated integration gate (2026-10-16)

Status: **DRAFT; NOT RELEASED**. Source baseline main \`ad685af6f5c685d5bc1fe68ce1426ae4e49db85f\`. No production deployment, migration, customer-wallet edit or existing official-result edit authorized by this branch.

## Owner-approved UX
- Same Greenland Mini4WD site and brand, separate **Prediction Pit** tab in desktop/mobile navbar, never public navigation/sitemap. Only show it if the signed-in person's Supabase Auth identity passes \`prediction_pit_allowed()\`. Administrative access is implicit for authenticated owner-admin; anyone else is explicitly opted in/out by the admin's checkbox. Unapproved/anonymous direct page URL returns 404.
- Admin-only **Prediction Pit Access** module shows existing member list, checkbox, whether a member is securely linked to an Auth account. Revocation takes effect on next request, not just at next sign-in. Every change audited.
- The local \`gm4wd_registered\` cookie / \`gm4wd_member\` localStorage and email supplied by browser are NOT credentials for private access. Existing \`app/register/page.tsx\` currently uses a browser-side password comparison; before a mobile launch, migrate/link approved customers to a proper, verified Supabase Auth session. Never use client-side member ID/email as authority.
- Proposed schema stays under \`migrations-proposed\` pending live schema, RLS and rollback review. Missing migration or missing Auth mapping must FAIL CLOSED, not display the tab or data.

## Data model and ranking boundaries
- Existing public \`members.id\`, \`cars.id\` / \`cars.member_email\`, \`tournaments.id\`, \`race_entries\`, \`race_results\`, \`season_standings\` remain authoritative for official club identity and competition. Reconcile ownership using member IDs after live schema inspection; do not trust merely matching text.
- Dedicated private tables for virtual wallet ledger, player prediction slips, immutable accepted odds, market state, host settlement, idempotency, tournament ticket **references** and ownership mappings. Never use/modify the existing race-fee, monetary prize, loyalty, membership expiry or official season-point balances in virtual-coin transactions.
- Official verified race results may inform a READ-ONLY odds input and historical profile. Prediction Pit cannot auto-publish official wins, standings, prizes, hall-of-fame or paid-ticket debits. Official result recording happens once in existing approved race-results workflow; prevent double counting.
- Public leaderboard shows verified racer and car performance by existing rules. Authorized accounts additionally see a separate **4W Prediction Leaderboard** (virtual win rate/virtual points; private only); public visitors never see private wallet data.
- Reuse v3 feature parity: racer owns multiple registered cars, per-event ticket allowance; one person can enter up to allowed number of distinct cars; schedule events in advance; multiple distinct car picks per player and heat; after open, grid/market frozen; until lock, predictions remain open; accepted odds immutable; on verified settlement losers lose stake and winner returns include stake; void fully refunds pending stakes. No auto-grants and no arbitrary stake cap beyond positive integer available balance. Host grants/debits require reason and immutable ledger.
- Keep entries/official tickets separate from private prediction-pit permissions. Never present private virtual coins as cash, monetary rewards or official club prize entitlements.

## Production blockers
1. The actual Greenland Mini4WD Supabase project is absent from the currently connected Supabase account; no live schema or RLS verified. Never reuse ace-os or STRAKS projects.
2. Current customer sign-in uses a local cookie and client password comparison. Approved members need server-verifiable Supabase Auth identities and vetted linking/migration before granting Prediction Pit access.
3. Need live-data check for car IDs and ownership, race-results ingestion, official standings anomalies and paid-ticket reconciliation; source-based audit warns of ongoing mismatches.
4. Stage migration in correct project after backup/review; verify default deny, anonymous, tampered cookie, unauthorized RPC, approved/revoked users, admin, concurrency, atomic wallet transfers and no official ranking side effects. Run phone-browser e2e under HTTPS.
5. Preserve the previous standalone v3 \`private/state.json\`; import only explicitly verified identities/history with audit, never overwrite existing online member or car records.

## Activation checklist
- [ ] Connect verified owning Supabase project and inspect live schema/access
- [ ] Resolve/link member Auth and test same user on phone
- [ ] Approve and apply proposed access SQL (or reconcile to actual schema)
- [ ] Add virtual wallet and gameplay transactional RPCs + RLS and e2e tests
- [ ] Connect read-only verified racer/car stats; private prediction ranking
- [ ] Verify responsive phone UX, QR/invite flow, authorization and revocation
- [ ] Owner reviews isolated Vercel preview before any main/production deployment

This initial branch deliberately only implements the secure access foundation and reserved route; it does **not** represent a playable online multiplayer game.

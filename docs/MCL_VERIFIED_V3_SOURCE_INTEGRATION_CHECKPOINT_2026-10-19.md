# Legacy Prediction Room v3 source inspected — MCL integration checkpoint (2026-10-19)

## Evidence and identity
User uploaded `GREENLAND_MINI4WD_PREDICTION_APP_MCL_SOURCE_HANDOVER_2026-10-19(1).zip`. The preserved embedded original `Arctic_Mini4WD_Private_Prediction_Room_v3.zip` has SHA-256 `463ea51b01005957c13341b2307970622cbdc0becccaa4e993bcdb6b1a166156`. This is verified historical LAN v3 source, **not independently verified as the newest separate Betting App 2**. Its Node.js server uses `private/state.json` and `player.balance`, the shared `wallet()` ledger helper, manual organizer grants/debits, mini4wd race entries and settlement. `private/` in the handover has only `.keep`. No current user wallets/credentials provided.

MCL PR #18 is Next.js/Supabase **read-only draft** stacked on PR #14. PR #17 Auth/RLS and recoverable backup gate remains on HOLD; no production migration, merge or deployment approved. Do not transplant LAN password/room-PIN security or JSON persistence directly into hosted code.

## Separately packaged working LAN derivative
Within the current conversation, a new throwaway **Unified Prediction Pit v3 + MCL LAN development ZIP** was generated from a COPY of original v3 source. Exact final ZIP SHA-256 `f09c29402b9adac7ac4a76b5de70bdc2c1aaf6541bbe31371860e0701f35ea93`, 42 file entries, 89,829 bytes; no state.json, first-run credentials or .env. It is NOT an available GitHub repository revision and should not be inferred to be present in another session; obtain it from the user/conversation upload before further edits.

Prototype source includes:
- original v3 mini4wd server/UI and wallet, plus `mcl.js`, `public/mcl.html`, `mcl-app.js`, `mcl.css`, an authenticated navigation link, and reusable old host/player session in the LAN copy;
- season setup for six paint/numbered color families (default 24), 10 matchdays / 40 regular six-marble races, 6–1 standings, Top 12 playoff A/B then Top 6 final, player-private views, limited host-only streams (HTTPS YouTube/Facebook), manual and server-timestamp race locks, six-unique-finish result confirmation, replay rejection, player quote-before-acceptance, same original wallet debits/credits;
- per-market 60/40 virtual pool funding and settlement: preseason champion up to x8 with 4/2/1 published entry-weight windows, race winner up to x2, exact place up to x3. Payout ceilings are NOT guaranteed starting quotes; pooled correct returns can be less than contribution. Preseason cancellation returns floor(90%) of stake with separate fee ledger. No automatic prize carryover. Manual locking of any first race also closes preseason champion selections.
- 7/7 Node tests passed: legacy host/wallet smoke, draw/points/private response, one/multiple/no winner bounded payouts, a full synthetic host-player API flow demonstrating one wallet (host 1,000-coin grant → MCL 100 selection → 90 refund → two 100-coin race stakes → two funded 40-coin credits), lock and duplicate-settlement rejection.

Limitations: LAN only, old JSON ledger remains bounded and not ACID/durable multi-process; no hosted session/RLS, current real balance import, sportsbook guaranteed odds, dynamic cash-out, settled-result correction/void/tie-break control, Savings Vault, debt credit or 50K Challenge. Don't present as a verified public/private HTTPS deployment or overwrite active historical `private/state.json` with empty source. Legal/charitable support, if any, separate from non-redeemable virtual coin play.

## Hosted next step
1. Preserve PR #18 as review-only and use legacy v3 wallet semantics as a migration reference only.
2. Obtain/verify any NEWER Betting App 2 canonical source; otherwise propose the secure hosted wallet backed by one authenticated, append-only 4W ledger, never two balances. Map Mini4WD and MCL into the same ledger.
3. Before activation, complete PR #17 recoverable backup/Auth/RLS review; PR #14 allowlist authorization; port MCL domain and v3 Mini4WD gameplay under authenticated, transactionally idempotent server RPCs with separate markets and account-level privacy.
4. Add savings/credit and 50K only after approval, tied to canonical available balance and debt obligations without silently spending vault deposits.
5. Test a staged phone-browser preview and 50 concurrent synthetic players, no winner, multiple winners, exhausted prize pool, cutoff clock, duplicate confirmation, cancellation and private-data leakage. Secure rollback/void/correction before any real virtual wallet migration or release.

No production site, Supabase, paid Mini4WD ticket, user wallet, PR #14 or PR #17 was changed by this checkpoint.

# Prediction Pit P0 — Owner-approved launch policy
**Decision date:** 2026-10-24 (Nuuk)
**Source:** Explicit owner approval communicated to the Prediction Pit coordinating assistant.
**Scope:** Private invite-only launch of existing MCL and Mini4WD only; virtual 4W (not purchasable, transferable for money, or redeemable). This file is a requirements record, **not approval to run a database migration, enable markets, bypass SSO, or deploy untested changes**.

## Approved Tier 1 parameters

| Mode | Per accepted ticket | Aggregated participant cap |
| --- | ---: | ---: |
| MCL race Winner | 50 4W | 100 4W total across Winner **and** Exact within the same race |
| MCL Exact finishing position | 50 4W | Same 100 4W combined per player/race |
| MCL preseason Champion | 25 4W | 100 4W total per player/season |
| Mini4WD Winner | 25 4W | 100 4W total per player/heat |
| Mini4WD Top-3 | 25 4W | Same 100 4W total per player/heat |

**Operator reserve:** initial **30,000 4W** central operator reserve, Tier 1. No automatic tier upgrade. The owner must approve any future tier change separately.

**Shared maximum net downside:** **1,000 4W per physical event** and **3,000 4W across all unsettled physical events**. Always enforce lower real available capacity when constrained; these are ceilings, not guarantees. Gross promised Mini4WD payouts, organizer-void refundable accepted stakes, settled operator reserve, pending/unsettled liabilities and spendable player wallet balances remain distinct. A player stake is **not** recognized as settled operator profit before official settlement. MCL markets remain separately **60% operator / 40% funded prize pot per market**, subject to the approved 8× champion, 2× Winner, 3× Exact conditional individual caps and 4/2/1 accepted early-weight rules. This reserve does not replace a missing MCL prize pot.

## Approved settlement and cancellation rules

1. **Organizer-caused voids:** refund 100% of accepted stakes once, preserve the original immutable accepted ticket and correction/refund ledger; do **not** apply the 10% voluntary preseason MCL champion cancellation deduction.
2. **Official race interruptions, ambiguous results, ties or DSQ:** mark Under Review, prevent downstream advancement/settlement, require official evidence and declared race rules. If a valid unambiguous result is impossible, void and refund. No undocumented hindsight tiebreaker.
3. **Official result corrections:** documented reason and evidence; pre-settlement changes permitted through an auditable restricted process. Post-settlement changes require **owner-only** controlled reversal/reconciliation with compensating ledger records, never deletion or mutation of settled ledger rows or double-crediting. If the capability is not implemented/tested, stop and resolve manually with markets closed.
4. **Unclaimed MCL champion prize allocation:** separately recorded and auditable; **allocate to operator only after official championship-market settlement**, with no automatic rollover. The public game terms must disclose this before champion predictions open. Before that settlement, the unclaimed balance is neither freely available operator profit nor committed future rollover.
5. **All ticket acceptance, locking, voids, and payouts:** server-authoritative deadlines, permission checks, atomic stake debit and liability guard, idempotency, replay protection, one shared virtual wallet and no player visibility into others' stake totals.

## Non-negotiable pre-launch gates

- Verified recoverable backup and qualified restore rehearsal for the existing affected projects; no Seagate G: archive disk use.
- Production Greenland Mini4WD `public.members` hardening and live P3 registration/login/owner/staff tests; no anonymous member-data reads/writes.
- Approved GM4WD member identity and one-time verified server-side Pit handoff; no unrelated registration or wallet reset; players 18+ with verified invite permission.
- Authoritative operator controls and complete supported MCL/Mini4WD lifecycle, true 43-race championship integrity, and new independent season rather than rewriting the currently inconsistent historical season.
- **Database-transaction-enforced** Tier 1 caps across simultaneous requests, immutable accepted Mini4WD odds, guaranteed worst-case gross payout capacity and exactly-once settlement/void reversal.
- Validate ledger invariants, historical record counts, concurrent duplicate tickets, rollback on exception, insufficient balance, adversarial role checks and result correction policies.
- Legal/platform suitability and physical livestream operating requirements.
- No newly invented Arcade games, no public wallet-connected release from draft-only code.

## Current status (as of owner's decision)
Owner-policy approvals: **COMPLETE** for the parameters and settlement rules listed above.

Engineering verification and authorization to activate new wallet-connected predictions: **NOT COMPLETE**. The standalone Vercel-hosted Pit remains protected. Implement via isolated review branches and disposable QA first; do not assume any previously approved number is already enforced by the live PostgreSQL functions.

**Source conflicts:** the latest explicit owner decision above supersedes earlier *proposed* limits. Preserve historical LAN work for reference only; current hosted source/DB is authoritative for what is actually implemented.

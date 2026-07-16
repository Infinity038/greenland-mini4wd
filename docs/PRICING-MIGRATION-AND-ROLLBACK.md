# Pricing/Campaign Migration & Rollback

Continues `docs/PHASED-SUPABASE-MIGRATION-PLAN.md` (Phases 0-12) with three
new phases implementing catalog pricing, freight, the sale campaign engine,
and boxed-kit/club-asset sales. Same conventions: every SQL file opens with
`DO NOT RUN — REVIEWED PROPOSAL ONLY`, nothing has been applied, and every
phase requires Phase 1-3 (Auth, staff roles, RLS foundation) to already be
live first.

## Phase 13 — Catalog pricing & freight

`supabase/migrations-proposed/phase13_catalog_pricing_freight_forward.sql` /
`_rollback.sql`.

Adds cost/pricing columns to `products` (supplier cost, currency, exchange
rate snapshot, shipping class + override, landed cost, minimum retail,
approved regular price, `pricing_source`), a `shipping_class` and
`pricing_source` enum, an `inventory_receipts` table (drives inventory-age
targeting), and a single `pricing_audit_events` table + `log_pricing_audit_event()`
function serving both "price history" and "campaign audit" — one concept,
not two duplicated tables. A `BEFORE UPDATE` trigger enforces Admin-only
changes to the cost/rate/shipping/approved-price columns (Postgres
GRANT/REVOKE can't distinguish Admin from Shop Manager, both are the
`authenticated` role — see `docs/PRICING-ADMIN-PERMISSIONS.md`). A CHECK
constraint blocks `available = true` on any product with an unverified
price. **Stop condition**: any live product already has `available = true`
with an unverified price at apply-time — none do today (verified: all 14
live products have `available = false`), but re-verify immediately before
applying since new products may have been added since this audit.

## Phase 14 — Sale campaign engine

`supabase/migrations-proposed/phase14_sale_campaigns_forward.sql` /
`_rollback.sql`.

Adds the `shop_manager` staff role (a new `ALTER TYPE ... ADD VALUE`,
necessarily run and committed *before* the rest of the phase's transaction —
Postgres cannot add and use a new enum value in the same transaction), plus
`sale_campaigns`, `sale_campaign_scopes`, `sale_campaign_exclusions` (scope/
exclusion rules stored as one row per rule, `rule_kind` + `rule_data jsonb`,
mirroring `lib/pricing/campaign.ts`'s `ScopeRule`/`ExclusionRule`
discriminated unions — flexible without a schema change every time a new
targeting rule is added). RLS: Shop Manager may only insert/update their own
`standard_sale` campaigns at ≥40% margin with no below-cost override; Admin
unrestricted; Viewer read-only. A narrow `active_campaign_display` view
(intentionally *not* `security_invoker` — the opposite fix from Phase 3's
`season_standings`, and deliberate here: it is the sanctioned way to expose
a safe, narrow column subset of an otherwise staff-only table to the public
storefront) exposes only name/type/discount/badge/description/end-date for
`enabled = true` campaigns currently in their date window.

**Rollback limitation**: PostgreSQL cannot remove a value from an ENUM type.
The rollback file documents this explicitly rather than silently omitting
it — `shop_manager` stays in the `staff_role` enum after rollback (harmless
with zero rows referencing it; a full type-recreation is out of scope for a
routine rollback).

## Phase 15 — Boxed-kit sales, service add-ons, club assets

`supabase/migrations-proposed/phase15_boxed_kit_and_club_assets_forward.sql` /
`_rollback.sql`.

Adds `service_addon_price_overrides` (admin-configurable Display Case /
Standard Assembly / Ready-to-Race Assembly pricing, publicly readable) and
`is_club_asset` + conversion-tracking columns on `products`, plus
`convert_product_to_club_asset()` (Admin-only, writes an audit event). A
CHECK constraint enforces a club asset is never `available`. **Reuses**
rather than duplicates: Display Case stock is the pre-existing
`shop_inventory.case_stock` singleton; Boxed Kit stock is the pre-existing
`products.unbuilt_stock` column, reinterpreted via `COMMENT ON COLUMN` (not
renamed — the data doesn't move). The old four-variant columns
(`built_stock`, `unbuilt_price_dkk`, `built_price_dkk`, and their case/
original counterparts) are marked `DEPRECATED` via comment, **not dropped**
— dropping columns on a live table is destructive and unnecessary; a future
cleanup migration may drop them once confirmed unused for a full season, as
its own separate, reviewed change.

## Sequencing

```
Phase 0-3 (Auth, staff_roles, RLS foundation — prerequisite, from the prior plan)
        │
Phase 13 (catalog pricing & freight columns, audit table)
        │
Phase 14 (sale_campaigns, shop_manager role, scopes/exclusions)
        │
Phase 15 (boxed-kit stock reinterpretation, service add-ons, club assets)
```

## General verification (every phase)

Follow `docs/PRE-MIGRATION-BACKUP-AND-VALIDATION.md` in full: apply to a
Supabase branch first, snapshot row counts and RLS/policy state before and
after, smoke-test the affected app pages against the branch, and dry-run the
rollback on the branch before the forward SQL ever touches the live
project. No code in this repository executes any of these files — they are
reviewed proposals awaiting explicit approval, exactly like Phases 0-12.

# Pricing & Campaign Admin — Security, Permissions, Feature Flags

## Current state: Preview-only, mock role, zero live writes

Supabase Auth, staff roles, and RLS are **not live yet**
(`docs/PHASED-SUPABASE-MIGRATION-PLAN.md`, Phases 1-3). Until they are
approved and applied:

- The pricing/campaign admin UI (`app/admin/pricing/`) is a **Server
  Component gated on `process.env.VERCEL_ENV === 'preview'`**, calling
  `notFound()` everywhere else — the exact same pattern already used by
  `app/admin/pos-camera-test` (see that route's own header comment for the
  precedent). It 404s in Production regardless of any feature flag.
  Included in `docs/PRE-PRODUCTION-REMOVAL-CHECKLIST.md`.
- It operates entirely on an in-memory demo catalog
  (`lib/pricing/previewDemoCatalog.ts` — clearly-labeled illustrative data,
  10 real approved car kits + fictional example parts) and an in-memory,
  per-session `PricingAuditLog` (`lib/pricing/auditLog.ts`). **Zero Supabase
  reads or writes** — confirmed by a static-source regression test
  (`app/admin/pricing/page.test.tsx`) asserting no `supabase`
  import/`createClient(` call anywhere in the route.
- The role selector in the UI (Admin / Shop Manager / Viewer) is a
  **Preview-only simulator**, not a security boundary. It exists so the
  permission rules below can be demonstrated and tested before real
  sessions exist.
- **No hardcoded password of any kind** is used anywhere in this feature —
  confirmed by the same static-source test asserting neither `mini4wd2026`
  nor `ADMIN_PASSWORD` appears in the admin client component.

Campaign/pricing **mutation stays disabled in Production** until Auth/RLS
are live; only Preview may demonstrate the full interface, and only against
non-production mock/seeded data.

## Catalog-status / restock admin view (`app/admin/catalog-status/`)

Same gating pattern: a Server Component checking
`process.env.VERCEL_ENV === 'preview'` and calling `notFound()` everywhere
else, confirmed by a static-source test
(`app/admin/catalog-status/page.test.tsx`) asserting no Supabase import, no
hardcoded admin password, and no automatic supplier-order call anywhere in
the route. Unlike the campaign admin UI, it reads the **real curated
catalog** (`lib/pricing/catalogProducts.ts`, the bundled
`catalog/bmax-initial-catalog.json` — not a demo dataset), because that
catalog is itself static/bundled data with no Supabase dependency; it
combines this with the in-memory `restockInterestStore` (also shared with
`/shop`). It is read-only over the catalog and never writes to Supabase or
places a supplier order — it is a planning/visibility tool, not a mutation
surface, so it does not need the Admin/Shop Manager/Viewer role simulator
that the campaign admin UI uses.

## Target-state roles (once Auth/RLS land — Phase 14)

| Role | Capability |
|---|---|
| **Admin** | Full pricing, cost, campaign, and override access |
| **Shop Manager** | Create and manage Standard Sale campaigns within the approved (≥40%) margin floor |
| **Viewer** | Read-only campaign preview |

**Admin-only, no exceptions:**

- change supplier cost
- change exchange-rate snapshots
- change shipping allocations
- change regular margin policy
- create Liquidation campaigns
- use the below-cost override
- modify approved regular prices
- formally approve/activate any campaign (including a Shop Manager's own —
  "manage" covers create/edit/preview; go-live approval is a distinct,
  Admin-only sign-off, matching the locked `approved_by` campaign field)
- convert sale inventory to a club asset

Enforced in two places, kept in sync:

- **Code** (Preview today): `lib/pricing/permissions.ts` — pure functions
  (`canChangeSupplierCost`, `canCreateCampaign`, `canUseBelowCostOverride`,
  `canApproveCampaign`, …), unit-tested and exercised by the admin UI's role
  simulator (`app/admin/pricing/PricingAdminClient.test.tsx`).
- **Database** (once live): `supabase/migrations-proposed/phase13_catalog_pricing_freight_forward.sql`
  (a `BEFORE UPDATE` trigger blocking non-admin changes to cost/rate/
  shipping/approved-price/club-asset columns — Postgres GRANT/REVOKE cannot
  distinguish Admin from Shop Manager since both are the same `authenticated`
  role, so this is enforced with `is_admin()` inside a trigger, not a column
  privilege) and `phase14_sale_campaigns_forward.sql` (RLS policies:
  Shop Manager can only INSERT/UPDATE their own `standard_sale` campaigns at
  ≥40% margin with no below-cost override; Admin can do anything; Viewer is
  read-only).

## Feature flags

Defined in `lib/featureFlags.ts`, all default `false` in every environment:

| Flag | Env var |
|---|---|
| `pricingEngineEnabled` | `NEXT_PUBLIC_PRICING_ENGINE_ENABLED` |
| `saleCampaignsEnabled` | `NEXT_PUBLIC_SALE_CAMPAIGNS_ENABLED` |
| `assemblyServicesEnabled` | `NEXT_PUBLIC_ASSEMBLY_SERVICES_ENABLED` |
| `inventoryAgingEnabled` | `NEXT_PUBLIC_INVENTORY_AGING_ENABLED` |

These flags control whether flag-gated UI pieces render (e.g.
`assemblyServicesEnabled` currently gates the add-on picker on `/shop`) —
they do **not** by themselves expose the admin UI in Production; that gate
is the separate, hard `VERCEL_ENV === 'preview'` check described above.
Flipping a flag to `'true'` in a Production environment variable does not
unlock `/admin/pricing`.

## Audit trail

Every pricing/campaign mutation type is append-only and traceable:
supplier cost changes, exchange-rate changes, shipping-class changes,
landed-cost recalculations, regular-price changes, price overrides,
campaign created/edited/activated/deactivated/approved, margin-floor
override, below-cost override, product exclusion, inventory converted to
club asset. Record shape: actor, timestamp, previous value, new value,
reason, affected product/campaign, source context
(`lib/pricing/auditLog.ts`: `PricingAuditEvent`; live equivalent:
`pricing_audit_events` table + `log_pricing_audit_event()` SECURITY DEFINER
function, Phase 13 — no direct client INSERT/UPDATE/DELETE policy exists on
that table, matching the append-only pattern used by every other
ledger/audit table in this project).

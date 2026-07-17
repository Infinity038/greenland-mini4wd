# Catalog Costing & Freight — 87-Product Catalog

Applies the pricing architecture in `docs/PRODUCT-PRICING-POLICY.md` to the
existing curated catalog (`catalog/bmax-initial-catalog.json` /
`.csv`, 87 items: 21 car kits, 66 upgrade parts). Classification was applied
by the idempotent `scripts/applyApprovedPricing.mjs` script (re-running it
produces identical output) and is locked in by
`catalog/catalogPricing.test.ts`.

## What the script does

1. **Shipping class + part group** — assigned to every one of the 87
   products from existing `category`/`subcategory` fields, invents no
   cost/stock/image data:
   - `category: 'cars'` → `shipping_class: 'complete_car_kit'` (all 21 cars)
   - `subcategory: 'Starter Upgrade Sets'` → `shipping_class: 'bulky_upgrade'` (4 parts)
   - every other part → `shipping_class: 'small_part'` (62 parts)
   - none of the current 66 parts map to `boxed_body_chassis` — no
     subcategory in this catalog represents a boxed body/chassis set today;
     the class exists in the system for when one is added.
   - `part_group` assigned from subcategory: motors (10), rollers (9),
     plates (8), gears/drivetrain (8), wheels/tires (4), brakes/dampers
     (10), screws/spacers (5), bearings (3), starter_upgrade_sets (4),
     accessories (5).
2. **Approved fixed prices** — applied to exactly the 10 unambiguously
   item-number-matched car kits from `docs/PRODUCT-PRICING-POLICY.md` §4,
   at the correct margin floor for each (60% for the 6 explicit Collector
   items, 50% for the other 4). `pricing_source` set to
   `board_approved_fixed_price`, `price_dkk` and
   `approved_regular_price_dkk` set to the approved value.
3. Every other product (77 of 87, including Magnum Saber) keeps
   `pricing_source: 'unverified'`, `approved_regular_price_dkk: null` — **no
   supplier cost is invented**.
4. **`published`/`available`/`stock_qty`/`image_url` are left untouched**
   even for the 10 newly-priced cars — a board-approved price does not
   manufacture real stock-on-hand or approved photography. All 10 remain
   drafts (`published: false`, `stock_qty: 0`) until stock and photos are
   separately confirmed. This is a data-completeness gap, not a pricing
   gap, and is intentional.

## Catalog visibility vs. purchase eligibility (Preview review correction)

**Locked rule (supersedes the original "unverified cost = unpublished"
rule):** catalog visibility and purchase eligibility are separate concerns.

- **Visibility** (`lib/pricing/catalogPricingStatus.ts`:
  `checkCatalogVisibility`) is hidden only for an identity problem: an
  unresolved duplicate item number, an uncertain product edition, an
  internal/test record, or explicit administrator archival. Zero stock, an
  unverified supplier cost, a pending retail price, Expansion Stock
  classification, and Special Order classification are **never**, by
  themselves, a reason to hide a product.
- **Purchase eligibility** (`isPurchasable`) is a separate check: a product
  can be visible and simultaneously not purchasable (out of stock, price
  pending, special order).

Every one of the 87 curated items is currently visible — none has an
unresolved duplicate, uncertain edition, internal/test flag, or admin
archival on file (`has_unresolved_duplicate`, `has_uncertain_edition`,
`is_internal_test_record`, `is_archived_by_admin`, all `false`).

## Public product states

`lib/pricing/publicProductState.ts`: `derivePublicState()` computes one of 7
states at render/query time from `{catalogVisible, pricingSource, stockQty,
catalogTier, isPreorderEnabled, forceComingSoon}` — never stored redundantly.

| State | Customer sees |
|---|---|
| `IN_STOCK` | price, normal Reserve/Buy, stock shown |
| `OUT_OF_STOCK` | last approved price, "OUT OF STOCK" badge, Reserve/Buy disabled, "REQUEST RESTOCK"/"NOTIFY ME" |
| `PREORDER` | approved preorder price where verified, only when explicitly admin-enabled per product |
| `SPECIAL_ORDER` | "SPECIAL ORDER" label, price where verified else "REQUEST PRICE"/"REGISTER INTEREST" — never a fabricated price |
| `PRICE_PENDING` | "PRICE PENDING", no fallback price, checkout/reservation/preorder disabled, restock-interest registration allowed |
| `COMING_SOON` | visible, no checkout until approved |
| `ARCHIVED` | hidden from the public catalog |

`/shop` (`app/shop/page.tsx`) reads the public catalog directly from
`lib/pricing/catalogProducts.ts` (`getPublicCatalogByCategory`), which is the
bundled JSON, not live Supabase — see "Storefront data source" below.

## Stock classification (Core / Expansion / Special Order)

The catalog already carries this via the existing `catalog_tier` field
(`core` / `expansion` / `special_order`) — reused directly rather than
duplicated under a new name.

## Priced car kits (10 of 21)

| Item # | Name | Approved price | Margin floor |
|---|---|---|---|
| 19443 | Diospada Premium | 249 DKK | 60% (Collector — pre-existing) |
| 18704 | Shadow Shark | 299 DKK | 50% |
| 18705 | Flame Astute | 299 DKK | 50% |
| 18099 | Ray Spear | 319 DKK | 50% |
| 19447 | Beak Stinger G | **359 DKK** | 60% (Collector) |
| 19451 | Gun Bluster XTO Premium | **359 DKK** | 60% (Collector) |
| 95126 | Cyclone Magnum Memorial 25th Anniversary | **389 DKK** | 60% (Collector) |
| 95571 | Exflowly Polycarbonate Body Special (Purple) | **389 DKK** | 60% (Collector) |
| 95706 | Geo Glider Asia Challenge 2026 Special | **429 DKK** | 60% (Collector) |
| 92462 | Mach Frame Philippine Cup Special | **469 DKK** | 60% (Collector) |

The six bold prices are the Preview review's Collector-margin correction,
replacing prices an earlier pass calculated at the (incorrect, for a
Collector item) 50% floor — see `docs/PRODUCT-PRICING-POLICY.md`
§"Collector margin" for the formula.

## Unpriced remainder (77 of 87) — unverified, visible with PRICE PENDING

**Locked rule:** an unverified cost no longer means unpublished/hidden. All
77 of these items are publicly visible and display PRICE PENDING; none is
purchasable until a real price is approved.

- **11 other car kits** (Neo-VQS, Cross Spear 01, Mach Frame [plain,
  18714 — distinct from the Philippine Cup Special, 92462], K4 Gambol,
  Aero Avante [plain, 18701], DCR-01, Ignicion, Raikiri, Avante Mk.III Nero,
  Ray Stinger Premium, **Magnum Saber [19431]**): no verified Philippine
  supplier cost on file. Per policy, use verified cost + 80 DKK freight +
  the applicable margin floor once a cost is verified; stay PRICE PENDING
  until then. **Magnum Saber never carries the legacy 339 DKK fallback
  price** — that value belongs to a pre-existing, disconnected live Supabase
  row from before this catalog project and must never be reused as a
  default.
- **66 upgrade parts**: none has a verified supplier cost on file. Same
  fallback rule applies (25/35/50 DKK freight by class + the applicable
  margin floor).

## Named-but-unmatched approvals (documented, not applied to a wrong product)

- **Aero Avante Starter Pack (469 DKK)** — the catalog has only plain "Aero
  Avante" (18701), a different edition/bundle. Not applied to 18701.
- **Aero Thunder Shot Advertising Pack (629 DKK)** — not present in the
  87-item catalog. Previously personal stock; must not auto-publish even if
  added later.
- **Ultra-Dash Motor (129 DKK)** — not present among the catalog's 10 Motors
  entries. Covered as a pure pricing-formula regression test instead — see
  `docs/PRODUCT-PRICING-POLICY.md` §"Approved motor pricing".

## Storefront data source (Preview review — root-cause fix)

`/shop` reads the complete curated catalog directly from the bundled
`catalog/bmax-initial-catalog.json` via `lib/pricing/catalogProducts.ts`
(`getPublicCatalogByCategory('cars' | 'parts')`) — **not** from the live
Supabase `products` table. This was the fix for two Preview-review defects:

1. **Missing catalog products** — `/shop` previously read only the sparse
   live Supabase `products` table (a handful of legacy rows), never the full
   curated catalog, which was intentionally never imported into Supabase (no
   live-data writes). Reading the bundled JSON directly makes all 87 curated
   items appear without any Supabase write.
2. **Legacy 339 DKK prices** — a read-only Supabase audit confirmed these
   were pre-existing rows (dated June 2026, before this catalog project)
   with a literal placeholder `price_dkk = 339` for several Collector cars,
   completely disconnected from the curated catalog. Reading pricing from
   the curated catalog's `approved_regular_price_dkk` field instead
   eliminates this source entirely — no item in the public catalog can ever
   display 339 DKK (`lib/pricing/catalogProducts.test.ts`).

The Supabase `products` table is still read for the merchandise tab (apparel
etc.), which is outside the scope of this catalog. This is a Preview-only
code change — no Supabase data was read/write-modified, no migration was
run, and Production is unaffected because nothing here touches
`VERCEL_ENV`-gated behavior or live data.

## Restock interest (Preview-only mock)

`lib/pricing/restockInterest.ts` — an in-memory `RestockInterestStore`
(module-level singleton, shared between `/shop` and the admin catalog-status
view within a session) backing the "REQUEST RESTOCK" / "NOTIFY ME" /
"REGISTER INTEREST" actions on out-of-stock, price-pending, and
special-order items. A request records product ID/SKU, the requesting
racer's identifier where authenticated, a contact preference (email / SMS /
in-app), requested quantity, a created timestamp, and a status. Submitting a
request is completely decoupled from `lib/pricing/boxedKit.ts` and all
order-placement code — by construction, not just a runtime check, it can
never create an order, reserve stock, or charge payment. Resets on every
page reload / server restart; nothing is written to Supabase.

## Admin catalog-status view (Preview-only)

`app/admin/catalog-status/` (`VERCEL_ENV === 'preview'`-gated, same pattern
as `app/admin/pricing/`) — a table of every catalog item with product name,
item#/SKU, category, chassis, Core/Expansion/Special Order tier, public
state, current stock, supplier cost/currency/source note (honestly reported
as "not yet recorded" — the catalog schema does not track these separately
from the approved retail price, so nothing is invented), approved retail
price where available, pricing status, restock-interest count, a suggested
manual reorder quantity, and a missing-data reason
(`lib/pricing/catalogPricingStatus.ts`: `missingDataReason`). Filters: all
out-of-stock, price-pending, Core Stock, Expansion Stock, Special Order,
category, chassis, has-restock-interest, never-stocked. This is an
administrative planning tool only — it never places a supplier order
automatically.

## Re-running the classification

```
node scripts/applyApprovedPricing.mjs
```

Idempotent — re-running after this file, `catalog/bmax-initial-catalog.json`
itself, or the approved-price table changes produces the same result every
time and regenerates the `.csv` mirror from the updated JSON.

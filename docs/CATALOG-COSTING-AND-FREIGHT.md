# Catalog Costing & Freight — 86-Product Catalog

Applies the pricing architecture in `docs/PRODUCT-PRICING-POLICY.md` to the
existing curated catalog (`catalog/bmax-initial-catalog.json` /
`.csv`, 86 items: 20 car kits, 66 upgrade parts). Classification was applied
by the idempotent `scripts/applyApprovedPricing.mjs` script (re-running it
produces identical output) and is locked in by
`catalog/catalogPricing.test.ts`.

## What the script does

1. **Shipping class + part group** — assigned to every one of the 86
   products from existing `category`/`subcategory` fields, invents no
   cost/stock/image data:
   - `category: 'cars'` → `shipping_class: 'complete_car_kit'` (all 20 cars)
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
   item-number-matched car kits from `docs/PRODUCT-PRICING-POLICY.md` §4.
   `pricing_source` set to `board_approved_fixed_price`, `price_dkk` and
   `approved_regular_price_dkk` set to the approved value.
3. Every other product (76 of 86) keeps `pricing_source: 'unverified'`,
   `approved_regular_price_dkk: null` — **no supplier cost is invented**.
4. **`published`/`available`/`stock_qty`/`image_url` are left untouched**
   even for the 10 newly-priced cars — a board-approved price does not
   manufacture real stock-on-hand or approved photography. All 10 remain
   drafts (`published: false`, `stock_qty: 0`) until stock and photos are
   separately confirmed. This is a data-completeness gap, not a pricing
   gap, and is intentional.

## Stock classification (Core / Expansion / Special Order)

The catalog already carries this via the existing `catalog_tier` field
(`core` / `expansion` / `special_order`) — reused directly rather than
duplicated under a new name (50 core, 28 expansion, 8 special_order).

## Priced car kits (10 of 20)

| Item # | Name | Approved price |
|---|---|---|
| 19443 | Diospada Premium | 249 DKK |
| 18704 | Shadow Shark | 299 DKK |
| 18705 | Flame Astute | 299 DKK |
| 19447 | Beak Stinger G | 299 DKK |
| 19451 | Gun Bluster XTO Premium | 299 DKK |
| 18099 | Ray Spear | 319 DKK |
| 95126 | Cyclone Magnum Memorial 25th Anniversary | 329 DKK |
| 95571 | Exflowly Polycarbonate Body Special (Purple) | 329 DKK |
| 95706 | Geo Glider Asia Challenge 2026 Special | 359 DKK |
| 92462 | Mach Frame Philippine Cup Special | 389 DKK |

## Unpriced remainder (76 of 86) — unverified, unpublished

- **10 other car kits** (Neo-VQS, Cross Spear 01, Mach Frame [plain,
  18714 — distinct from the Philippine Cup Special, 92462], K4 Gambol,
  Aero Avante [plain, 18701], DCR-01, Ignicion, Raikiri, Avante Mk.III Nero,
  Ray Stinger Premium): no verified Philippine supplier cost on file. Per
  policy, use verified cost + 80 DKK freight + 50% margin floor once a cost
  is verified; stay unpublished until then.
- **66 upgrade parts**: none has a verified supplier cost on file. Same
  fallback rule applies (25/35/50 DKK freight by class + 50% margin floor).

## Named-but-unmatched approvals (documented, not applied to a wrong product)

- **Aero Avante Starter Pack (469 DKK)** — the catalog has only plain "Aero
  Avante" (18701), a different edition/bundle. Not applied to 18701.
- **Aero Thunder Shot Advertising Pack (629 DKK)** — not present in the
  86-item catalog. Previously personal stock; must not auto-publish even if
  added later.
- **Ultra-Dash Motor (129 DKK)** — not present among the catalog's 10 Motors
  entries. Covered as a pure pricing-formula regression test instead — see
  `docs/PRODUCT-PRICING-POLICY.md` §"Approved motor pricing".

## Re-running the classification

```
node scripts/applyApprovedPricing.mjs
```

Idempotent — re-running after this file, `catalog/bmax-initial-catalog.json`
itself, or the approved-price table changes produces the same result every
time and regenerates the `.csv` mirror from the updated JSON.

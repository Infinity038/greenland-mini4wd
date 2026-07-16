# Product Pricing Policy — Locked Business Rules

These rules are locked as approved by the project owner. Implementation:
`lib/pricing/money.ts`, `lib/pricing/regularPrice.ts`,
`lib/pricing/shippingClasses.ts`. Every rule below has a passing test in
`lib/pricing/*.test.ts`.

## Money math

All money calculations use integer øre (1 DKK = 100 øre), never ordinary
floating-point DKK arithmetic. The one unavoidable fraction — converting a
foreign-currency supplier cost to DKK using an exchange-rate snapshot — is
rounded to the nearest øre exactly once, immediately, so no floating-point
error accumulates across subsequent additions (`lib/pricing/money.ts`:
`convertToDkkOre`).

## Regular price rule

Every normal retail product must maintain **at least a 50% gross margin**
based on landed cost.

```
landed cost = supplier cost (converted to DKK) + fixed allocated shipping
minimum regular retail = landed cost / (1 - 0.50)   [= landed cost × 2]
```

## Final price rounding

All published prices end in 9. Calculate the exact minimum price, then
select the **closest** price ending in 9 that does not fall below the
active margin floor. A tie (equidistant above/below) resolves to the higher
price — never below the floor.

| Minimum | Published price |
|---|---|
| 124 | 129 |
| 142 | 149 |
| 154 | 159 |
| 166 | 169 |
| 192 | 199 |
| 286.66 | 289 |

Implementation: `roundToEndingNineNotBelowFloor()` — the same function
powers both regular-price rounding (where the target and the floor are the
same value) and campaign sale-price rounding (where a requested discount is
the target and the campaign's margin floor is a separate constraint).

## Fixed shipping classes

| Class | Allocation | Covers |
|---|---|---|
| `small_part` | 25 DKK | Motors, rollers, FRP/carbon plates, gears, shafts, bearings, wheels, tires, brakes, dampers, screws, spacers, normal upgrade parts, loose small replacement components |
| `boxed_body_chassis` | 35 DKK | Boxed body sets, boxed chassis sets, replacement body/chassis kits, products larger than a normal upgrade package but smaller than a complete kit |
| `bulky_upgrade` | 50 DKK | Large tune-up sets, unusually bulky upgrade packages, large tool/maintenance sets |
| `complete_car_kit` | 80 DKK | Complete boxed Mini 4WD kits, complete Starter Packs |

An administrator may override the shipping class or the allocated amount for
an exceptional product — the override requires a reason string and is
always recorded in the pricing audit trail
(`lib/pricing/regularPrice.ts`: `ShippingAllocation.overrideOre` /
`overrideReason`, enforced — an override without a reason throws).

## Cost source and exchange rate

The primary supplier-cost source is the verified Philippine purchase or
normal Philippine retail price. Every priced product records:

- supplier cost amount + currency + supplier name
- source URL or source note
- date verified
- a **stored** PHP→DKK exchange-rate snapshot (never recalculated
  historically when the live rate changes — `SupplierCostSnapshot` in
  `lib/pricing/regularPrice.ts`)
- fixed shipping class
- calculated landed cost, calculated minimum retail price, approved regular
  retail price

A new exchange-rate snapshot applies only to products not yet purchased, or
through an explicit administrator recalculation action — never retroactively
to already-calculated landed costs. Official Tamiya pricing and delivered
eBay pricing may be stored as market references but never replace actual
landed cost. **Supplier costs are never invented** — a product without a
verified cost stays an unpublished draft
(`lib/pricing/catalogPricingStatus.ts`: `checkPublishability`).

## Approved car prices (locked)

Applied by exact item number — never by name alone, since several editions
share similar names. See `catalog/catalogPricing.test.ts` for the regression
test locking these in, and `scripts/applyApprovedPricing.mjs` for the
idempotent script that applied them to `catalog/bmax-initial-catalog.json`.

| Item # | Name | Approved price |
|---|---|---|
| 19443 | Diospada (Premium) | 249 DKK |
| 18704 | Shadow Shark | 299 DKK |
| 18705 | Flame Astute | 299 DKK |
| 19447 | Beak Stinger G | 299 DKK |
| 19451 | Gun Bluster XTO Premium | 299 DKK |
| 18099 | Ray Spear | 319 DKK |
| 95126 | Cyclone Magnum (Memorial 25th Anniversary) | 329 DKK |
| 95571 | Exflowly Polycarbonate Body Special (Purple) | 329 DKK |
| 95706 | Geo Glider Asia Challenge (2026 Special) | 359 DKK |
| 92462 | Mach Frame Philippine Cup Special | 389 DKK |

**Not applied — no unambiguous match, documented rather than guessed:**

- **Aero Avante Starter Pack (469 DKK)** — the catalog only has plain "Aero
  Avante" (item 18701), a different edition/bundle. The approved price is
  **not** applied to 18701.
- **Aero Thunder Shot Advertising Pack (629 DKK)** — not present in the
  86-item catalog at all. Also explicitly previously personal stock — must
  never be auto-published even if added later.

For every other car kit: use verified Philippine supplier cost + 80 DKK
fixed freight, calculate the 50% margin floor, round to the nearest valid
ending-in-9 price, and keep unpublished while supplier cost is unverified
(which is the current state of every one of the other 10 car kits in the
86-item catalog — none has a verified cost on file).

## Approved motor pricing

**Ultra-Dash Motor**: 350 PHP Philippine supplier baseline, `small_part`
shipping class (25 DKK), approved regular retail **129 DKK**, margin ≥ 50%.
No product named "Ultra-Dash Motor" exists in the current 86-item catalog
(confirmed — the 10 Motors entries are Torque-Tuned 2, Rev-Tuned 2,
Atomic-Tuned 2, Light-Dash, Hyper-Dash 3, and their PRO variants; no
"Ultra-Dash"). This is a **pure formula regression test**
(`lib/pricing/regularPrice.test.ts`), reproducing 129 DKK exactly from an
illustrative 0.11 DKK/PHP exchange-rate snapshot — not a claim about a live
catalog row.

For every other motor: verified Philippine supplier cost + 25 DKK freight +
50% margin floor + round to nearest valid ending-in-9 price. Never use an
unusually expensive individual international shipment (e.g. a one-off eBay
purchase) as the normal catalog cost baseline — that acquisition cost may be
recorded for inventory accounting on that specific unit, but the catalog
pricing baseline stays the Philippine bulk-stock model.

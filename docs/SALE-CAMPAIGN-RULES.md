# Sale Campaign Rules — Locked Business Rules

Implementation: `lib/pricing/campaign.ts`, `lib/pricing/campaignPreview.ts`.
Admin UI (Preview-only): `app/admin/pricing/`. Every rule below has a
passing test in `lib/pricing/campaign.test.ts` /
`lib/pricing/campaignPreview.test.ts`, including the required worked
examples (Shadow Shark, an AR chassis campaign, an all-motors campaign, an
Anniversary Sale, a boxed body/chassis set).

## Campaign types and default margin floors

| Type | Default minimum margin | Intent |
|---|---|---|
| Standard Sale | 40% | Christmas sales, chassis sales, motor sales, short promotions |
| Anniversary Sale | 30% | Major yearly promotion; normal recommendation ~20% off most eligible products, selected aged stock up to 30% off |
| Clearance | 20% | Old/slow-moving products |
| Liquidation | 0% | Never sells below landed cost without a separate, explicit below-cost override — see below |

**Liquidation below-cost override**: requires an explicit, separate floor
value plus **two distinct confirmations** (`SaleCampaign.belowCostOverride`
— `confirmedByUserId` and `secondConfirmedByUserId` must differ) and is
**never available to Shop Manager**, only Admin
(`lib/pricing/permissions.ts`: `canUseBelowCostOverride`).

## Campaign fields

Name, type, requested discount percentage, minimum allowed margin, start
date/time, end date/time, enabled/disabled switch, badge text, internal
note, public description, created by, approved by, created timestamp, last
modified timestamp — see `SaleCampaign` in `lib/pricing/campaign.ts`.

## Targeting

A campaign's scope is one or more rules, matched with OR (a product needs to
match only one). Exclusions are matched with OR too, but any exclusion match
removes the product. Supported scope kinds: all products, all complete car
kits, all upgrade parts, a category, a part group (motors / rollers /
plates / gears-drivetrain / body-chassis-sets), a chassis family (AR /
FM-A / VZ / MA / MS / Super II), Starter Packs, collector products, preorder
products, tags, SKUs, selected products, inventory older than N days.
Exclusions: collector products, preorder products, special orders, newly
arrived stock, selected SKUs, selected categories, products already below a
selected margin.

Club assets (`PricedProduct.isClubAsset`) are **never** eligible for any
campaign, regardless of scope — enforced once, centrally, in
`productMatchesCampaign()`, not trusted to every scope rule individually.

Examples the engine supports (see `campaign.test.ts`):

1. **Christmas Sale** — all complete car kits, 10% discount, upgrade parts
   excluded (falls out naturally: `all_complete_car_kits` scope already
   excludes parts).
2. **AR Chassis Sale** — `chassis_family: 'AR'` scope, administrator-selected
   discount.
3. **Motor Sale** — `part_group: 'motors'` scope, 8% requested discount.
4. **Anniversary Sale** — modeled as **two campaigns run simultaneously**:
   a base Anniversary Sale at 20% (`all_products` scope) and a second
   Anniversary Sale at 30% (`inventory_older_than_days: 365` scope). Because
   discounts never stack and overlap resolution always picks the lowest
   valid price, aged stock automatically gets the better 30% price and
   everything else gets 20% — no special "sub-rule" concept needed.

## Sale-price calculation

```
requested sale price = regular price × (1 - discount percentage)
minimum permitted campaign price = landed cost / (1 - campaign minimum margin)
```

The final campaign price: (1) respects the applicable margin floor, (2) ends
in 9, (3) uses the nearest ending-in-9 price that remains at or above the
floor — the exact same rounding function used for regular prices
(`roundToEndingNineNotBelowFloor`), just with a possibly-different target
(the requested price) and floor (the campaign's margin floor) than the
regular-price case (where target and floor are the same value).

If the requested percentage would violate the campaign's margin floor, the
product is **capped** at its lowest permitted sale price and clearly flagged
(`CampaignPriceResult.wasMarginCapped`) — never a silent floor violation. If
capping would leave **no real discount at all** (the capped price is at or
above the regular price), the product is treated as having
`noValidDiscount: true` and is excluded from the campaign's applied price
entirely (`resolveBestCampaignForProduct` — a "sale" that doesn't actually
save the customer money is never displayed as one). An administrator can
always choose to exclude a capped product outright instead.

Worked example (matches the locked customer-display example exactly):
299 DKK regular, 20% requested discount, 40% floor → 239 DKK, save 60 DKK.

## Overlap — discounts never stack

When multiple campaigns apply to the same product: calculate each valid
campaign price, use the **lowest valid customer price**, keep that
campaign's identity for display, never combine percentages
(`resolveBestCampaignForProduct`). Example: "All Kits" at 5% and "AR Kits"
at 8% — an AR kit gets the 8% price, never a combined 13%.

Manual product coupons, loyalty rewards, and Shop Credit are handled
separately from campaign discounts and must not silently stack in a way
that violates business rules — out of scope for the campaign engine itself,
which only ever resolves *campaign-vs-campaign* overlap.

## Customer-facing display

For a product on sale: original regular price crossed out, current sale
price, sale badge, amount saved, campaign name/public badge text, campaign
end date where configured. When the effective reduction is smaller than the
requested campaign percentage because of margin capping, never advertise the
exact requested percentage on that specific product — campaign-level wording
uses **"Up to X% off"** whenever not every eligible product receives the
full percentage.

## Admin campaign preview (required before activation)

`lib/pricing/campaignPreview.ts`: `buildCampaignPreview()` computes —
number of selected products, number receiving the full requested discount,
number capped by the margin floor, number with no valid discount at all,
number excluded, regular retail value, expected sale revenue, total landed
cost, expected gross profit, effective gross margin, expected discount
value, and estimated cash recovered from aged stock (rows aged 90+ days).
The accompanying product table shows product, SKU, chassis, supplier
cost/shipping/landed cost, regular price, requested price, final valid sale
price, gross profit, gross margin, status, and margin-cap reason. Activation
requires explicit confirmation (`app/admin/pricing`: two-step
ACTIVATE → CONFIRM ACTIVATION).

## Inventory age (targeting input, never an auto-discount trigger)

Based on stock-**receipt** date, never product-creation date
(`lib/pricing/inventoryAge.ts`).

| Age | Bucket | Admin indicator |
|---|---|---|
| < 90 days | `normal` | Normal |
| 90–179 days | `consider_promotion` | Consider promotion |
| 180–269 days | `slow_moving` | Slow moving |
| 270–364 days | `clearance_candidate` | Clearance candidate |
| 365+ days | `high_priority_clearance` | High-priority clearance |

Reaching an age threshold **never** automatically discounts anything — it is
surfaced as a campaign filter (`inventory_older_than_days` scope rule) and a
recommendation only.

## Loyalty during sales

Loyalty points are calculated from the actual eligible amount paid **after**
the sale discount (`lib/pricing/loyalty.ts`). No points on: the
discounted-away amount, Shop Credit used, refunded amounts, cancelled
payments. Locked example: 299 DKK regular, 239 DKK sale price paid → 2.39
points earned.

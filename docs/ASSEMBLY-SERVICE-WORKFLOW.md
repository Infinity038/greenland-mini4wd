# Assembly Service Workflow — Boxed Kits, Add-Ons, Club Assets

Implementation: `lib/pricing/boxedKit.ts`, `lib/pricing/serviceAddOns.ts`,
`app/shop/page.tsx` (customer-facing), `supabase/migrations-proposed/phase15_boxed_kit_and_club_assets_forward.sql`.

## Boxed Kit only — no more four-variant stock split

The old sale structure (unbuilt / unbuilt+case / built / built+case as four
separate stock variants) is removed. Every car has exactly one saleable SKU:
the **Boxed Kit**. Assembly and the display case are services/add-ons,
selected per order — they never create a second "built" car SKU and never
change the boxed-kit stock count.

- Car kit stock is reduced only for the Boxed Kit
  (`products.unbuilt_stock`, repurposed as the canonical count — see
  `docs/PRICING-MIGRATION-AND-ROLLBACK.md`).
- Display Case stock is tracked **separately** (`shop_inventory.case_stock`
  — already existed as a singleton row before this change, reused as-is).
- Customer message on any order that includes an assembly add-on:
  **"Built to order. Allow approximately 3–5 hours after confirmation."**
  (`lib/pricing/serviceAddOns.ts`: `BUILD_TO_ORDER_MESSAGE`).

## Optional service add-ons

| Add-on | Default price | Stock tracked? |
|---|---|---|
| Display Case (bundled with a car) | 189 DKK | Yes — separately (`shop_inventory.case_stock`) |
| Standard Assembly | 349 DKK (administrator-configurable) | No — a service |
| Ready-to-Race Assembly | 449 DKK (administrator-configurable) | No — a service |

Standard Assembly and Ready-to-Race Assembly are mutually exclusive per
order (one build service, not both); Display Case is independent and can be
combined with either.

**Correction (Preview review):** the Display Case add-on previously carried
a flat 99 DKK price with no supplier-cost or margin basis. It is now a real
catalog accessory (`lib/pricing/displayCase.ts`, docs/CATALOG-COSTING-AND-FREIGHT.md
§"Display case") with two locked, independently margin-verified prices for
the same shared stock pool: **229 DKK standalone** (own catalog card, ≥50%
margin) and **189 DKK bundled with a complete car kit** (this add-on, ≥40%
margin) — a 40 DKK bundle saving. The 189 DKK figure above is exactly the
`DEFAULT_SERVICE_ADDONS.display_case.defaultPriceDkk` value, sourced from
`DISPLAY_CASE_BUNDLED_PRICE_DKK`, not a second independent number to keep in
sync by hand.

**Standard Assembly includes**: complete assembly following the kit
instructions, appropriate lubrication, installation of included motor and
drivetrain, basic alignment, final tightening, functional check.

**Ready-to-Race Assembly includes**: everything in Standard Assembly, plus
drivetrain inspection, wheel and tire inspection, roller alignment, a short
functional test run, final race-readiness inspection.

**Never promise racing performance or guaranteed speed** — neither add-on's
copy claims a performance outcome, only the build/inspection steps
performed.

## Shop UI (implemented this pass)

`/shop` car cards now show: Boxed Kit price, Reserve/Preorder action, and
(behind `ASSEMBLY_SERVICES_ENABLED`) a note that add-ons are available at
checkout — compact, mobile-friendly, no four-box grid. The order modal
carries the full add-on selection: a checkbox-style picker per add-on
(Display Case disabled with an "out of stock" label when
`shop_inventory.case_stock` is 0), the live running total via
`calculateBoxedKitOrderTotal()`, and the build-to-order message whenever an
assembly add-on is selected.

## Club display and house cars

A separate classification, `club_asset` (`products.is_club_asset`):

- not normal sale inventory — never appears as available boxed stock
  (enforced by a CHECK constraint: `is_club_asset = false or available = false`,
  Phase 15 migration)
- may be used for display, demonstrations, or as a house/rental car
- gets its own Club Car ID once the registered-car system
  (`supabase/migrations-proposed/phase6_club_car_qr_forward.sql`) is live
- never eligible for any sale campaign, regardless of scope
  (`lib/pricing/campaign.ts`: `productMatchesCampaign` checks
  `isClubAsset` first, before any scope rule)

Converting sale inventory to a club asset always requires an explicit
administrator action and produces an audit record — never silent
(`convert_product_to_club_asset()` SQL function, Admin-only, writes a
`pricing_audit_events` row of type `inventory_converted_to_club_asset`).

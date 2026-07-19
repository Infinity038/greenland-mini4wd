# Lil's-reference catalog pricing rollout

Production rollout date: 2026-07-19

## Result

- 120 products remain publicly visible.
- 110 products display DKK prices.
- 10 products remain `PRICE ON REQUEST` because no exact Lil's Hobby Center reference or previously approved fixed price was available.
- No product uses a guessed price or a numeric zero placeholder.

## Pricing hierarchy

1. Previously owner-approved fixed DKK prices remain authoritative.
2. Otherwise, an exact Lil's SKU reference is used.
3. Item `18069` is the one manually verified exception: Lil's lists the correct Dash-1 Emperor Premium product and PHP price but uses item/SKU `18068`; official Tamiya identifies the product as item `18069`.
4. Products without a valid reference remain inquiry-only.

## Formula

- PHP-to-DKK working rate: PHP 9.23 per DKK.
- Freight allowance:
  - Small part: 25 DKK
  - Bulky upgrade set: 35 DKK
  - Complete car kit: 80 DKK
- Normal items target at least 50% gross margin.
- Collector items target 60% gross margin.
- Calculated retail is rounded upward to a whole-DKK price ending in `9`.
- Built-car surcharge: 100 DKK.
- Display-case bundle add-on: 189 DKK.

Car variants therefore use:

- Unbuilt: base price
- Built: base + 100 DKK
- Unbuilt + Case: base + 189 DKK
- Built + Case: base + 289 DKK

## Inquiry-only item numbers

- `15347`
- `15464`
- `15485`
- `15486`
- `15489`
- `18706`
- `92453`
- `95569`
- `95598`
- `95703`

## Production database records

Supabase project: `greenland-mini4wd` (`eojdjqihmxxaqltudqjx`)

Migrations:

- `prepare_lils_reference_pricing_plan`
- `apply_lils_reference_catalog_pricing`

Rollback source:

- `public.catalog_pricing_backup_20260719`

The backup table is protected from anonymous and authenticated roles and contains only pre-rollout price fields.

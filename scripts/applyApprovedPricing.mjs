#!/usr/bin/env node
// One-off, idempotent data-classification script for the curated 86-product
// catalog (catalog/bmax-initial-catalog.json + .csv). Re-running it produces
// the same output every time — it is safe to run again after this file is
// edited or the source catalog changes.
//
// What this does (docs/CATALOG-COSTING-AND-FREIGHT.md, docs/PRODUCT-PRICING-POLICY.md):
//   1. Assigns a fixed shipping_class + a part_group (for parts) to every
//      product, based on its existing category/subcategory — pure
//      classification, invents no cost/stock/images.
//   2. Applies the board-approved fixed regular price to the small set of
//      car kits explicitly approved by item number (see APPROVED_CAR_PRICES
//      below) — and ONLY where the item number matches a real catalog row
//      unambiguously. It does NOT flip `published`/`available` to true or
//      touch stock/image fields: pricing approval alone does not manufacture
//      real stock-on-hand or approved photography, so these stay exactly as
//      they were (unpublished, zero stock) until that is separately true.
//   3. Leaves every other product's pricing_source as 'unverified' with no
//      approved_regular_price_dkk — no supplier cost is invented anywhere.
//   4. Regenerates the CSV mirror from the updated JSON so both stay in sync.
//
// This mirrors (does not import, to avoid a build step for a one-off data
// script) the shipping-class constants in lib/pricing/shippingClasses.ts —
// keep both in sync if the locked shipping-class amounts ever change.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const JSON_PATH = path.join(__dirname, '..', 'catalog', 'bmax-initial-catalog.json');
const CSV_PATH = path.join(__dirname, '..', 'catalog', 'bmax-initial-catalog.csv');

// Locked, board-approved fixed regular prices (docs/PRODUCT-PRICING-POLICY.md
// §4), keyed by exact Tamiya item number — never matched by name alone,
// since several editions share similar names (e.g. "Mach Frame" vs
// "Mach Frame Philippine Cup Special").
const APPROVED_CAR_PRICES_DKK_BY_ITEM_NO = {
  '19443': 249, // Diospada (Premium)
  '18704': 299, // Shadow Shark
  '18705': 299, // Flame Astute
  '19447': 299, // Beak Stinger G
  '19451': 299, // Gun Bluster XTO Premium
  '18099': 319, // Ray Spear
  '95126': 329, // Cyclone Magnum (Memorial 25th Anniversary)
  '95571': 329, // Exflowly Polycarbonate Body Special (Purple)
  '95706': 359, // Geo Glider Asia Challenge (2026 Special)
  '92462': 389, // Mach Frame Philippine Cup Special — NOT the plain "Mach Frame" (18714)
};

// Named in the approved list but with NO matching catalog row today — do
// not apply their price to a different/similar product. Recorded here only
// so the mismatch is documented, not silently dropped.
const UNMATCHED_APPROVED_NAMES = [
  { name: 'Aero Avante Starter Pack', approvedPriceDkk: 469, note: 'Catalog only has plain "Aero Avante" (18701) — a different edition/bundle. Do not apply this price to 18701.' },
  { name: 'Aero Thunder Shot Advertising Pack', approvedPriceDkk: 629, note: 'Not in the 86-item catalog at all. Also explicitly "previously personal stock" — must not be auto-published even if added later.' },
  { name: 'Ultra-Dash Motor', approvedPriceDkk: 129, note: 'Not in the 86-item catalog at all (no motor by this name among the 10 Motors entries). See lib/pricing/regularPrice.test.ts for the formula worked example.' },
];

function classifyShippingClass(item) {
  if (item.category === 'cars') return 'complete_car_kit';
  // parts
  if (item.subcategory === 'Starter Upgrade Sets') return 'bulky_upgrade';
  return 'small_part';
}

function classifyPartGroup(item) {
  if (item.category !== 'parts') return null;
  const map = {
    Motors: 'motors',
    'Rollers/Stabilizers': 'rollers',
    Plates: 'plates',
    'Shafts/Gears': 'gears_drivetrain',
    'Wheels/Tires': 'wheels_tires',
    'Brakes/Dampers': 'brakes_dampers',
    'Screws/Nuts': 'screws_spacers',
    Bearings: 'bearings',
    'Starter Upgrade Sets': 'starter_upgrade_sets',
    Accessories: 'accessories',
  };
  return map[item.subcategory] ?? 'other_part';
}

const raw = readFileSync(JSON_PATH, 'utf-8');
const items = JSON.parse(raw);

let appliedCount = 0;
const updated = items.map(item => {
  const shipping_class = classifyShippingClass(item);
  const part_group = classifyPartGroup(item);
  const approvedDkk = APPROVED_CAR_PRICES_DKK_BY_ITEM_NO[item.item_no];

  const next = {
    ...item,
    shipping_class,
    part_group,
    is_complete_car_kit: item.category === 'cars',
    is_club_asset: false, // none of the 86 curated items are club/house/demo assets
  };

  if (approvedDkk != null) {
    next.pricing_source = 'board_approved_fixed_price';
    next.approved_regular_price_dkk = approvedDkk;
    // Reflect the approved price in the existing price_dkk field the app
    // already reads, WITHOUT flipping published/available/stock/image —
    // those depend on real stock-on-hand and approved photography, neither
    // of which this pricing pass creates.
    next.price_dkk = approvedDkk;
    appliedCount += 1;
  } else {
    next.pricing_source = 'unverified';
    next.approved_regular_price_dkk = null;
  }

  return next;
});

writeFileSync(JSON_PATH, JSON.stringify(updated, null, 2) + '\n');

// Regenerate the CSV mirror from the same data so both stay in sync.
const headers = Object.keys(updated[0]);
const csvEscape = v => {
  if (v == null) return '';
  if (Array.isArray(v)) return csvEscape(v.join('|'));
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const csvLines = [headers.join(',')];
for (const item of updated) {
  csvLines.push(headers.map(h => csvEscape(item[h])).join(','));
}
writeFileSync(CSV_PATH, csvLines.join('\n') + '\n');

console.log(`Classified ${updated.length} products (shipping_class + part_group + pricing_source).`);
console.log(`Applied board-approved fixed prices to ${appliedCount} car kits by item_no.`);
console.log('Unmatched approved-name entries (documented, not applied):');
for (const u of UNMATCHED_APPROVED_NAMES) {
  console.log(`  - ${u.name} (${u.approvedPriceDkk} DKK): ${u.note}`);
}

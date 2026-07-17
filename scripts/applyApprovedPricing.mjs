#!/usr/bin/env node
// One-off, idempotent data-classification script for the curated catalog
// (catalog/bmax-initial-catalog.json + .csv). Re-running it produces the
// same output every time — it is safe to run again after this file is
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
//   4. Applies data-quality corrections to existing rows (ITEM_CORRECTIONS_BY_ITEM_NO).
//   5. Adds new catalog items (NEW_CATALOG_ITEMS) — idempotent, skips any
//      item_no already present.
//   6. Assigns shop_group to every car (SHOP_GROUP_BY_ITEM_NO) and every
//      part ('parts_upgrades'), and placeholder image metadata to every row.
//   7. Regenerates the CSV mirror from the updated JSON so both stay in sync.
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

// Locked, board-approved fixed regular prices for NON-collector items
// (docs/PRODUCT-PRICING-POLICY.md §4), keyed by exact Tamiya item number —
// never matched by name alone, since several editions share similar names
// (e.g. "Mach Frame" vs "Mach Frame Philippine Cup Special").
const APPROVED_CAR_PRICES_DKK_BY_ITEM_NO = {
  '19443': 249, // Diospada (Premium)
  '18704': 299, // Shadow Shark
  '18705': 299, // Flame Astute
  '18099': 319, // Ray Spear
};

// Collector correction pass (Preview review, docs/PRODUCT-PRICING-POLICY.md
// §"Collector regular margin"): these items are explicitly classified
// Collector (is_collectors_vault forced true here, overriding whatever the
// original curated catalog had) and priced under the 60% Collector margin
// floor rather than the normal 50% floor. Supersedes any price these item
// numbers were given in an earlier pass.
const COLLECTOR_PRICE_CORRECTIONS_DKK_BY_ITEM_NO = {
  '19447': 359, // Beak Stinger G
  '19451': 359, // Gun Bluster XTO Premium
  '95126': 389, // Cyclone Magnum (Memorial 25th Anniversary)
  '95571': 389, // Exflowly Polycarbonate Body Special (Purple)
  '95706': 429, // Geo Glider Asia Challenge (2026 Special)
  '92462': 469, // Mach Frame Philippine (Cup) Special — NOT the plain "Mach Frame" (18714)
};

// Named in the approved list but with NO matching catalog row today — do
// not apply their price to a different/similar product. Recorded here only
// so the mismatch is documented, not silently dropped.
const UNMATCHED_APPROVED_NAMES = [
  { name: 'Aero Avante Starter Pack', approvedPriceDkk: 469, note: 'Catalog only has plain "Aero Avante" (18701) — a different edition/bundle. Do not apply this price to 18701.' },
  { name: 'Aero Thunder Shot Advertising Pack', approvedPriceDkk: 629, note: 'Not in the curated catalog at all. Also explicitly "previously personal stock" — must not be auto-published even if added later.' },
  { name: 'Ultra-Dash Motor', approvedPriceDkk: 129, note: 'Not in the curated catalog at all (no motor by this name among the 10 Motors entries). See lib/pricing/regularPrice.test.ts for the formula worked example.' },
];

// Data-quality corrections to EXISTING catalog rows (Preview review pass) —
// applied by exact item_no to whatever is already in the JSON. Distinct from
// NEW_CATALOG_ITEMS below (which only appends rows that don't exist yet):
// this map patches a row that is already present.
const ITEM_CORRECTIONS_BY_ITEM_NO = {
  // Item 19431 was added in an earlier pass as "Magnum Saber" on AR chassis,
  // mirroring what was believed to be the pre-existing live Supabase record.
  // Corrected: the official product is "Magnum Saber Premium" on Super-II
  // chassis, not AR. Collector classification and PRICE_PENDING status are
  // unchanged — only identity fields were wrong.
  '19431': {
    name: 'Magnum Saber Premium',
    chassis: 'Super-II',
    compatibility: ['Super-II'],
    id: 'tamiya-19431-magnum-saber-premium',
  },
  // 15450's compatibility was recorded as AR-only. Tamiya's own official
  // listing states this set is also compatible with MA, MS, VS and
  // Super-II/XX chassis — corrected to the verified compatibility list.
  '15450': {
    compatibility: ['AR', 'MA', 'MS', 'VS', 'Super-II', 'Super-XX'],
  },
};

// Every car's shop_group (docs/CATALOG-COSTING-AND-FREIGHT.md
// §"Shop groups") — one lookup covering both the original 21 and the 29
// added this pass, so classification logic lives in exactly one place. Every
// part gets 'parts_upgrades' directly (see main loop below); the shared
// display-case accessory is handled separately (lib/pricing/displayCase.ts),
// not part of this script.
const SHOP_GROUP_BY_ITEM_NO = {
  // Existing 21 — re-mapped into the new taxonomy, no identity changes.
  '18099': 'beginner_basic',       // Ray Spear
  '18094': 'beginner_basic',       // Neo-VQS
  '18103': 'beginner_basic',       // Cross Spear 01
  '18714': 'beginner_basic',       // Mach Frame
  '18701': 'beginner_basic',       // Aero Avante
  '18705': 'beginner_basic',       // Flame Astute
  '18704': 'beginner_basic',       // Shadow Shark
  '18718': 'advanced_bmax',        // K4 Gambol
  '18646': 'advanced_bmax',        // DCR-01
  '18657': 'advanced_bmax',        // Ignicion
  '18640': 'advanced_bmax',        // Raikiri
  '18627': 'advanced_bmax',        // Avante Mk.III Nero
  '19451': 'collector_limited',    // Gun Bluster XTO Premium
  '19447': 'collector_limited',    // Beak Stinger G
  '19443': 'collector_limited',    // Diospada Premium
  '19438': 'collector_limited',    // Ray Stinger Premium
  '92462': 'collector_limited',    // Mach Frame Philippine Cup Special
  '95706': 'collector_limited',    // Geo Glider Asia Challenge 2026 Special
  '95571': 'collector_limited',    // Exflowly Polycarbonate Body Special (Purple)
  '95126': 'collector_limited',    // Cyclone Magnum Memorial 25th Anniversary
  '19431': 'collector_limited',    // Magnum Saber Premium

  // New 29 — Beginner/Basic (12)
  '18703': 'beginner_basic', '18707': 'beginner_basic', '18635': 'beginner_basic',
  '18105': 'beginner_basic', '18104': 'beginner_basic', '18097': 'beginner_basic',
  '18095': 'beginner_basic', '18100': 'beginner_basic', '18101': 'beginner_basic',
  '95570': 'beginner_basic', '95569': 'beginner_basic', '18086': 'beginner_basic',
  // Official Starter Packs (3)
  '18706': 'official_starter_pack', '18647': 'official_starter_pack', '18710': 'official_starter_pack',
  // Advanced/B-MAX (9)
  '95598': 'advanced_bmax', '18658': 'advanced_bmax', '18659': 'advanced_bmax',
  '18650': 'advanced_bmax', '18660': 'advanced_bmax', '18625': 'advanced_bmax',
  '18632': 'advanced_bmax', '18661': 'advanced_bmax', '18662': 'advanced_bmax',
  // Collector/Limited (4)
  '95297': 'collector_limited', '18069': 'collector_limited', '92453': 'collector_limited',
  '95703': 'collector_limited',
  // Coming Soon to Greenland (1)
  '95190': 'coming_soon_greenland',
};

// Added this pass (Preview review, catalog-expansion proposal): 29 verified
// additional car kits, taking the catalog from 21 to 50 cars. Every one uses
// an exact, independently-verified official Tamiya item number and chassis.
// None has a verified Philippine supplier cost, so every one stays
// pricing_source: 'unverified' / approved_regular_price_dkk: null — no cost,
// price or stock is invented. `source_url` is populated only where an
// official Tamiya/Tamiya USA product-page URL was actually confirmed during
// research; left '' where it was not, rather than guessed.
const NEW_CATALOG_ITEMS = [
  // ── Beginner / Basic (12) ──────────────────────────────────────────
  { item_no: '18703', name: 'Aero Manta Ray', chassis: 'AR', catalog_tier: 'core',
    source_url: 'https://www.tamiya.com/english/products/18703/index.html' },
  { item_no: '18707', name: 'Rowdy Bull', chassis: 'FM-A', catalog_tier: 'core', source_url: '' },
  { item_no: '18635', name: 'Blast Arrow', chassis: 'MA', catalog_tier: 'core',
    source_url: 'https://www.tamiya.com/english/products/18635blast_arrow/index.htm' },
  { item_no: '18105', name: 'The Grasshopper Jr.', chassis: 'VZ', catalog_tier: 'core', source_url: '' },
  { item_no: '18104', name: 'Cross Spear 02', chassis: 'VZ', catalog_tier: 'expansion', source_url: '',
    description: 'Sibling kit to Cross Spear 01 (18103) already in the catalog — a distinct item number, not a duplicate.' },
  { item_no: '18097', name: 'Toyota GR Yaris', chassis: 'VZ', catalog_tier: 'expansion', source_url: '' },
  { item_no: '18095', name: 'Honda e', chassis: 'VZ', catalog_tier: 'expansion',
    source_url: 'https://www.tamiyausa.com/shop/132-vs/jr-honda-e-vz/' },
  { item_no: '18100', name: 'Eleglitter', chassis: 'VZ', catalog_tier: 'expansion', source_url: '' },
  { item_no: '18101', name: 'Super Avante Jr.', chassis: 'VZ', catalog_tier: 'expansion', source_url: '' },
  { item_no: '95570', name: 'Penguin Racer', chassis: 'VZ', catalog_tier: 'core', source_url: '' },
  { item_no: '95569', name: 'Elephant Racer', chassis: 'VZ', catalog_tier: 'expansion',
    source_url: 'https://www.tamiyausa.com/shop/132-vs/jr-elephant-racer/' },
  { item_no: '18086', name: 'Dog Racer', chassis: 'Super-II', catalog_tier: 'expansion', source_url: '' },

  // ── Official Tamiya Starter Packs (3) ───────────────────────────────
  { item_no: '18706', name: 'Mini 4WD Starter Pack AR Speed Spec', chassis: 'AR', catalog_tier: 'core',
    source_url: 'https://www.tamiyausa.com/shop/132-rev/jr-starter-pack-ar-speed-spec-2/',
    description: 'Official Tamiya Starter Pack — Aero Avante body on AR chassis, bundled with tools and upgrade hardware from the factory. A distinct SKU from the plain Aero Avante (18701) already in the catalog.' },
  { item_no: '18647', name: 'Mini 4WD Starter Pack MA Power Spec', chassis: 'MA', catalog_tier: 'core',
    source_url: 'https://www.tamiya.com/english/products/18647/index.html',
    description: 'Official Tamiya Starter Pack — Blast Arrow body on MA chassis, bundled with tools and upgrade hardware from the factory.' },
  { item_no: '18710', name: 'Mini 4WD Starter Pack FM-A Balanced Spec', chassis: 'FM-A', catalog_tier: 'core',
    source_url: 'https://www.tamiyausa.com/shop/132-rev/jr-starter-pack-fm-a-balanced/',
    description: 'Official Tamiya Starter Pack — Rowdy Bull body on FM-A chassis, bundled with tools and upgrade hardware from the factory.' },

  // ── Advanced / B-MAX-oriented (9) ───────────────────────────────────
  { item_no: '95598', name: 'Neo-VQS Advanced Pack', chassis: 'VZ', catalog_tier: 'expansion',
    source_url: 'https://www.tamiyausa.com/shop/132-vs/jr-neo-vqs-advanced-pack/',
    description: 'A distinct Advanced Pack SKU (not the plain Neo-VQS, 18094, already in the catalog) bundling real upgrade parts with the kit. Component list is not published here until independently verified against the official product page.' },
  { item_no: '18658', name: 'Chevalier', chassis: 'MA', catalog_tier: 'expansion', source_url: '' },
  { item_no: '18659', name: 'Estoura', chassis: 'MA', catalog_tier: 'expansion',
    source_url: 'https://www.tamiyausa.com/shop/132-pro/jr-estoura/' },
  { item_no: '18650', name: 'DCR-02', chassis: 'MA', catalog_tier: 'expansion', source_url: '',
    description: 'Sibling kit to DCR-01 (18646) already in the catalog — a distinct item number, not a duplicate.' },
  { item_no: '18660', name: 'Stier', chassis: 'MA', catalog_tier: 'expansion', source_url: '' },
  { item_no: '18625', name: 'Dash-1 Emperor', chassis: 'MS', catalog_tier: 'expansion', motorType: 'Double-shaft', source_url: '' },
  { item_no: '18632', name: 'Dash-01 Super Emperor', chassis: 'MS', catalog_tier: 'expansion', motorType: 'Double-shaft', source_url: '' },
  { item_no: '18661', name: 'Lexus LBX Morizo RR', chassis: 'MA', catalog_tier: 'expansion', source_url: '' },
  { item_no: '18662', name: 'Avante Mk.III Nero (MS Chassis) Advanced Pack', chassis: 'MS', catalog_tier: 'expansion', motorType: 'Double-shaft', source_url: '',
    description: 'A distinct Advanced Pack SKU — not the plain Avante Mk.III Nero (18627) already in the catalog. Official advanced components: Light-Dash Motor PRO, FRP plates, mass dampers, brake components, high-speed EX gears, super-hard low-profile tires, low-friction rollers, tools.' },

  // ── Collector / Limited (4) ─────────────────────────────────────────
  { item_no: '95297', name: 'Sunny-Shuttle Premium', chassis: 'AR', catalog_tier: 'special_order', collector: true, source_url: '' },
  { item_no: '18069', name: 'Dash-1 Emperor Premium', chassis: 'Super-II', catalog_tier: 'special_order', collector: true, motorType: 'Double-shaft', source_url: '' },
  { item_no: '92453', name: 'Lexus LBX Morizo RR White Special', chassis: 'MA', catalog_tier: 'special_order', collector: true, source_url: '' },
  { item_no: '95703', name: 'Zenperor 3 Polycarbonate Body Special', chassis: 'VZ', catalog_tier: 'special_order', collector: true, source_url: '',
    description: 'Racing Mini 4WD 40th Anniversary Limited Edition — officially released by Tamiya. Not yet stocked or priced by Greenland Mini4WD; supplier availability and image permission are pending.' },

  // ── Coming Soon to Greenland (1) ────────────────────────────────────
  { item_no: '95190', name: 'Iron Beak', chassis: 'VZ', catalog_tier: 'special_order', source_url: '',
    description: 'Japan Cup 2026 special — officially released by Tamiya. "Coming Soon to Greenland" describes only that this shop has not yet stocked or priced it, not that Tamiya has not released it.' },
].map((item, i) => {
  const shopGroup = SHOP_GROUP_BY_ITEM_NO[item.item_no];
  const slug = item.name.toLowerCase().replace(/[().]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return {
    item_no: item.item_no,
    name: item.name,
    category: 'cars',
    subcategory: 'Mini 4WD Kit',
    chassis: item.chassis,
    compatibility: [item.chassis],
    motor_type: item.motorType ?? 'Single-shaft',
    beginner_level: shopGroup === 'beginner_basic' || shopGroup === 'official_starter_pack' ? 'Beginner' : 'Intermediate',
    upgrade_stage: 'Box Stock',
    purpose_tags:
      shopGroup === 'beginner_basic' ? ['First Car', 'Box Stock'] :
      shopGroup === 'official_starter_pack' ? ['Starter Pack', 'Box Stock', 'Includes Tools'] :
      shopGroup === 'advanced_bmax' ? ['B-MAX Base', 'Advanced'] :
      shopGroup === 'collector_limited' ? ['Collector'] :
      ['Coming Soon'],
    bmax_approved: shopGroup === 'beginner_basic' || shopGroup === 'official_starter_pack' || shopGroup === 'advanced_bmax',
    catalog_tier: item.catalog_tier,
    recommended: false,
    description: item.description ?? 'Officially released Tamiya kit; not yet stocked or priced by Greenland Mini4WD — pending Philippine supplier verification.',
    source_url: item.source_url,
    image_url: '',
    image_status: 'needs approved upload',
    price_dkk: 0,
    original_price_dkk: 0,
    stock_qty: 0,
    unbuilt_stock: 0,
    built_stock: 0,
    status: 'coming soon',
    published: false,
    available: false,
    is_collectors_vault: !!item.collector,
    catalog_order: 88 + i,
    id: `tamiya-${item.item_no}-${slug}`,
  };
});

// The shared Mini 4WD display-case accessory (docs/CATALOG-COSTING-AND-FREIGHT.md
// §"Display case", lib/pricing/displayCase.ts — mirrored here, not imported,
// same reasoning as the shipping-class constants above: keep both in sync if
// the locked display-case prices ever change). ONE record, ONE shared SKU —
// never a per-car variant. `price_dkk`/`approved_regular_price_dkk` carry
// the standalone price (229 DKK); the bundled price (189 DKK) is a
// service-add-on override applied only inside a car order
// (lib/pricing/serviceAddOns.ts), not a second catalog row.
const DISPLAY_CASE_CATALOG_ITEM = {
  item_no: 'display-case',
  name: 'Mini 4WD Display Case',
  category: 'accessories',
  subcategory: 'Display Case',
  chassis: '',
  compatibility: ['Universal'],
  motor_type: 'Not applicable',
  beginner_level: 'All levels',
  upgrade_stage: 'Accessory',
  purpose_tags: ['Display', 'Storage'],
  bmax_approved: false,
  catalog_tier: 'core',
  recommended: false,
  description: 'Shared display case — one stock pool used for both a standalone purchase and a car-plus-case bundle. Supplier cost (300 PHP/case) is a known assumption pending later receipt verification; the 229 DKK standalone / 189 DKK bundled prices are locked and independently margin-verified (lib/pricing/displayCase.ts).',
  source_url: '',
  image_url: '',
  image_status: 'needs approved upload',
  price_dkk: 229,
  original_price_dkk: 0,
  stock_qty: 0, // no confirmed on-hand count yet — never fabricated
  unbuilt_stock: 0,
  built_stock: 0,
  status: 'coming soon',
  published: false,
  available: false,
  is_collectors_vault: false,
  catalog_order: 117,
  id: 'display-case',
};

function classifyShippingClass(item) {
  if (item.category === 'cars') return 'complete_car_kit';
  if (item.category === 'accessories') return 'accessory_large';
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
const existingItems = JSON.parse(raw);

// Append any new catalog items (idempotent: skip if already present from a
// prior run) before running classification/pricing over the full set.
const items = [...existingItems];
let addedCount = 0;
for (const newItem of [...NEW_CATALOG_ITEMS, DISPLAY_CASE_CATALOG_ITEM]) {
  if (!items.some(i => i.item_no === newItem.item_no)) {
    items.push(newItem);
    addedCount += 1;
  }
}

let appliedCount = 0;
let collectorCorrectedCount = 0;
let correctedCount = 0;
const updated = items.map(item => {
  const correction = ITEM_CORRECTIONS_BY_ITEM_NO[item.item_no];
  const corrected = correction ? { ...item, ...correction } : item;
  if (correction) correctedCount += 1;

  const shipping_class = classifyShippingClass(corrected);
  const part_group = classifyPartGroup(corrected);
  const approvedDkk = APPROVED_CAR_PRICES_DKK_BY_ITEM_NO[corrected.item_no];
  const collectorDkk = COLLECTOR_PRICE_CORRECTIONS_DKK_BY_ITEM_NO[corrected.item_no];

  const next = {
    ...corrected,
    shipping_class,
    part_group,
    is_complete_car_kit: corrected.category === 'cars',
    is_club_asset: false, // none of the curated items are club/house/demo assets
    // Catalog VISIBILITY fields (docs/PRODUCT-PRICING-POLICY.md §"Catalog
    // visibility") — none of the curated/added items have an unresolved
    // identity problem, so every one of these is false; kept as explicit
    // per-item fields (not inferred) so an admin can flag one later without
    // a schema change.
    has_unresolved_duplicate: false,
    has_uncertain_edition: false,
    is_internal_test_record: false,
    is_archived_by_admin: false,
    // Public-state inputs (lib/pricing/publicProductState.ts) not already
    // covered by existing fields.
    is_preorder_enabled: false,
    force_coming_soon: false,
    // Shop-group taxonomy (docs/CATALOG-COSTING-AND-FREIGHT.md §"Shop
    // groups") — cars come from the lookup above; parts are
    // 'parts_upgrades'; the shared display-case accessory (added below) is
    // 'accessories'.
    shop_group:
      corrected.category === 'cars' ? SHOP_GROUP_BY_ITEM_NO[corrected.item_no] :
      corrected.category === 'accessories' ? 'accessories' :
      'parts_upgrades',
    // Image infrastructure fields (docs image-system proposal) — every row
    // in this static catalog is currently a placeholder; none of these
    // fields is invented as a real asset. image_path/thumbnail_path/
    // promotional_image_path stay null until a real, permitted image file
    // actually exists on disk — never a guessed path presented as real.
    image_path: null,
    thumbnail_path: null,
    promotional_image_path: null,
    image_status: 'placeholder',
    image_source_type: 'placeholder',
    image_source_reference: '',
    image_permission_status: 'not_applicable',
    image_alt_text: `${corrected.name} — item #${corrected.item_no} — placeholder pending an approved product image`,
  };

  if (corrected.item_no === 'display-case') {
    // Standalone approved price (lib/pricing/displayCase.ts) — the bundled
    // 189 DKK price is a service-add-on override applied only inside a car
    // order, not a second value on this catalog row.
    next.pricing_source = 'board_approved_fixed_price';
    next.approved_regular_price_dkk = 229;
    next.price_dkk = 229;
  } else if (collectorDkk != null) {
    // Collector correction always wins and always forces the explicit tag —
    // never inferred from the name (docs/PRODUCT-PRICING-POLICY.md
    // §"Collector regular margin").
    next.is_collectors_vault = true;
    next.pricing_source = 'board_approved_fixed_price';
    next.approved_regular_price_dkk = collectorDkk;
    next.price_dkk = collectorDkk;
    collectorCorrectedCount += 1;
  } else if (approvedDkk != null) {
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

console.log(`Classified ${updated.length} products (shipping_class + part_group + pricing_source + visibility + shop_group + image fields).`);
console.log(`Applied board-approved fixed (non-collector) prices to ${appliedCount} car kits by item_no.`);
console.log(`Applied Collector-margin-corrected prices to ${collectorCorrectedCount} car kits by item_no.`);
console.log(`Applied data-quality corrections to ${correctedCount} existing row(s) (ITEM_CORRECTIONS_BY_ITEM_NO).`);
console.log(`Added ${addedCount} new catalog item(s) this run (${NEW_CATALOG_ITEMS.length} defined, rest already present).`);
console.log('Unmatched approved-name entries (documented, not applied):');
for (const u of UNMATCHED_APPROVED_NAMES) {
  console.log(`  - ${u.name} (${u.approvedPriceDkk} DKK): ${u.note}`);
}

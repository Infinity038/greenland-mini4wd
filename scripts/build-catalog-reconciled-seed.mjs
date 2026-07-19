#!/usr/bin/env node
// Regenerates catalog/bmax-catalog-reconciled-seed.json from
// catalog/bmax-initial-catalog.json plus the 14 live-existing rows already
// captured in the current seed file (their values came from a live Supabase
// snapshot in an earlier pass and are never re-derived here — see the
// PRESERVED_EXISTING block below, which is the only place existing-row data
// is read from).
//
// OWNER DECISION (this rollout): missing/unapproved price is NO LONGER a
// blocker for catalog inclusion. A candidate row is blocked only for a
// genuine data-integrity problem: missing/duplicate item_no, invalid
// category, missing name, invalid stock, or one of the source catalog's own
// identity/verification flags (has_uncertain_edition, has_unresolved_duplicate,
// is_internal_test_record, is_archived_by_admin). price_on_request=true is
// set (never a fake 0 price) whenever the source lacks a board-approved
// price; price_dkk is null in that case, never 0 or a guess.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (...p) => JSON.parse(readFileSync(path.join(ROOT, ...p), 'utf-8'));

const catalog = readJson('catalog', 'bmax-initial-catalog.json');
const currentSeed = readJson('catalog', 'bmax-catalog-reconciled-seed.json');
const posterManifest = readJson('scripts', 'catalog-poster-images-full-manifest.json');

const posterByItemNo = new Map(posterManifest.map(entry => [String(entry.item_no).trim(), entry]));

function posterUrlFor(itemNo) {
  const entry = posterByItemNo.get(String(itemNo).trim());
  return entry ? `/catalog/products/${entry.deployment_filename}` : null;
}

// ── Existing 14 live rows: preserved exactly, with only the two
// deterministic corrections this audit explicitly requires (never a
// wholesale re-derivation of live data, which stays out of scope here). ──
const CHASSIS_CORRECTIONS = {
  // Owner-provided correction: item 19431 (Magnum Saber Premium box art) is
  // built on the Super-II chassis, not AR — the live row and its catalog
  // JSON counterpart both had it wrong.
  '19431': { chassis: 'Super-II', descriptionChassisFrom: 'AR Chassis', descriptionChassisTo: 'Super-II Chassis' },
};

const existing = currentSeed.existing.map(row => {
  const correction = CHASSIS_CORRECTIONS[row.item_no];
  const next = { ...row };
  if (correction) {
    next.chassis = correction.chassis;
    if (correction.descriptionChassisFrom && next.description.includes(correction.descriptionChassisFrom)) {
      next.description = next.description.replace(correction.descriptionChassisFrom, correction.descriptionChassisTo);
    }
  }
  // Single verified local poster only — no Cloudinary URL, no comma-separated
  // secondary images, no legacy carousel. A row without an exact manifest
  // match gets '' (the durable fallback ProductImage renders for that).
  const poster = posterUrlFor(row.item_no);
  next.image_url = poster || '';
  next.posterMatched = !!poster;
  next.price_on_request = false; // all 14 existing rows already have a real live price
  return next;
});

const existingItemNos = new Set(existing.map(r => r.item_no));

// ── Candidate rows: every catalog record whose item_no isn't already live ──
const CATEGORY_MAP = { cars: 'cars', parts: 'parts', accessories: 'merchandise' };
const VALID_SOURCE_CATEGORIES = new Set(Object.keys(CATEGORY_MAP));

const seenCandidateItemNos = new Map(); // item_no -> count, for duplicate detection within the source file itself
for (const r of catalog) {
  const key = String(r.item_no || '').trim();
  seenCandidateItemNos.set(key, (seenCandidateItemNos.get(key) || 0) + 1);
}

const candidates = catalog.filter(r => !existingItemNos.has(String(r.item_no || '').trim()));

const newRows = [];
const blockedRows = [];

for (const r of candidates) {
  const itemNo = String(r.item_no || '').trim();
  const errors = [];

  if (!itemNo) errors.push('missing/blank item_no');
  if (itemNo && seenCandidateItemNos.get(itemNo) > 1) errors.push(`duplicate item_no in source catalog (${seenCandidateItemNos.get(itemNo)}x)`);
  if (!r.name || !String(r.name).trim()) errors.push('missing name');
  if (!VALID_SOURCE_CATEGORIES.has(r.category)) errors.push(`invalid category: ${r.category}`);
  if ((r.stock_qty ?? 0) < 0 || (r.unbuilt_stock ?? 0) < 0 || (r.built_stock ?? 0) < 0) errors.push('invalid (negative) stock value');
  if (!r.description || !String(r.description).trim()) errors.push('missing description');
  if (r.has_uncertain_edition) errors.push('unverified product identity: has_uncertain_edition');
  if (r.has_unresolved_duplicate) errors.push('unverified product identity: has_unresolved_duplicate');
  if (r.is_internal_test_record) errors.push('description verification failure: is_internal_test_record');
  if (r.is_archived_by_admin) errors.push('description verification failure: is_archived_by_admin');

  const hasApprovedPrice = r.pricing_source === 'board_approved_fixed_price' && typeof r.approved_regular_price_dkk === 'number' && r.approved_regular_price_dkk > 0;
  const poster = posterUrlFor(itemNo);

  const row = {
    source: 'catalog_new',
    item_no: itemNo,
    name: r.name,
    description: r.description,
    chassis: r.chassis || '',
    type: 'boxed',
    category: CATEGORY_MAP[r.category] || r.category,
    subcategory: r.subcategory || null,
    // Never a fake/guessed price. Only ever the source's own board-approved
    // figure, or null — price_on_request is the only thing that ever
    // signals "no price yet."
    price_dkk: hasApprovedPrice ? r.approved_regular_price_dkk : null,
    original_price_dkk: null,
    price_on_request: !hasApprovedPrice,
    stock_qty: r.stock_qty ?? 0,
    unbuilt_stock: r.unbuilt_stock ?? 0,
    built_stock: r.built_stock ?? 0,
    status: r.status || 'coming soon',
    available: false,
    is_collectors_vault: false,
    image_url: poster || '',
    item_number: null,
    posterMatched: !!poster,
    validationErrors: errors,
    sourceUrl: r.source_url || null,
  };

  if (errors.length > 0) blockedRows.push(row);
  else newRows.push(row);
}

const seed = {
  generatedFrom: {
    ...currentSeed.generatedFrom,
    regeneratedAt: new Date().toISOString().slice(0, 10),
    rolloutPhase: 'price-on-request (owner decision: missing price no longer blocks catalog inclusion)',
  },
  existing,
  new: newRows,
  blocked: blockedRows,
};

writeFileSync(path.join(ROOT, 'catalog', 'bmax-catalog-reconciled-seed.json'), JSON.stringify(seed, null, 2) + '\n');

console.log('existing:', existing.length);
console.log('new:', newRows.length, '(price_on_request:', newRows.filter(r => r.price_on_request).length, ', approved price:', newRows.filter(r => !r.price_on_request).length, ')');
console.log('blocked:', blockedRows.length);
if (blockedRows.length) {
  console.log('blocked reasons:');
  for (const row of blockedRows) console.log(' ', row.item_no, '-', row.validationErrors.join('; '));
}
console.log('total (existing+new):', existing.length + newRows.length);
console.log('poster matches (existing+new):', existing.filter(r => r.posterMatched).length + newRows.filter(r => r.posterMatched).length);

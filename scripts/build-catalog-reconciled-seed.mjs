#!/usr/bin/env node
// Regenerates catalog/bmax-catalog-reconciled-seed.json from
// catalog/bmax-initial-catalog.json plus the 14 live-existing rows already
// captured in the current seed file.
//
// Catalog descriptions are deliberately conservative. They contain only the
// product identity, product class, and chassis/compatibility already tied to
// the exact item_no. Inventory, supplier, pricing, performance and internal
// sales guidance never belong in the public description.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (...p) => JSON.parse(readFileSync(path.join(ROOT, ...p), 'utf-8'));

const catalog = readJson('catalog', 'bmax-initial-catalog.json');
const currentSeed = readJson('catalog', 'bmax-catalog-reconciled-seed.json');
const posterManifest = readJson('scripts', 'catalog-poster-images-full-manifest.json');
const pricingPlan = readJson('catalog', 'lils-pricing-plan.json');

const posterByItemNo = new Map(posterManifest.map(entry => [String(entry.item_no).trim(), entry]));
const priceByItemNo = new Map(Object.entries(pricingPlan.prices));
const priceOnRequestItemNos = new Set(pricingPlan.priceOnRequest);
const approvedFixedItemNos = new Set(pricingPlan.approvedFixed);
const manualVerifiedItemNos = new Set(pricingPlan.manualVerified);
const builtSurchargeDkk = pricingPlan.pricingRules.builtSurchargeDkk;
const bundledCaseDkk = pricingPlan.pricingRules.bundledCaseDkk;

function posterUrlFor(itemNo) {
  const entry = posterByItemNo.get(String(itemNo).trim());
  return entry ? `/catalog/products/${entry.deployment_filename}` : null;
}

function officialSourceUrl(itemNo, suppliedUrl = null) {
  if (suppliedUrl && String(suppliedUrl).trim()) return String(suppliedUrl).trim();
  const normalized = String(itemNo || '').trim();
  return /^\d{5}$/.test(normalized)
    ? `https://www.tamiya.com/english/products/${normalized}/index.html`
    : null;
}

function normalizeChassis(chassis) {
  return String(chassis || '').trim();
}

function publicDescription({ itemNo, name, category, chassis }) {
  const productName = String(name || '').trim();
  const normalizedChassis = normalizeChassis(chassis);

  if (String(itemNo) === 'display-case') {
    return 'Protective display case sized for a Mini 4WD car.';
  }

  if (category === 'cars') {
    const chassisText = normalizedChassis
      ? ` using the ${normalizedChassis} Chassis`
      : '';
    return `${productName} is a Tamiya Mini 4WD assembly kit${chassisText}.`;
  }

  if (category === 'parts') {
    const compatibility = normalizedChassis && normalizedChassis !== 'Universal'
      ? ` intended for ${normalizedChassis} chassis applications`
      : '';
    return `${productName} is a Tamiya Mini 4WD Grade-Up Part${compatibility}. Check the product packaging for included components and compatibility before installation.`;
  }

  return `${productName} is a Mini 4WD accessory. Check the product details for dimensions and compatibility.`;
}

function descriptionAudit(itemNo, suppliedUrl, notes = null) {
  const sourceUrl = officialSourceUrl(itemNo, suppliedUrl);
  return {
    status: sourceUrl ? 'conservative_verified' : 'internal_spec_verified',
    sourceUrl,
    sourceType: sourceUrl ? 'official_or_recorded_product_source' : 'internal_product_spec',
    unresolvedFields: [],
    notes: notes || 'Description intentionally limited to product identity, product class, and recorded chassis/compatibility.',
  };
}

function pricingSourceFor(itemNo) {
  const key = String(itemNo).trim();
  if (approvedFixedItemNos.has(key)) return 'approved_fixed';
  if (manualVerifiedItemNos.has(key)) return 'lils_manual_verified';
  if (priceOnRequestItemNos.has(key)) return 'price_on_request';
  return 'lils_exact_sku';
}

function applyPricing(row) {
  const key = String(row.item_no).trim();
  const rawPrice = priceByItemNo.get(key);
  const price = typeof rawPrice === 'number' && rawPrice > 0 ? rawPrice : null;
  const onRequest = priceOnRequestItemNos.has(key) || price === null;

  row.price_dkk = onRequest ? null : price;
  row.price_on_request = onRequest;
  row.original_price_dkk = null;
  row.pricingSource = pricingSourceFor(key);

  if (row.category === 'cars') {
    row.unbuilt_price_dkk = onRequest ? null : price;
    row.built_price_dkk = onRequest ? null : price + builtSurchargeDkk;
    row.unbuilt_case_price_dkk = onRequest ? null : price + bundledCaseDkk;
    row.built_case_price_dkk = onRequest ? null : price + builtSurchargeDkk + bundledCaseDkk;
    row.unbuilt_original_price_dkk = null;
    row.unbuilt_case_original_price_dkk = null;
    row.built_original_price_dkk = null;
    row.built_case_original_price_dkk = null;
  }

  return row;
}

// Existing 14 live rows stay authoritative for non-pricing commercial fields.
// This pass normalizes catalog images, replaces public descriptions with the
// conservative item_no-based wording above, and applies the owner-approved
// pricing manifest. Item 19431 has one explicit chassis correction.
const existing = currentSeed.existing.map(row => {
  const next = { ...row };
  if (next.item_no === '19431') next.chassis = 'Super-II';

  next.description = publicDescription({
    itemNo: next.item_no,
    name: next.name,
    category: next.category,
    chassis: next.chassis,
  });
  next.descriptionAudit = descriptionAudit(next.item_no, next.sourceUrl, next.item_no === '19431'
    ? 'Owner-approved correction: Magnum Saber Premium uses the Super-II chassis.'
    : null);
  next.sourceUrl = next.descriptionAudit.sourceUrl;

  // Exactly one verified local poster. No Cloudinary URL and no comma-separated
  // secondary image. Missing posters use the durable image fallback.
  const poster = posterUrlFor(next.item_no);
  next.image_url = poster || '';
  next.posterMatched = !!poster;
  next.validationErrors = [];
  return applyPricing(next);
});

const existingItemNos = new Set(existing.map(r => r.item_no));
const CATEGORY_MAP = { cars: 'cars', parts: 'parts', accessories: 'merchandise' };
const VALID_SOURCE_CATEGORIES = new Set(Object.keys(CATEGORY_MAP));

const seenCandidateItemNos = new Map();
for (const row of catalog) {
  const key = String(row.item_no || '').trim();
  seenCandidateItemNos.set(key, (seenCandidateItemNos.get(key) || 0) + 1);
}

const candidates = catalog.filter(row => !existingItemNos.has(String(row.item_no || '').trim()));
const newRows = [];
const blockedRows = [];

for (const sourceRow of candidates) {
  const itemNo = String(sourceRow.item_no || '').trim();
  const errors = [];

  if (!itemNo) errors.push('missing/blank item_no');
  if (itemNo && seenCandidateItemNos.get(itemNo) > 1) errors.push(`duplicate item_no in source catalog (${seenCandidateItemNos.get(itemNo)}x)`);
  if (!sourceRow.name || !String(sourceRow.name).trim()) errors.push('missing name');
  if (!VALID_SOURCE_CATEGORIES.has(sourceRow.category)) errors.push(`invalid category: ${sourceRow.category}`);
  if ((sourceRow.stock_qty ?? 0) < 0 || (sourceRow.unbuilt_stock ?? 0) < 0 || (sourceRow.built_stock ?? 0) < 0) errors.push('invalid (negative) stock value');
  if (sourceRow.has_uncertain_edition) errors.push('unverified product identity: has_uncertain_edition');
  if (sourceRow.has_unresolved_duplicate) errors.push('unverified product identity: has_unresolved_duplicate');
  if (sourceRow.is_internal_test_record) errors.push('description verification failure: is_internal_test_record');
  if (sourceRow.is_archived_by_admin) errors.push('description verification failure: is_archived_by_admin');
  if (!priceByItemNo.has(itemNo) && !priceOnRequestItemNos.has(itemNo)) errors.push('item_no missing from pricing manifest');

  const poster = posterUrlFor(itemNo);
  const mappedCategory = CATEGORY_MAP[sourceRow.category] || sourceRow.category;
  const chassis = itemNo === '19431' ? 'Super-II' : (sourceRow.chassis || '');
  const audit = descriptionAudit(itemNo, sourceRow.source_url);

  const row = applyPricing({
    source: 'catalog_new',
    item_no: itemNo,
    name: String(sourceRow.name || '').trim(),
    description: publicDescription({
      itemNo,
      name: sourceRow.name,
      category: mappedCategory,
      chassis,
    }),
    descriptionAudit: audit,
    chassis,
    type: 'boxed',
    category: mappedCategory,
    subcategory: sourceRow.subcategory || null,
    stock_qty: sourceRow.stock_qty ?? 0,
    unbuilt_stock: sourceRow.unbuilt_stock ?? 0,
    built_stock: sourceRow.built_stock ?? 0,
    status: sourceRow.status || 'coming soon',
    available: false,
    is_collectors_vault: false,
    image_url: poster || '',
    item_number: null,
    posterMatched: !!poster,
    validationErrors: errors,
    sourceUrl: audit.sourceUrl,
  });

  if (errors.length > 0) blockedRows.push(row);
  else newRows.push(row);
}

const allRows = [...existing, ...newRows];
const seed = {
  generatedFrom: {
    ...currentSeed.generatedFrom,
    regeneratedAt: new Date().toISOString().slice(0, 10),
    rolloutPhase: "Lil's-reference pricing with conservative description audit",
  },
  auditSummary: {
    total: allRows.length,
    conservativeVerified: allRows.filter(row => row.descriptionAudit?.status === 'conservative_verified').length,
    internalSpecVerified: allRows.filter(row => row.descriptionAudit?.status === 'internal_spec_verified').length,
    priced: allRows.filter(row => !row.price_on_request).length,
    priceOnRequest: allRows.filter(row => row.price_on_request).length,
    blocked: blockedRows.length,
  },
  existing,
  new: newRows,
  blocked: blockedRows,
};

writeFileSync(path.join(ROOT, 'catalog', 'bmax-catalog-reconciled-seed.json'), JSON.stringify(seed, null, 2) + '\n');

console.log('existing:', existing.length);
console.log('new:', newRows.length, '(price_on_request:', newRows.filter(r => r.price_on_request).length, ', priced:', newRows.filter(r => !r.price_on_request).length, ')');
console.log('blocked:', blockedRows.length);
console.log('total (existing+new):', allRows.length);
console.log('priced (existing+new):', allRows.filter(r => !r.price_on_request).length);
console.log('price_on_request (existing+new):', allRows.filter(r => r.price_on_request).length);
console.log('poster matches (existing+new):', allRows.filter(r => r.posterMatched).length);
console.log('descriptions audited:', allRows.filter(r => r.descriptionAudit).length);
if (blockedRows.length) {
  console.log('blocked reasons:');
  for (const row of blockedRows) console.log(' ', row.item_no, '-', row.validationErrors.join('; '));
}

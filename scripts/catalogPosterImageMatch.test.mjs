// Dependency-free tests for the catalog poster image matcher — uses
// Node's built-in test runner (node:test/node:assert), not Vitest, since
// this branch has no test framework installed. Run with:
//   node --test scripts/catalogPosterImageMatch.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildReplacementImageUrl,
  buildStaticImagePath,
  matchManifestToLiveProducts,
} from './catalogPosterImageMatch.mjs';

function manifestEntry(overrides = {}) {
  return {
    item_no: '18099',
    product_name: 'Ray Spear',
    deployment_filename: '18099-ray-spear.webp',
    ...overrides,
  };
}

function liveProduct(overrides = {}) {
  return {
    id: 'product-1',
    item_no: '18099',
    name: 'Ray Spear',
    image_url: 'https://res.cloudinary.com/example/old.png',
    ...overrides,
  };
}

test('buildStaticImagePath builds the site-relative path convention', () => {
  assert.equal(buildStaticImagePath('18099-ray-spear.webp'), '/catalog/products/18099-ray-spear.webp');
});

test('matches strictly by item_no, never by name', () => {
  const result = matchManifestToLiveProducts(
    [manifestEntry({ product_name: 'Completely Different Name' })],
    [liveProduct()]
  );
  assert.equal(result.matched.length, 1);
  assert.equal(result.matched[0].productId, 'product-1');
  assert.equal(result.matched[0].newImageUrl, '/catalog/products/18099-ray-spear.webp');
});

test('a manifest item_no with no matching live product is reported as unmatched, never guessed', () => {
  const result = matchManifestToLiveProducts(
    [manifestEntry({ item_no: '99999' })],
    [liveProduct({ item_no: '18099' })]
  );
  assert.equal(result.matched.length, 0);
  assert.deepEqual(result.unmatchedManifestItemNos, ['99999']);
});

test('a live product with no corresponding manifest poster is left completely untouched', () => {
  const result = matchManifestToLiveProducts(
    [manifestEntry({ item_no: '18099' })],
    [liveProduct({ id: 'product-1', item_no: '18099' }), liveProduct({ id: 'product-2', item_no: '19440' })]
  );
  assert.equal(result.matched.length, 1);
  assert.equal(result.matched[0].productId, 'product-1');
  // product-2 (19440) never appears anywhere in matched output.
  assert.ok(!result.matched.some(m => m.productId === 'product-2'));
});

test('an item_no matching more than one live product is reported as ambiguous, never auto-resolved', () => {
  const result = matchManifestToLiveProducts(
    [manifestEntry({ item_no: '18099' })],
    [liveProduct({ id: 'product-1', item_no: '18099' }), liveProduct({ id: 'product-2', item_no: '18099' })]
  );
  assert.equal(result.matched.length, 0);
  assert.deepEqual(result.ambiguousManifestItemNos, ['18099']);
});

test('never produces two updates for the same product id', () => {
  const result = matchManifestToLiveProducts(
    [manifestEntry({ item_no: '18099' }), manifestEntry({ item_no: '18704', deployment_filename: '18704-shadow-shark.webp' })],
    [liveProduct({ id: 'product-1', item_no: '18099' }), liveProduct({ id: 'product-2', item_no: '18704' })]
  );
  const productIds = result.matched.map(m => m.productId);
  assert.equal(new Set(productIds).size, productIds.length);
});

test('processes a full batch (95 manifest entries, only 11 with a live match) correctly', () => {
  const manifestEntries = [
    manifestEntry({ item_no: '18099' }),
    ...Array.from({ length: 84 }, (_, i) => manifestEntry({ item_no: `no-match-${i}`, deployment_filename: `no-match-${i}.webp` })),
  ];
  const liveProducts = [liveProduct({ id: 'product-1', item_no: '18099' })];
  const result = matchManifestToLiveProducts(manifestEntries, liveProducts);
  assert.equal(result.matched.length, 1);
  assert.equal(result.unmatchedManifestItemNos.length, 84);
});

test('buildReplacementImageUrl preserves an existing image as a secondary image', () => {
  const update = {
    productId: 'product-1',
    itemNo: '18099',
    productName: 'Ray Spear',
    newImageUrl: '/catalog/products/18099-ray-spear.webp',
    existingImageUrl: 'https://res.cloudinary.com/example/old.png',
  };
  assert.equal(
    buildReplacementImageUrl(update),
    '/catalog/products/18099-ray-spear.webp,https://res.cloudinary.com/example/old.png'
  );
});

test('buildReplacementImageUrl does not fabricate a secondary image when none existed', () => {
  const update = {
    productId: 'product-1',
    itemNo: '18099',
    productName: 'Ray Spear',
    newImageUrl: '/catalog/products/18099-ray-spear.webp',
    existingImageUrl: null,
  };
  assert.equal(buildReplacementImageUrl(update), '/catalog/products/18099-ray-spear.webp');
});

test('buildReplacementImageUrl treats an empty-string existing image the same as null', () => {
  const update = {
    productId: 'product-1',
    itemNo: '18099',
    productName: 'Ray Spear',
    newImageUrl: '/catalog/products/18099-ray-spear.webp',
    existingImageUrl: '   ',
  };
  assert.equal(buildReplacementImageUrl(update), '/catalog/products/18099-ray-spear.webp');
});

test('only ever proposes changes to image-related fields (matched output shape has no price/stock/status keys)', () => {
  const result = matchManifestToLiveProducts([manifestEntry()], [liveProduct()]);
  const keys = Object.keys(result.matched[0]);
  for (const forbidden of ['price', 'price_dkk', 'stock', 'stock_qty', 'status', 'available', 'category', 'description']) {
    assert.ok(!keys.includes(forbidden), `matched update must never include ${forbidden}`);
  }
});

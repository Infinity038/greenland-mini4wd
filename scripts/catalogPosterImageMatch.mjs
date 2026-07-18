// Pure, network-free matching logic for attaching a batch of finished
// catalog poster images to live public.products rows, strictly by Tamiya
// item_no. No Supabase client, no filesystem access — callers supply the
// manifest entries and the live product rows already fetched/read-only.
//
// SAFETY MODEL:
//   - item_no is the only matching key. Never matches by product name,
//     image heading, filename wording, or array order.
//   - Fails closed: any manifest item_no that does not resolve to exactly
//     one live product row is reported as unmatched, never guessed at and
//     never used to create a new product row.
//   - Never proposes writing more than one product per manifest entry, and
//     never proposes touching a product twice.
//   - Only ever proposes a change to image-related fields (image_url in
//     the current live schema — see docs/LIVE-SCHEMA-SECURITY-AUDIT.md).
//     Price, stock, status, and every other column are left alone by
//     construction: this module's output never contains them.

/**
 * @typedef {Object} ManifestEntry
 * @property {string} item_no
 * @property {string} product_name
 * @property {string} deployment_filename
 */
/**
 * @typedef {Object} LiveProduct
 * @property {string} id
 * @property {string} item_no
 * @property {string} name
 * @property {string | null} image_url
 */
/**
 * @typedef {Object} MatchedUpdate
 * @property {string} productId
 * @property {string} itemNo
 * @property {string} productName
 * @property {string} newImageUrl
 * @property {string | null} existingImageUrl
 */
/**
 * @typedef {Object} MatchResult
 * @property {MatchedUpdate[]} matched
 * @property {string[]} unmatchedManifestItemNos Manifest item_nos with zero matching live products.
 * @property {string[]} ambiguousManifestItemNos Manifest item_nos matching more than one live product (should never happen if item_no is unique, but never assumed).
 */

// Builds the site-relative static path this batch's images are served
// from. Kept as one function so the convention lives in exactly one place.
export function buildStaticImagePath(deploymentFilename) {
  return `/catalog/products/${deploymentFilename}`;
}

/**
 * @param {ManifestEntry[]} manifestEntries
 * @param {LiveProduct[]} liveProducts
 * @returns {MatchResult}
 */
export function matchManifestToLiveProducts(manifestEntries, liveProducts) {
  const productsByItemNo = new Map();
  for (const product of liveProducts) {
    const bucket = productsByItemNo.get(product.item_no) ?? [];
    bucket.push(product);
    productsByItemNo.set(product.item_no, bucket);
  }

  const matched = [];
  const unmatchedManifestItemNos = [];
  const ambiguousManifestItemNos = [];

  for (const entry of manifestEntries) {
    const candidates = productsByItemNo.get(entry.item_no) ?? [];
    if (candidates.length === 0) {
      unmatchedManifestItemNos.push(entry.item_no);
      continue;
    }
    if (candidates.length > 1) {
      // Fail closed — never guess which of several same-item_no rows is
      // the "real" one. This should not occur given item_no is expected to
      // be unique per product, but the matcher never assumes it.
      ambiguousManifestItemNos.push(entry.item_no);
      continue;
    }
    const product = candidates[0];
    matched.push({
      productId: product.id,
      itemNo: entry.item_no,
      productName: entry.product_name,
      newImageUrl: buildStaticImagePath(entry.deployment_filename),
      existingImageUrl: product.image_url ?? null,
    });
  }

  return { matched, unmatchedManifestItemNos, ambiguousManifestItemNos };
}

// Builds the final image_url value for a matched update — the new poster
// first (primary image), the existing image preserved as a secondary
// image when one exists and the UI's comma-separated multi-image format
// safely supports it (components/ProductImage's carousel). Never discards
// the existing image outright; never fabricates a value when none existed.
export function buildReplacementImageUrl(update) {
  if (!update.existingImageUrl || !update.existingImageUrl.trim()) {
    return update.newImageUrl;
  }
  return `${update.newImageUrl},${update.existingImageUrl.trim()}`;
}

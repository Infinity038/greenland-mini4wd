// Catalog visibility vs. purchase eligibility — docs/PRODUCT-PRICING-POLICY.md
// §3, docs/CATALOG-COSTING-AND-FREIGHT.md.
//
// LOCKED BUSINESS RULE (Preview review correction, supersedes the original
// "unverified cost = unpublished" rule): a product without a verified
// supplier cost stays PUBLICLY VISIBLE — it displays PRICE PENDING and is
// simply not purchasable. Visibility is hidden only for an identity
// problem: an unresolved duplicate item number, an uncertain product
// edition, an internal/test record, or explicit administrator archival.
// Zero stock, an unverified cost, a pending price, Expansion Stock, and
// Special Order status are never, by themselves, a reason to hide a product.

export type PricingSource = 'board_approved_fixed_price' | 'cost_plus_formula' | 'unverified';

export interface CatalogVisibilityFields {
  itemNo: string;
  hasUnresolvedDuplicate: boolean;
  hasUncertainEdition: boolean;
  isInternalTestRecord: boolean;
  isArchivedByAdmin: boolean;
}

export interface CatalogVisibilityResult {
  visible: boolean;
  reasons: string[]; // empty when visible
}

// Whether a product appears in the public catalog at all. Deliberately does
// NOT consider price/stock/tier — see isPurchasable() for that.
export function checkCatalogVisibility(item: CatalogVisibilityFields): CatalogVisibilityResult {
  const reasons: string[] = [];

  if (!item.itemNo || item.itemNo.trim() === '') {
    reasons.push('missing item identity (item_no)');
  }
  if (item.hasUnresolvedDuplicate) {
    reasons.push('unresolved duplicate item number');
  }
  if (item.hasUncertainEdition) {
    reasons.push('uncertain product edition');
  }
  if (item.isInternalTestRecord) {
    reasons.push('internal/test record');
  }
  if (item.isArchivedByAdmin) {
    reasons.push('archived by administrator');
  }

  return { visible: reasons.length === 0, reasons };
}

export interface PurchaseEligibilityFields {
  pricingSource: PricingSource;
  approvedRegularPriceDkkOre: number | null;
  isPurchasableState: boolean; // from PUBLIC_STATE_DISPLAY[state].isPurchasable — see publicProductState.ts
}

// Whether a (visible) product may actually be bought right now. A product
// can be visible and simultaneously not purchasable (out of stock, price
// pending, special order) — the two are intentionally independent checks.
export function isPurchasable(item: PurchaseEligibilityFields): boolean {
  if (item.pricingSource === 'unverified') return false;
  if (item.approvedRegularPriceDkkOre == null || item.approvedRegularPriceDkkOre <= 0) return false;
  return item.isPurchasableState;
}

export function findDuplicateItemNumbers(items: { itemNo: string }[]): string[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    counts.set(item.itemNo, (counts.get(item.itemNo) ?? 0) + 1);
  }
  return [...counts.entries()].filter(([, count]) => count > 1).map(([itemNo]) => itemNo);
}

// Human-readable reason for the admin catalog-status view's "missing-data
// reason" column — never shown to customers, who see PRICE PENDING instead.
export function missingDataReason(item: { pricingSource: PricingSource; supplierCostAmount: number | null; exchangeRateSnapshot: number | null }): string | null {
  if (item.pricingSource !== 'unverified') return null;
  const missing: string[] = [];
  if (item.supplierCostAmount == null) missing.push('supplier cost');
  if (item.exchangeRateSnapshot == null) missing.push('exchange-rate snapshot');
  return missing.length > 0 ? `Missing: ${missing.join(', ')}` : 'Pricing not yet approved';
}

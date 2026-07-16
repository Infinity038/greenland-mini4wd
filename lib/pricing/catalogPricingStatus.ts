// Publication gating for the pricing engine — docs/PRODUCT-PRICING-POLICY.md
// §3/§18. A product must never be published/available with an invented,
// missing, or placeholder price.

export type PricingSource = 'board_approved_fixed_price' | 'cost_plus_formula' | 'unverified';

export interface CatalogPricingFields {
  pricingSource: PricingSource;
  approvedRegularPriceDkkOre: number | null;
  itemNo: string;
}

export interface PublishabilityResult {
  publishable: boolean;
  reasons: string[]; // empty when publishable
}

// Pure per-item check. Duplicate-item-number checking is catalog-wide, not
// per-item — see findDuplicateItemNumbers() below.
export function checkPublishability(item: CatalogPricingFields): PublishabilityResult {
  const reasons: string[] = [];

  if (!item.itemNo || item.itemNo.trim() === '') {
    reasons.push('missing item identity (item_no)');
  }
  if (item.pricingSource === 'unverified') {
    reasons.push('unverified supplier cost / no approved price');
  }
  if (item.approvedRegularPriceDkkOre == null || item.approvedRegularPriceDkkOre <= 0) {
    reasons.push('zero or missing approved regular price');
  }

  return { publishable: reasons.length === 0, reasons };
}

export function findDuplicateItemNumbers(items: { itemNo: string }[]): string[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    counts.set(item.itemNo, (counts.get(item.itemNo) ?? 0) + 1);
  }
  return [...counts.entries()].filter(([, count]) => count > 1).map(([itemNo]) => itemNo);
}

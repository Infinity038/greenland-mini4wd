// Public catalog states — docs/PRODUCT-PRICING-POLICY.md / docs/CATALOG-COSTING-AND-FREIGHT.md.
//
// LOCKED BUSINESS RULE (Preview review correction): catalog visibility and
// purchase eligibility are separate concepts. A product is hidden from the
// public catalog only for an unresolved identity problem (duplicate item
// number, uncertain edition, internal/test record) or explicit admin
// archival — never for zero stock, an unverified cost, a pending price, or
// an Expansion/Special Order classification. See
// lib/pricing/catalogPricingStatus.ts for the visibility check itself; this
// module derives the seven supported *display* states for a visible product.

import type { PricingSource } from './catalogPricingStatus';

export type PublicProductState =
  | 'IN_STOCK'
  | 'OUT_OF_STOCK'
  | 'PREORDER'
  | 'SPECIAL_ORDER'
  | 'PRICE_PENDING'
  | 'COMING_SOON'
  | 'ARCHIVED';

export interface PublicStateInput {
  catalogVisible: boolean; // false only for unresolved duplicate/uncertain edition/internal-test/admin-archived
  pricingSource: PricingSource;
  stockQty: number;
  catalogTier: 'core' | 'expansion' | 'special_order';
  isPreorderEnabled: boolean; // explicit administrator opt-in — never inferred
  forceComingSoon: boolean; // explicit administrator flag for a teaser item, independent of pricing
}

// Pure, deterministic derivation — never reads live inventory or pricing
// itself, only the fields passed in. A product's public_state is computed
// at render/query time from these inputs, not stored redundantly, so it can
// never drift out of sync with the underlying data it's derived from.
export function derivePublicState(input: PublicStateInput): PublicProductState {
  if (!input.catalogVisible) return 'ARCHIVED';
  if (input.forceComingSoon) return 'COMING_SOON';
  if (input.pricingSource === 'unverified') return 'PRICE_PENDING';
  // Has an approved price from this point on.
  if (input.catalogTier === 'special_order') return 'SPECIAL_ORDER';
  if (input.isPreorderEnabled) return 'PREORDER';
  return input.stockQty > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK';
}

export interface PublicStateDisplay {
  badgeLabel: string;
  ctaLabel: string;
  ctaAction: 'reserve' | 'preorder' | 'restock_interest' | 'register_interest' | 'none';
  isPurchasable: boolean;
  showPrice: boolean;
  allowsRestockInterest: boolean;
}

export const PUBLIC_STATE_DISPLAY: Record<PublicProductState, PublicStateDisplay> = {
  IN_STOCK: { badgeLabel: '', ctaLabel: 'RESERVE', ctaAction: 'reserve', isPurchasable: true, showPrice: true, allowsRestockInterest: false },
  OUT_OF_STOCK: { badgeLabel: 'OUT OF STOCK', ctaLabel: 'REQUEST RESTOCK', ctaAction: 'restock_interest', isPurchasable: false, showPrice: true, allowsRestockInterest: true },
  PREORDER: { badgeLabel: 'PREORDER', ctaLabel: 'PREORDER', ctaAction: 'preorder', isPurchasable: true, showPrice: true, allowsRestockInterest: false },
  SPECIAL_ORDER: { badgeLabel: 'SPECIAL ORDER', ctaLabel: 'REGISTER INTEREST', ctaAction: 'register_interest', isPurchasable: false, showPrice: true, allowsRestockInterest: true },
  PRICE_PENDING: { badgeLabel: 'PRICE PENDING', ctaLabel: 'NOTIFY ME', ctaAction: 'restock_interest', isPurchasable: false, showPrice: false, allowsRestockInterest: true },
  COMING_SOON: { badgeLabel: 'COMING SOON', ctaLabel: 'NOTIFY ME', ctaAction: 'restock_interest', isPurchasable: false, showPrice: false, allowsRestockInterest: true },
  ARCHIVED: { badgeLabel: '', ctaLabel: '', ctaAction: 'none', isPurchasable: false, showPrice: false, allowsRestockInterest: false },
};

// Note: derivePublicState() only ever returns SPECIAL_ORDER after already
// ruling out an unverified price (that case resolves to PRICE_PENDING
// first), so SPECIAL_ORDER always has a real approved price to show —
// "REQUEST PRICE" / "REGISTER INTEREST" wording is what PRICE_PENDING
// already displays for a special-order item with no verified cost yet.

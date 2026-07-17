// Shared loader mapping raw catalog/bmax-initial-catalog.json rows into a
// display-ready shape, combining visibility (checkCatalogVisibility),
// public state (derivePublicState) and purchase eligibility (isPurchasable)
// into one place so /shop and the admin catalog-status view compute
// identically and never drift apart. Reads the bundled JSON file directly —
// no Supabase dependency, so it works the same in every environment.

import catalogRaw from '@/catalog/bmax-initial-catalog.json';
import { checkCatalogVisibility, isPurchasable, missingDataReason, type PricingSource } from './catalogPricingStatus';
import { derivePublicState, PUBLIC_STATE_DISPLAY, type PublicProductState } from './publicProductState';
import type { ShippingClass } from './shippingClasses';

export interface RawCatalogItem {
  item_no: string;
  name: string;
  category: 'cars' | 'parts';
  subcategory: string;
  chassis: string;
  compatibility: string[];
  description: string;
  image_url: string;
  price_dkk: number;
  original_price_dkk: number;
  stock_qty: number;
  status: string;
  is_collectors_vault: boolean;
  catalog_order: number;
  id: string;
  shipping_class: ShippingClass;
  part_group: string | null;
  is_complete_car_kit: boolean;
  is_club_asset: boolean;
  pricing_source: PricingSource;
  approved_regular_price_dkk: number | null;
  catalog_tier: 'core' | 'expansion' | 'special_order';
  has_unresolved_duplicate: boolean;
  has_uncertain_edition: boolean;
  is_internal_test_record: boolean;
  is_archived_by_admin: boolean;
  is_preorder_enabled: boolean;
  force_coming_soon: boolean;
}

export interface PublicCatalogItem {
  raw: RawCatalogItem;
  visible: boolean;
  publicState: PublicProductState;
  purchasable: boolean;
  priceDkk: number | null; // null unless PUBLIC_STATE_DISPLAY[state].showPrice AND a real approved price exists
  badgeLabel: string;
  ctaLabel: string;
  ctaAction: 'reserve' | 'preorder' | 'restock_interest' | 'register_interest' | 'none';
  allowsRestockInterest: boolean;
  // Admin-only ("admin catalog identifies exactly what's missing"), never
  // shown to customers — see PUBLIC_STATE_DISPLAY for the customer-facing
  // PRICE PENDING label instead. null when the product has an approved price.
  missingDataReason: string | null;
}

function toPublicCatalogItem(raw: RawCatalogItem): PublicCatalogItem {
  const visibility = checkCatalogVisibility({
    itemNo: raw.item_no,
    hasUnresolvedDuplicate: raw.has_unresolved_duplicate,
    hasUncertainEdition: raw.has_uncertain_edition,
    isInternalTestRecord: raw.is_internal_test_record,
    isArchivedByAdmin: raw.is_archived_by_admin,
  });

  const publicState = derivePublicState({
    catalogVisible: visibility.visible,
    pricingSource: raw.pricing_source,
    stockQty: raw.stock_qty,
    catalogTier: raw.catalog_tier,
    isPreorderEnabled: raw.is_preorder_enabled,
    forceComingSoon: raw.force_coming_soon,
  });

  const display = PUBLIC_STATE_DISPLAY[publicState];
  const purchasable = isPurchasable({
    pricingSource: raw.pricing_source,
    approvedRegularPriceDkkOre: raw.approved_regular_price_dkk != null ? raw.approved_regular_price_dkk * 100 : null,
    isPurchasableState: display.isPurchasable,
  });

  return {
    raw,
    visible: visibility.visible,
    publicState,
    purchasable,
    priceDkk: display.showPrice && raw.approved_regular_price_dkk != null ? raw.approved_regular_price_dkk : null,
    badgeLabel: display.badgeLabel,
    ctaLabel: display.ctaLabel,
    ctaAction: display.ctaAction,
    allowsRestockInterest: display.allowsRestockInterest,
    // The curated catalog does not track a separate supplier-cost/exchange-rate
    // pair (docs/CATALOG-COSTING-AND-FREIGHT.md) — both are honestly reported
    // as not-yet-recorded rather than invented, which is exactly what this
    // reason string is for.
    missingDataReason: missingDataReason({ pricingSource: raw.pricing_source, supplierCostAmount: null, exchangeRateSnapshot: null }),
  };
}

let cachedCatalog: PublicCatalogItem[] | null = null;

// All curated catalog items mapped to display-ready shape. Cached at module
// scope since the underlying JSON is static (bundled at build time) —
// re-running this on every render would be wasted work.
export function getAllCatalogItems(): PublicCatalogItem[] {
  if (!cachedCatalog) {
    cachedCatalog = (catalogRaw as RawCatalogItem[]).map(toPublicCatalogItem);
  }
  return cachedCatalog;
}

// The public catalog: every VISIBLE item, i.e. everything except an
// unresolved duplicate/uncertain edition/internal-test record/admin-archived
// row. This is what /shop renders — never filtered by price or stock.
export function getPublicCatalog(): PublicCatalogItem[] {
  return getAllCatalogItems().filter(item => item.visible);
}

export function getPublicCatalogByCategory(category: 'cars' | 'parts'): PublicCatalogItem[] {
  return getPublicCatalog().filter(item => item.raw.category === category);
}

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
  category: 'cars' | 'parts' | 'accessories';
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
  shop_group: ShopGroup;
  // Image infrastructure (docs/CATALOG-COSTING-AND-FREIGHT.md
  // §"Image system") — additive metadata. image_path/thumbnail_path/
  // promotional_image_path are null until a real, permitted image file
  // exists; a null/placeholder value here must never break rendering (see
  // components/ProductImage.tsx's durable fallback).
  image_path: string | null;
  thumbnail_path: string | null;
  promotional_image_path: string | null;
  image_source_type: 'user_owned_photo' | 'authorized_supplier_asset' | 'official_authorized_asset' | 'original_generated_background' | 'placeholder' | 'unknown';
  image_source_reference: string;
  image_permission_status: 'not_applicable' | 'pending' | 'granted' | 'denied';
  image_alt_text: string;
}

export type ShopGroup =
  | 'beginner_basic'
  | 'official_starter_pack'
  | 'advanced_bmax'
  | 'collector_limited'
  | 'coming_soon_greenland'
  | 'parts_upgrades'
  | 'accessories';

export const SHOP_GROUP_LABEL: Record<ShopGroup, string> = {
  beginner_basic: 'Beginner / Basic',
  official_starter_pack: 'Official Starter Packs',
  advanced_bmax: 'Advanced / B-MAX',
  collector_limited: "Collector's Vault",
  coming_soon_greenland: 'Coming Soon to Greenland',
  parts_upgrades: 'Parts & Upgrades',
  accessories: 'Accessories',
};

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
  shopGroup: ShopGroup;
  // "Coming Soon to Greenland" is a customer-facing distinction, not a
  // separate PublicProductState — a coming_soon_greenland item is still
  // technically PRICE_PENDING (see publicProductState.ts), but the badge
  // shown to customers should read "COMING SOON TO GREENLAND", never the
  // generic "PRICE PENDING", to make clear this is a real Tamiya release
  // Greenland simply hasn't stocked yet — not an unidentified/unverified item.
  customerStatusLabel: string;
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
    shopGroup: raw.shop_group,
    customerStatusLabel: raw.shop_group === 'coming_soon_greenland' && publicState === 'PRICE_PENDING' ? 'COMING SOON TO GREENLAND' : display.badgeLabel,
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

export function getPublicCatalogByCategory(category: 'cars' | 'parts' | 'accessories'): PublicCatalogItem[] {
  return getPublicCatalog().filter(item => item.raw.category === category);
}

export function getPublicCatalogByShopGroup(shopGroup: ShopGroup): PublicCatalogItem[] {
  return getPublicCatalog().filter(item => item.shopGroup === shopGroup);
}

// The one shared display-case accessory record — a thin, named convenience
// over getPublicCatalogByCategory('accessories'), since there is currently
// exactly one accessory in the catalog.
export function getDisplayCaseCatalogItem(): PublicCatalogItem | undefined {
  return getPublicCatalogByCategory('accessories')[0];
}

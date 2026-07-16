// Sale campaign engine — docs/SALE-CAMPAIGN-RULES.md. Pure functions only;
// no Supabase access here (see lib/pricing/campaignStore.ts for the
// Preview-only mock/seeded data layer this operates over).

import { minimumPriceForMarginOre, roundToEndingNineNotBelowFloor } from './money';
import type { ChassisFamily, PartGroup, PricedProduct } from './product';

export type CampaignType = 'standard_sale' | 'anniversary_sale' | 'clearance' | 'liquidation';

export const CAMPAIGN_TYPE_DEFAULT_MARGIN_FLOOR: Record<CampaignType, number> = {
  standard_sale: 0.4,
  anniversary_sale: 0.3,
  clearance: 0.2,
  liquidation: 0.0,
};

export const CAMPAIGN_TYPE_LABEL: Record<CampaignType, string> = {
  standard_sale: 'Standard Sale',
  anniversary_sale: 'Anniversary Sale',
  clearance: 'Clearance',
  liquidation: 'Liquidation',
};

export type ScopeRule =
  | { kind: 'all_products' }
  | { kind: 'all_complete_car_kits' }
  | { kind: 'all_upgrade_parts' }
  | { kind: 'category'; category: 'cars' | 'parts' }
  | { kind: 'part_group'; group: PartGroup }
  | { kind: 'chassis_family'; chassis: ChassisFamily }
  | { kind: 'starter_packs' }
  | { kind: 'collector_products' }
  | { kind: 'preorder_products' }
  | { kind: 'tags'; tags: string[] }
  | { kind: 'skus'; itemNos: string[] }
  | { kind: 'selected_products'; productIds: string[] }
  | { kind: 'inventory_older_than_days'; days: number };

export type ExclusionRule =
  | { kind: 'collector_products' }
  | { kind: 'preorder_products' }
  | { kind: 'special_orders' }
  | { kind: 'newly_arrived'; withinDays: number }
  | { kind: 'skus'; itemNos: string[] }
  | { kind: 'categories'; categories: ('cars' | 'parts')[] }
  | { kind: 'below_margin'; marginFloor: number };

export interface BelowCostOverride {
  reason: string;
  confirmedByUserId: string;
  secondConfirmedByUserId: string; // must differ from confirmedByUserId — enforced by the caller/RLS, not this pure function
  floorOre: number; // the explicit, administrator-chosen floor below landed cost
}

export interface SaleCampaign {
  id: string;
  name: string;
  type: CampaignType;
  requestedDiscountPercent: number; // 0..1, e.g. 0.2 for 20%
  minimumAllowedMargin: number; // defaults to CAMPAIGN_TYPE_DEFAULT_MARGIN_FLOOR[type]; admin may raise it, never silently lower it below the type default except via belowCostOverride on liquidation
  belowCostOverride?: BelowCostOverride; // liquidation only — see docs/SALE-CAMPAIGN-RULES.md §10
  startAt: string; // ISO datetime
  endAt: string; // ISO datetime
  enabled: boolean;
  badgeText: string;
  internalNote: string;
  publicDescription: string;
  createdBy: string;
  approvedBy?: string;
  createdAt: string;
  updatedAt: string;
  scope: ScopeRule[];
  exclusions: ExclusionRule[];
}

export function isCampaignActive(campaign: SaleCampaign, now: Date = new Date()): boolean {
  if (!campaign.enabled) return false;
  const start = new Date(campaign.startAt).getTime();
  const end = new Date(campaign.endAt).getTime();
  const t = now.getTime();
  return t >= start && t <= end;
}

function matchesScopeRule(product: PricedProduct, rule: ScopeRule): boolean {
  switch (rule.kind) {
    case 'all_products':
      return true;
    case 'all_complete_car_kits':
      return product.category === 'cars' && product.isCompleteCarKit;
    case 'all_upgrade_parts':
      return product.category === 'parts';
    case 'category':
      return product.category === rule.category;
    case 'part_group':
      return product.category === 'parts' && product.partGroup === rule.group;
    case 'chassis_family':
      return product.chassis === rule.chassis;
    case 'starter_packs':
      return product.tags.includes('Starter Pack');
    case 'collector_products':
      return product.isCollectorsVault;
    case 'preorder_products':
      return product.isPreorder;
    case 'tags':
      return rule.tags.some(t => product.tags.includes(t));
    case 'skus':
      return rule.itemNos.includes(product.itemNo);
    case 'selected_products':
      return rule.productIds.includes(product.id);
    case 'inventory_older_than_days':
      return product.daysSinceStockReceipt != null && product.daysSinceStockReceipt >= rule.days;
  }
}

function matchesExclusionRule(product: PricedProduct, rule: ExclusionRule): boolean {
  switch (rule.kind) {
    case 'collector_products':
      return product.isCollectorsVault;
    case 'preorder_products':
      return product.isPreorder;
    case 'special_orders':
      return product.isSpecialOrder;
    case 'newly_arrived':
      return product.isNewlyArrived || (product.daysSinceStockReceipt != null && product.daysSinceStockReceipt < rule.withinDays);
    case 'skus':
      return rule.itemNos.includes(product.itemNo);
    case 'categories':
      return rule.categories.includes(product.category);
    case 'below_margin': {
      const currentMargin = (product.regularPriceOre - product.landedCostOre) / product.regularPriceOre;
      return currentMargin < rule.marginFloor;
    }
  }
}

// Club assets are never eligible for any campaign, regardless of scope —
// enforced here rather than trusted to every scope rule individually.
export function productMatchesCampaign(product: PricedProduct, campaign: SaleCampaign, now: Date = new Date()): boolean {
  if (product.isClubAsset) return false;
  if (!isCampaignActive(campaign, now)) return false;
  const inScope = campaign.scope.some(rule => matchesScopeRule(product, rule));
  if (!inScope) return false;
  const excluded = campaign.exclusions.some(rule => matchesExclusionRule(product, rule));
  return !excluded;
}

export interface CampaignPriceResult {
  campaignId: string;
  campaignName: string;
  badgeText: string;
  requestedPriceOre: number; // regular price * (1 - discount), before ending-9 rounding
  finalPriceOre: number;
  wasMarginCapped: boolean;
  effectiveDiscountPercent: number; // based on finalPriceOre, may be less than requestedDiscountPercent when capped
  marginFloorOre: number;
  // True when the margin floor pushed finalPriceOre to or above the
  // product's own regular price — i.e. capping left no real discount at
  // all. Such a candidate must never be displayed as a "sale" (it would
  // show a price at or above the regular price) and is excluded from
  // resolveBestCampaignForProduct()'s `applied` pick, though it still
  // appears in `allCandidates` so admin preview can show why the product
  // was effectively excluded.
  noValidDiscount: boolean;
}

// Computes what a single campaign would charge for a single product. Caller
// is responsible for confirming productMatchesCampaign() first — this
// function does not re-check scope/exclusions/schedule, only the price math.
export function calculateCampaignPrice(product: PricedProduct, campaign: SaleCampaign): CampaignPriceResult {
  const requestedPriceOre = Math.round(product.regularPriceOre * (1 - campaign.requestedDiscountPercent));

  let marginFloorOre: number;
  if (campaign.type === 'liquidation' && campaign.belowCostOverride) {
    marginFloorOre = campaign.belowCostOverride.floorOre;
  } else {
    marginFloorOre = minimumPriceForMarginOre(product.landedCostOre, campaign.minimumAllowedMargin);
  }

  const { priceOre, wasCapped } = roundToEndingNineNotBelowFloor(requestedPriceOre, marginFloorOre);
  const effectiveDiscountPercent = 1 - priceOre / product.regularPriceOre;

  return {
    campaignId: campaign.id,
    campaignName: campaign.name,
    badgeText: campaign.badgeText,
    requestedPriceOre,
    finalPriceOre: priceOre,
    wasMarginCapped: wasCapped,
    effectiveDiscountPercent,
    marginFloorOre,
    noValidDiscount: priceOre >= product.regularPriceOre,
  };
}

export interface ProductCampaignResolution {
  productId: string;
  hasActiveCampaign: boolean;
  applied?: CampaignPriceResult;
  allCandidates: CampaignPriceResult[]; // every matching campaign's price, for admin/debug display
}

// Discounts never stack. When multiple campaigns apply to the same product,
// the lowest valid customer price wins, and that campaign's identity
// (name/badge) is what gets displayed — never a combined percentage.
export function resolveBestCampaignForProduct(
  product: PricedProduct,
  campaigns: SaleCampaign[],
  now: Date = new Date()
): ProductCampaignResolution {
  const matching = campaigns.filter(c => productMatchesCampaign(product, c, now));
  if (matching.length === 0) {
    return { productId: product.id, hasActiveCampaign: false, allCandidates: [] };
  }
  const candidates = matching.map(c => calculateCampaignPrice(product, c));
  const usable = candidates.filter(c => !c.noValidDiscount);
  if (usable.length === 0) {
    return { productId: product.id, hasActiveCampaign: false, allCandidates: candidates };
  }
  const best = usable.reduce((lowest, candidate) => (candidate.finalPriceOre < lowest.finalPriceOre ? candidate : lowest));
  return { productId: product.id, hasActiveCampaign: true, applied: best, allCandidates: candidates };
}

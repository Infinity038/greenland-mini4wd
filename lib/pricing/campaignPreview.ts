// Admin campaign preview aggregation — docs/SALE-CAMPAIGN-RULES.md §13.
// Pure function: given a candidate campaign and the product catalog it
// would apply to, computes everything the "before activation" preview must
// show, and the row-level detail for the product table.

import { productMatchesCampaign, calculateCampaignPrice, type SaleCampaign } from './campaign';
import type { PricedProduct } from './product';
import { classifyInventoryAge } from './inventoryAge';

export type CampaignPreviewRowStatus = 'full_discount' | 'margin_capped' | 'no_valid_discount' | 'excluded';

export interface CampaignPreviewRow {
  product: PricedProduct;
  status: CampaignPreviewRowStatus;
  regularPriceOre: number;
  requestedPriceOre?: number;
  finalPriceOre?: number;
  grossProfitOre?: number;
  grossMargin?: number;
  marginCapReason?: string;
}

export interface CampaignPreviewSummary {
  selectedCount: number; // products matching scope, before exclusions
  fullDiscountCount: number;
  marginCappedCount: number;
  excludedCount: number; // matched scope but removed by an exclusion rule
  noValidDiscountCount: number; // capped so hard there is no real discount left
  regularRetailValueOre: number; // sum of regular price across all included (non-excluded) rows
  expectedSaleRevenueOre: number; // sum of final price across included rows that keep a real discount
  totalLandedCostOre: number;
  expectedGrossProfitOre: number;
  effectiveGrossMargin: number;
  expectedDiscountValueOre: number;
  estimatedCashRecoveredFromAgedStockOre: number; // expected revenue from rows aged 90+ days
  rows: CampaignPreviewRow[];
}

function matchesScopeIgnoringExclusions(product: PricedProduct, campaign: SaleCampaign, now: Date): boolean {
  // Re-uses productMatchesCampaign's scope check by temporarily ignoring
  // exclusions/club-asset/schedule, so "selectedCount" reflects scope alone
  // per docs/SALE-CAMPAIGN-RULES.md §13 ("number of selected products").
  return productMatchesCampaign(product, { ...campaign, exclusions: [] }, now);
}

export function buildCampaignPreview(
  products: PricedProduct[],
  campaign: SaleCampaign,
  now: Date = new Date()
): CampaignPreviewSummary {
  const rows: CampaignPreviewRow[] = [];
  let selectedCount = 0;
  let fullDiscountCount = 0;
  let marginCappedCount = 0;
  let excludedCount = 0;
  let noValidDiscountCount = 0;
  let regularRetailValueOre = 0;
  let expectedSaleRevenueOre = 0;
  let totalLandedCostOre = 0;
  let estimatedCashRecoveredFromAgedStockOre = 0;

  for (const product of products) {
    const inScope = matchesScopeIgnoringExclusions(product, campaign, now);
    if (!inScope) continue;
    selectedCount += 1;

    const eligible = productMatchesCampaign(product, campaign, now);
    if (!eligible) {
      excludedCount += 1;
      rows.push({ product, status: 'excluded', regularPriceOre: product.regularPriceOre });
      continue;
    }

    const priced = calculateCampaignPrice(product, campaign);
    regularRetailValueOre += product.regularPriceOre;
    totalLandedCostOre += product.landedCostOre;

    if (priced.noValidDiscount) {
      noValidDiscountCount += 1;
      rows.push({
        product,
        status: 'no_valid_discount',
        regularPriceOre: product.regularPriceOre,
        requestedPriceOre: priced.requestedPriceOre,
        finalPriceOre: priced.finalPriceOre,
        marginCapReason: 'Margin floor leaves no valid discount below the regular price.',
      });
      continue;
    }

    if (priced.wasMarginCapped) marginCappedCount += 1;
    else fullDiscountCount += 1;

    expectedSaleRevenueOre += priced.finalPriceOre;
    const daysAged = product.daysSinceStockReceipt ?? 0;
    if (daysAged >= 90) {
      estimatedCashRecoveredFromAgedStockOre += priced.finalPriceOre;
    }

    rows.push({
      product,
      status: priced.wasMarginCapped ? 'margin_capped' : 'full_discount',
      regularPriceOre: product.regularPriceOre,
      requestedPriceOre: priced.requestedPriceOre,
      finalPriceOre: priced.finalPriceOre,
      grossProfitOre: priced.finalPriceOre - product.landedCostOre,
      grossMargin: (priced.finalPriceOre - product.landedCostOre) / priced.finalPriceOre,
      marginCapReason: priced.wasMarginCapped
        ? `Requested ${(campaign.requestedDiscountPercent * 100).toFixed(0)}% off would fall below the ${(campaign.minimumAllowedMargin * 100).toFixed(0)}% margin floor.`
        : undefined,
    });
  }

  const expectedGrossProfitOre = expectedSaleRevenueOre - rows
    .filter(r => r.status === 'full_discount' || r.status === 'margin_capped')
    .reduce((sum, r) => sum + r.product.landedCostOre, 0);
  const effectiveGrossMargin = expectedSaleRevenueOre > 0 ? expectedGrossProfitOre / expectedSaleRevenueOre : 0;
  const discountedRegularValueOre = rows
    .filter(r => r.status === 'full_discount' || r.status === 'margin_capped')
    .reduce((sum, r) => sum + r.product.regularPriceOre, 0);
  const expectedDiscountValueOre = discountedRegularValueOre - expectedSaleRevenueOre;

  return {
    selectedCount,
    fullDiscountCount,
    marginCappedCount,
    excludedCount,
    noValidDiscountCount,
    regularRetailValueOre,
    expectedSaleRevenueOre,
    totalLandedCostOre,
    expectedGrossProfitOre,
    effectiveGrossMargin,
    expectedDiscountValueOre,
    estimatedCashRecoveredFromAgedStockOre,
    rows,
  };
}

export { classifyInventoryAge };

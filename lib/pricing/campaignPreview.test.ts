import { describe, it, expect } from 'vitest';
import { buildCampaignPreview } from './campaignPreview';
import { CAMPAIGN_TYPE_DEFAULT_MARGIN_FLOOR, type SaleCampaign } from './campaign';
import type { PricedProduct } from './product';
import { dkkToOre } from './money';

function makeProduct(overrides: Partial<PricedProduct> = {}): PricedProduct {
  return {
    id: 'p1',
    itemNo: '00000',
    name: 'Test Product',
    category: 'cars',
    isCompleteCarKit: true,
    tags: [],
    isCollectorsVault: false,
    isPreorder: false,
    isSpecialOrder: false,
    isClubAsset: false,
    isNewlyArrived: false,
    shippingClass: 'complete_car_kit',
    regularPriceOre: dkkToOre(299),
    landedCostOre: dkkToOre(120),
    daysSinceStockReceipt: 30,
    ...overrides,
  };
}

function makeCampaign(overrides: Partial<SaleCampaign> = {}): SaleCampaign {
  return {
    id: 'c1',
    name: 'Test Campaign',
    type: 'standard_sale',
    requestedDiscountPercent: 0.1,
    minimumAllowedMargin: CAMPAIGN_TYPE_DEFAULT_MARGIN_FLOOR.standard_sale,
    startAt: '2026-01-01T00:00:00.000Z',
    endAt: '2026-12-31T23:59:59.000Z',
    enabled: true,
    badgeText: 'SALE',
    internalNote: '',
    publicDescription: '',
    createdBy: 'staff-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    scope: [{ kind: 'all_products' }],
    exclusions: [],
    ...overrides,
  };
}

describe('campaignPreview — aggregate summary', () => {
  it('counts selected, full-discount, capped and excluded products separately', () => {
    const normal = makeProduct({ id: 'normal', regularPriceOre: dkkToOre(299), landedCostOre: dkkToOre(100) });
    const thinMargin = makeProduct({ id: 'thin', regularPriceOre: dkkToOre(199), landedCostOre: dkkToOre(140) });
    const collector = makeProduct({ id: 'collector', isCollectorsVault: true });

    const campaign = makeCampaign({ requestedDiscountPercent: 0.5, minimumAllowedMargin: 0.4, exclusions: [{ kind: 'collector_products' }] });
    const summary = buildCampaignPreview([normal, thinMargin, collector], campaign);

    expect(summary.selectedCount).toBe(3);
    expect(summary.excludedCount).toBe(1);
    expect(summary.marginCappedCount + summary.fullDiscountCount + summary.noValidDiscountCount).toBe(2);
    expect(summary.rows).toHaveLength(3);
    expect(summary.rows.find(r => r.product.id === 'collector')?.status).toBe('excluded');
  });

  it('computes regular retail value, sale revenue, landed cost and gross margin for a clean discount', () => {
    const a = makeProduct({ id: 'a', regularPriceOre: dkkToOre(299), landedCostOre: dkkToOre(100) });
    const b = makeProduct({ id: 'b', regularPriceOre: dkkToOre(199), landedCostOre: dkkToOre(70) });
    const campaign = makeCampaign({ requestedDiscountPercent: 0.1 });
    const summary = buildCampaignPreview([a, b], campaign);

    expect(summary.regularRetailValueOre).toBe(dkkToOre(299) + dkkToOre(199));
    expect(summary.totalLandedCostOre).toBe(dkkToOre(100) + dkkToOre(70));
    expect(summary.expectedSaleRevenueOre).toBeGreaterThan(0);
    expect(summary.expectedSaleRevenueOre).toBeLessThan(summary.regularRetailValueOre);
    expect(summary.effectiveGrossMargin).toBeGreaterThan(0);
    expect(summary.expectedDiscountValueOre).toBe(summary.regularRetailValueOre - summary.expectedSaleRevenueOre);
  });

  it('flags a margin-capped row with a human-readable reason', () => {
    const thinMargin = makeProduct({ regularPriceOre: dkkToOre(299), landedCostOre: dkkToOre(140) });
    const campaign = makeCampaign({ requestedDiscountPercent: 0.3, minimumAllowedMargin: 0.4 });
    const summary = buildCampaignPreview([thinMargin], campaign);
    const row = summary.rows[0];
    expect(row.status).toBe('margin_capped');
    expect(row.marginCapReason).toMatch(/margin floor/);
  });

  it('estimates cash recovered from aged stock (90+ days) separately from fresh stock', () => {
    const fresh = makeProduct({ id: 'fresh', daysSinceStockReceipt: 10, regularPriceOre: dkkToOre(299), landedCostOre: dkkToOre(100) });
    const aged = makeProduct({ id: 'aged', daysSinceStockReceipt: 200, regularPriceOre: dkkToOre(299), landedCostOre: dkkToOre(100) });
    const campaign = makeCampaign({ requestedDiscountPercent: 0.1 });
    const summary = buildCampaignPreview([fresh, aged], campaign);

    const agedRow = summary.rows.find(r => r.product.id === 'aged')!;
    expect(summary.estimatedCashRecoveredFromAgedStockOre).toBe(agedRow.finalPriceOre);
    expect(summary.estimatedCashRecoveredFromAgedStockOre).toBeLessThan(summary.expectedSaleRevenueOre);
  });
});

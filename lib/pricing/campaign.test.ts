import { describe, it, expect } from 'vitest';
import {
  CAMPAIGN_TYPE_DEFAULT_MARGIN_FLOOR,
  calculateCampaignPrice,
  isCampaignActive,
  productMatchesCampaign,
  resolveBestCampaignForProduct,
  type SaleCampaign,
} from './campaign';
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
    daysSinceStockReceipt: 200,
    ...overrides,
  };
}

function makeCampaign(overrides: Partial<SaleCampaign> = {}): SaleCampaign {
  return {
    id: 'c1',
    name: 'Test Campaign',
    type: 'standard_sale',
    requestedDiscountPercent: 0.2,
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

describe('campaign — default margin floors (locked)', () => {
  it('matches the locked defaults for every campaign type', () => {
    expect(CAMPAIGN_TYPE_DEFAULT_MARGIN_FLOOR.standard_sale).toBe(0.4);
    expect(CAMPAIGN_TYPE_DEFAULT_MARGIN_FLOOR.anniversary_sale).toBe(0.3);
    expect(CAMPAIGN_TYPE_DEFAULT_MARGIN_FLOOR.clearance).toBe(0.2);
    expect(CAMPAIGN_TYPE_DEFAULT_MARGIN_FLOOR.liquidation).toBe(0);
  });
});

describe('campaign — Christmas Sale worked example (299 -> 239, save 60)', () => {
  it('reproduces the locked customer-display example exactly', () => {
    const product = makeProduct({ regularPriceOre: dkkToOre(299), landedCostOre: dkkToOre(100) });
    const campaign = makeCampaign({ requestedDiscountPercent: 0.2, minimumAllowedMargin: 0.4 });
    const result = calculateCampaignPrice(product, campaign);
    expect(result.finalPriceOre).toBe(dkkToOre(239));
    expect(result.wasMarginCapped).toBe(false);
    expect(product.regularPriceOre - result.finalPriceOre).toBe(dkkToOre(60));
  });
});

describe('campaign — Shadow Shark worked example (approved 299 DKK regular price)', () => {
  it('a Standard Sale 10% discount on the approved 299 DKK price stays above the 40% floor', () => {
    // Shadow Shark (item 18704) — approved regular retail 299 DKK per
    // docs/PRODUCT-PRICING-POLICY.md §4. Landed cost is illustrative here
    // (the approved price is a locked board decision, not derived), chosen
    // low enough that a 40% floor is trivially satisfied.
    const shadowShark = makeProduct({
      id: 'tamiya-18704-shadow-shark',
      itemNo: '18704',
      name: 'Shadow Shark',
      regularPriceOre: dkkToOre(299),
      landedCostOre: dkkToOre(110),
    });
    const campaign = makeCampaign({ requestedDiscountPercent: 0.1, minimumAllowedMargin: 0.4 });
    const result = calculateCampaignPrice(shadowShark, campaign);
    expect(result.wasMarginCapped).toBe(false);
    expect(result.finalPriceOre % 1000).toBe(900); // ends in 9
    expect((result.finalPriceOre - shadowShark.landedCostOre) / result.finalPriceOre).toBeGreaterThanOrEqual(0.4);
  });
});

describe('campaign — boxed body/chassis set worked example', () => {
  it('applies a Clearance campaign to a boxed body/chassis set (35 DKK shipping class product)', () => {
    const bodySet = makeProduct({
      id: 'body-set-1',
      category: 'parts',
      isCompleteCarKit: false,
      partGroup: 'body_chassis_sets',
      shippingClass: 'boxed_body_chassis',
      regularPriceOre: dkkToOre(199),
      landedCostOre: dkkToOre(80),
      daysSinceStockReceipt: 300,
    });
    const clearance = makeCampaign({
      type: 'clearance',
      requestedDiscountPercent: 0.3,
      minimumAllowedMargin: CAMPAIGN_TYPE_DEFAULT_MARGIN_FLOOR.clearance,
      scope: [{ kind: 'part_group', group: 'body_chassis_sets' }],
    });
    expect(productMatchesCampaign(bodySet, clearance)).toBe(true);
    const result = calculateCampaignPrice(bodySet, clearance);
    expect(result.finalPriceOre % 1000).toBe(900);
    expect((result.finalPriceOre - bodySet.landedCostOre) / result.finalPriceOre).toBeGreaterThanOrEqual(0.2 - 1e-9);
  });
});

describe('campaign — AR chassis campaign worked example', () => {
  it('targets only AR-chassis complete car kits', () => {
    const arCar = makeProduct({ id: 'ar-car', chassis: 'AR' });
    const vzCar = makeProduct({ id: 'vz-car', chassis: 'VZ' });
    const arCampaign = makeCampaign({
      name: 'AR Chassis Sale',
      requestedDiscountPercent: 0.08,
      scope: [{ kind: 'chassis_family', chassis: 'AR' }],
    });
    expect(productMatchesCampaign(arCar, arCampaign)).toBe(true);
    expect(productMatchesCampaign(vzCar, arCampaign)).toBe(false);
  });
});

describe('campaign — all-motors campaign worked example', () => {
  it('targets only parts in the motors group, 8% requested discount', () => {
    const motor = makeProduct({
      id: 'motor-1',
      category: 'parts',
      isCompleteCarKit: false,
      partGroup: 'motors',
      shippingClass: 'small_part',
      regularPriceOre: dkkToOre(129),
      landedCostOre: dkkToOre(64),
    });
    const roller = makeProduct({ id: 'roller-1', category: 'parts', isCompleteCarKit: false, partGroup: 'rollers' });
    const motorSale = makeCampaign({
      name: 'Motor Sale',
      requestedDiscountPercent: 0.08,
      scope: [{ kind: 'part_group', group: 'motors' }],
    });
    expect(productMatchesCampaign(motor, motorSale)).toBe(true);
    expect(productMatchesCampaign(roller, motorSale)).toBe(false);

    const result = calculateCampaignPrice(motor, motorSale);
    // 129 * 0.92 = 118.68 -> nearest ending-9 is 119, well above the 40% floor.
    expect(result.finalPriceOre).toBe(dkkToOre(119));
    expect(result.wasMarginCapped).toBe(false);
  });
});

describe('campaign — Anniversary Sale worked example (20% base, 30% on selected aged stock)', () => {
  it('applies 20% to normal stock and the better 30% to aged stock via overlap resolution, never both', () => {
    const normalStock = makeProduct({ id: 'normal', daysSinceStockReceipt: 30, regularPriceOre: dkkToOre(299), landedCostOre: dkkToOre(120) });
    const agedStock = makeProduct({ id: 'aged', daysSinceStockReceipt: 400, regularPriceOre: dkkToOre(299), landedCostOre: dkkToOre(120) });

    const baseAnniversary = makeCampaign({
      id: 'anniversary-base',
      name: 'Anniversary Sale',
      type: 'anniversary_sale',
      requestedDiscountPercent: 0.2,
      minimumAllowedMargin: CAMPAIGN_TYPE_DEFAULT_MARGIN_FLOOR.anniversary_sale,
      scope: [{ kind: 'all_products' }],
    });
    const agedAnniversary = makeCampaign({
      id: 'anniversary-aged',
      name: 'Anniversary Sale — Aged Stock',
      type: 'anniversary_sale',
      requestedDiscountPercent: 0.3,
      minimumAllowedMargin: CAMPAIGN_TYPE_DEFAULT_MARGIN_FLOOR.anniversary_sale,
      scope: [{ kind: 'inventory_older_than_days', days: 365 }],
    });

    const normalResolution = resolveBestCampaignForProduct(normalStock, [baseAnniversary, agedAnniversary]);
    expect(normalResolution.applied?.campaignId).toBe('anniversary-base');

    const agedResolution = resolveBestCampaignForProduct(agedStock, [baseAnniversary, agedAnniversary]);
    expect(agedResolution.applied?.campaignId).toBe('anniversary-aged');
    expect(agedResolution.applied!.finalPriceOre).toBeLessThan(normalResolution.applied!.finalPriceOre);
  });
});

describe('campaign — margin-capped campaign', () => {
  it('caps the sale price at the margin floor and flags it, rather than silently violating it', () => {
    const product = makeProduct({ regularPriceOre: dkkToOre(299), landedCostOre: dkkToOre(140) });
    // 50% requested discount would put the price near landed cost — the 40% floor must win.
    const campaign = makeCampaign({ requestedDiscountPercent: 0.5, minimumAllowedMargin: 0.4 });
    const result = calculateCampaignPrice(product, campaign);
    expect(result.wasMarginCapped).toBe(true);
    expect(result.finalPriceOre).toBeGreaterThanOrEqual(result.marginFloorOre);
    expect(result.effectiveDiscountPercent).toBeLessThan(0.5);
    expect(result.noValidDiscount).toBe(false); // still a real discount vs. the 299 regular price
  });

  it('excludes a product entirely when the margin floor leaves no discount at all (final >= regular price)', () => {
    const product = makeProduct({ regularPriceOre: dkkToOre(199), landedCostOre: dkkToOre(140) });
    const campaign = makeCampaign({ requestedDiscountPercent: 0.5, minimumAllowedMargin: 0.4 });
    const single = calculateCampaignPrice(product, campaign);
    expect(single.noValidDiscount).toBe(true);
    expect(single.finalPriceOre).toBeGreaterThanOrEqual(product.regularPriceOre);

    const resolution = resolveBestCampaignForProduct(product, [campaign]);
    expect(resolution.hasActiveCampaign).toBe(false);
    expect(resolution.applied).toBeUndefined();
    expect(resolution.allCandidates).toHaveLength(1); // still visible to admin preview
    expect(resolution.allCandidates[0].noValidDiscount).toBe(true);
  });
});

describe('campaign — Liquidation below-cost override', () => {
  it('defaults to landed cost as the floor (never below cost) without an override', () => {
    const product = makeProduct({ regularPriceOre: dkkToOre(199), landedCostOre: dkkToOre(150) });
    const liquidation = makeCampaign({ type: 'liquidation', requestedDiscountPercent: 0.9, minimumAllowedMargin: 0 });
    const result = calculateCampaignPrice(product, liquidation);
    expect(result.finalPriceOre).toBeGreaterThanOrEqual(product.landedCostOre);
  });

  it('only goes below cost with an explicit belowCostOverride', () => {
    const product = makeProduct({ regularPriceOre: dkkToOre(199), landedCostOre: dkkToOre(150) });
    const liquidation = makeCampaign({
      type: 'liquidation',
      requestedDiscountPercent: 0.9,
      minimumAllowedMargin: 0,
      belowCostOverride: {
        reason: 'End-of-line clearance, unsellable at cost within the season.',
        confirmedByUserId: 'admin-1',
        secondConfirmedByUserId: 'admin-2',
        floorOre: dkkToOre(50),
      },
    });
    const result = calculateCampaignPrice(product, liquidation);
    expect(result.finalPriceOre).toBeLessThan(product.landedCostOre);
    expect(result.finalPriceOre).toBeGreaterThanOrEqual(dkkToOre(50));
  });
});

describe('campaign — exclusions', () => {
  it('excludes collector products even when scope would otherwise match', () => {
    const collector = makeProduct({ isCollectorsVault: true });
    const campaign = makeCampaign({ exclusions: [{ kind: 'collector_products' }] });
    expect(productMatchesCampaign(collector, campaign)).toBe(false);
  });

  it('excludes preorder products', () => {
    const preorder = makeProduct({ isPreorder: true });
    const campaign = makeCampaign({ exclusions: [{ kind: 'preorder_products' }] });
    expect(productMatchesCampaign(preorder, campaign)).toBe(false);
  });

  it('excludes newly arrived stock', () => {
    const newArrival = makeProduct({ daysSinceStockReceipt: 5 });
    const campaign = makeCampaign({ exclusions: [{ kind: 'newly_arrived', withinDays: 30 }] });
    expect(productMatchesCampaign(newArrival, campaign)).toBe(false);
  });

  it('excludes products already below a selected margin', () => {
    // regular 150, landed 140 -> current margin (150-140)/150 = 6.7%, below a 20% floor
    const thinMargin = makeProduct({ regularPriceOre: dkkToOre(150), landedCostOre: dkkToOre(140) });
    const campaign = makeCampaign({ exclusions: [{ kind: 'below_margin', marginFloor: 0.2 }] });
    expect(productMatchesCampaign(thinMargin, campaign)).toBe(false);
  });

  it('a Christmas Sale on all complete car kits excludes upgrade parts', () => {
    const car = makeProduct({ category: 'cars', isCompleteCarKit: true });
    const part = makeProduct({ category: 'parts', isCompleteCarKit: false });
    const christmas = makeCampaign({
      name: 'Christmas Sale',
      requestedDiscountPercent: 0.1,
      scope: [{ kind: 'all_complete_car_kits' }],
    });
    expect(productMatchesCampaign(car, christmas)).toBe(true);
    expect(productMatchesCampaign(part, christmas)).toBe(false);
  });
});

describe('campaign — club assets are never eligible', () => {
  it('excludes a club asset from every campaign regardless of scope', () => {
    const clubCar = makeProduct({ isClubAsset: true });
    const campaign = makeCampaign({ scope: [{ kind: 'all_products' }], exclusions: [] });
    expect(productMatchesCampaign(clubCar, campaign)).toBe(false);
  });
});

describe('campaign — scheduling', () => {
  it('is inactive before its start date', () => {
    const campaign = makeCampaign({ startAt: '2027-01-01T00:00:00.000Z', endAt: '2027-02-01T00:00:00.000Z' });
    expect(isCampaignActive(campaign, new Date('2026-06-01'))).toBe(false);
  });

  it('is inactive after its end date (expired)', () => {
    const campaign = makeCampaign({ startAt: '2025-01-01T00:00:00.000Z', endAt: '2025-02-01T00:00:00.000Z' });
    expect(isCampaignActive(campaign, new Date('2026-06-01'))).toBe(false);
  });

  it('is inactive while disabled, even within its date window', () => {
    const campaign = makeCampaign({ enabled: false, startAt: '2026-01-01T00:00:00.000Z', endAt: '2026-12-31T00:00:00.000Z' });
    expect(isCampaignActive(campaign, new Date('2026-06-01'))).toBe(false);
  });

  it('a disabled or expired campaign never matches a product', () => {
    const expired = makeCampaign({ startAt: '2020-01-01T00:00:00.000Z', endAt: '2020-02-01T00:00:00.000Z' });
    expect(productMatchesCampaign(makeProduct(), expired, new Date('2026-06-01'))).toBe(false);
  });
});

describe('campaign — overlap: lowest valid price wins, no stacking', () => {
  it('an AR kit under both an all-kits 5% and an AR-kits 8% campaign gets the 8% price, not 13%', () => {
    const arCar = makeProduct({ chassis: 'AR', regularPriceOre: dkkToOre(299), landedCostOre: dkkToOre(100) });
    const allKits = makeCampaign({ id: 'all-kits', name: 'All Kits', requestedDiscountPercent: 0.05, scope: [{ kind: 'all_complete_car_kits' }] });
    const arKits = makeCampaign({ id: 'ar-kits', name: 'AR Kits', requestedDiscountPercent: 0.08, scope: [{ kind: 'chassis_family', chassis: 'AR' }] });

    const resolution = resolveBestCampaignForProduct(arCar, [allKits, arKits]);
    expect(resolution.applied?.campaignId).toBe('ar-kits');
    expect(resolution.allCandidates).toHaveLength(2);

    // Never a combined/stacked 13% price.
    const stackedPriceOre = Math.round(arCar.regularPriceOre * (1 - 0.13));
    expect(resolution.applied?.finalPriceOre).not.toBe(stackedPriceOre);
  });

  it('has no active campaign when none match', () => {
    const product = makeProduct({ isCollectorsVault: true });
    const campaign = makeCampaign({ exclusions: [{ kind: 'collector_products' }] });
    const resolution = resolveBestCampaignForProduct(product, [campaign]);
    expect(resolution.hasActiveCampaign).toBe(false);
    expect(resolution.applied).toBeUndefined();
  });
});

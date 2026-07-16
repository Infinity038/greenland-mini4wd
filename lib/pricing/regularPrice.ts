// Regular (non-sale) retail pricing — docs/PRODUCT-PRICING-POLICY.md.
//
// Regular price rule: every normal retail product must maintain at least a
// 50% gross margin on landed cost. Landed cost = supplier cost (converted to
// DKK via a stored exchange-rate snapshot) + fixed allocated shipping.

import { convertToDkkOre, landedCostOre, minimumPriceForMarginOre, roundUpToEndingNine } from './money';
import { SHIPPING_CLASSES, shippingAllocationDkkOre, type ShippingClass } from './shippingClasses';

export const REGULAR_PRICE_MARGIN_FLOOR = 0.5;

export interface SupplierCostSnapshot {
  supplierCostAmount: number; // in supplierCurrency, e.g. 350 (PHP)
  supplierCurrency: string; // e.g. 'PHP'
  supplierName: string;
  sourceNote: string; // source URL or note
  dateVerified: string; // ISO date the cost was last verified
  dkkPerForeignUnit: number; // stored exchange-rate snapshot (DKK per 1 unit of supplierCurrency)
  exchangeRateSnapshotDate: string; // ISO date the snapshot was taken
}

export interface ShippingAllocation {
  shippingClass: ShippingClass;
  overrideOre?: number; // administrator override; if set, used instead of the class default
  overrideReason?: string; // required whenever overrideOre is set — surfaced as a warning + audit entry
}

export interface RegularPriceResult {
  supplierCostDkkOre: number;
  shippingOre: number;
  landedCostOre: number;
  minimumRetailOre: number; // exact, pre-rounding
  approvedRegularPriceOre: number; // rounded, ends in 9
  marginAtApprovedPrice: number; // fraction, e.g. 0.508
}

// Computes the full cost-plus chain for a product with a verified supplier
// cost. Callers must not invoke this for a product without a verified cost —
// see lib/pricing/catalogPricingStatus.ts, which is what actually decides
// whether a product is allowed to be published.
export function calculateRegularPrice(
  cost: SupplierCostSnapshot,
  shipping: ShippingAllocation
): RegularPriceResult {
  const supplierCostDkkOre = convertToDkkOre(cost.supplierCostAmount, cost.dkkPerForeignUnit);
  const shippingOre = shipping.overrideOre ?? shippingAllocationDkkOre(shipping.shippingClass);
  if (shipping.overrideOre != null && !shipping.overrideReason) {
    throw new Error('A shipping allocation override requires an overrideReason for the audit record.');
  }
  const landed = landedCostOre(supplierCostDkkOre, shippingOre);
  const minimumRetail = minimumPriceForMarginOre(landed, REGULAR_PRICE_MARGIN_FLOOR);
  const approvedRegularPriceOre = roundUpToEndingNine(minimumRetail);
  const marginAtApprovedPrice = (approvedRegularPriceOre - landed) / approvedRegularPriceOre;

  return {
    supplierCostDkkOre,
    shippingOre,
    landedCostOre: landed,
    minimumRetailOre: minimumRetail,
    approvedRegularPriceOre,
    marginAtApprovedPrice,
  };
}

export function shippingClassLabel(shippingClass: ShippingClass): string {
  return SHIPPING_CLASSES[shippingClass].label;
}

// Regular (non-sale) retail pricing — docs/PRODUCT-PRICING-POLICY.md.
//
// Regular price rule: every normal retail product must maintain at least a
// 50% gross margin on landed cost. Landed cost = supplier cost (converted to
// DKK via a stored exchange-rate snapshot) + fixed allocated shipping.
//
// Collector correction (Preview review): every product explicitly
// classified as Collector — never inferred from the name, only from the
// catalog's own is_collectors_vault tag — must instead maintain at least a
// 60% gross margin (minimum retail = landed cost / (1 - 0.60), i.e. landed
// cost x 2.5).

import { convertToDkkOre, landedCostOre, minimumPriceForMarginOre, roundUpToEndingNine } from './money';
import { SHIPPING_CLASSES, shippingAllocationDkkOre, type ShippingClass } from './shippingClasses';

export const REGULAR_PRICE_MARGIN_FLOOR = 0.5;
export const COLLECTOR_MARGIN_FLOOR = 0.6;

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
// whether a product may be purchased.
//
// `marginFloor` defaults to the normal 50% regular-price floor. Pass
// COLLECTOR_MARGIN_FLOOR explicitly for a product tagged Collector — never
// inferred automatically from any other field, since a caller must have
// already checked the catalog's explicit is_collectors_vault tag to decide
// which floor to pass in the first place.
export function calculateRegularPrice(
  cost: SupplierCostSnapshot,
  shipping: ShippingAllocation,
  marginFloor: number = REGULAR_PRICE_MARGIN_FLOOR
): RegularPriceResult {
  const supplierCostDkkOre = convertToDkkOre(cost.supplierCostAmount, cost.dkkPerForeignUnit);
  const shippingOre = shipping.overrideOre ?? shippingAllocationDkkOre(shipping.shippingClass);
  if (shipping.overrideOre != null && !shipping.overrideReason) {
    throw new Error('A shipping allocation override requires an overrideReason for the audit record.');
  }
  const landed = landedCostOre(supplierCostDkkOre, shippingOre);
  const minimumRetail = minimumPriceForMarginOre(landed, marginFloor);
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

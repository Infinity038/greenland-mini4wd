// Shared Mini 4WD display-case accessory — docs/CATALOG-COSTING-AND-FREIGHT.md
// §"Display case". ONE shared SKU across every car model: never a
// per-car-model display-case variant. Two customer-facing prices apply to
// the same physical unit of stock:
//   - standalone (no car): 229 DKK, minimum 50% gross margin
//   - bundled with a complete car kit: 189 DKK, minimum 40% gross margin
// Both prices are locked/approved; this module computes and verifies the
// margin math, it does not silently change either price. If a real
// supplier-cost or exchange-rate update would breach a floor,
// displayCaseMarginWarnings() reports it for admin review instead.

import { convertToDkkOre, landedCostOre, minimumPriceForMarginOre, grossMarginFraction, dkkToOre, oreToDkk } from './money';
import { shippingAllocationDkkOre } from './shippingClasses';

export const DISPLAY_CASE_SKU = 'display-case';

// Known supplier assumption (not yet verified against a real receipt) —
// 3,000 PHP total / 10 cases = 300 PHP per case. Flagged here, not silently
// treated as confirmed, until a real supplier receipt verifies it.
export const DISPLAY_CASE_SUPPLIER_UNIT_COST_PHP = 300;
export const DISPLAY_CASE_SUPPLIER_COST_VERIFIED = false;

export const DISPLAY_CASE_FREIGHT_DKK_ORE = shippingAllocationDkkOre('accessory_large'); // 80 DKK, its own allocation — never combined with a car's

export const DISPLAY_CASE_STANDALONE_PRICE_DKK = 229;
export const DISPLAY_CASE_STANDALONE_MARGIN_FLOOR = 0.5;

export const DISPLAY_CASE_BUNDLED_PRICE_DKK = 189;
export const DISPLAY_CASE_BUNDLED_MARGIN_FLOOR = 0.4;

export const DISPLAY_CASE_BUNDLE_SAVING_DKK = DISPLAY_CASE_STANDALONE_PRICE_DKK - DISPLAY_CASE_BUNDLED_PRICE_DKK; // 40 DKK

export interface DisplayCaseMarginReport {
  exchangeRateDkkPerPhp: number;
  supplierCostConvertedOre: number;
  landedCostOre: number;
  standalone: { priceOre: number; grossProfitOre: number; grossMargin: number; clearsFloor: boolean; minimumPriceOre: number };
  bundled: { priceOre: number; grossProfitOre: number; grossMargin: number; clearsFloor: boolean; minimumPriceOre: number };
  savingOre: number;
}

// Pure margin-verification math — used by the admin catalog-status view and
// by tests. Never mutates the approved prices; only reports whether they
// currently clear their floors at the given exchange-rate snapshot.
export function calculateDisplayCaseMargins(exchangeRateDkkPerPhp: number): DisplayCaseMarginReport {
  const supplierCostConvertedOre = convertToDkkOre(DISPLAY_CASE_SUPPLIER_UNIT_COST_PHP, exchangeRateDkkPerPhp);
  const landedOre = landedCostOre(supplierCostConvertedOre, DISPLAY_CASE_FREIGHT_DKK_ORE);

  const standalonePriceOre = dkkToOre(DISPLAY_CASE_STANDALONE_PRICE_DKK);
  const standaloneMinimumOre = minimumPriceForMarginOre(landedOre, DISPLAY_CASE_STANDALONE_MARGIN_FLOOR);
  const bundledPriceOre = dkkToOre(DISPLAY_CASE_BUNDLED_PRICE_DKK);
  const bundledMinimumOre = minimumPriceForMarginOre(landedOre, DISPLAY_CASE_BUNDLED_MARGIN_FLOOR);

  return {
    exchangeRateDkkPerPhp,
    supplierCostConvertedOre,
    landedCostOre: landedOre,
    standalone: {
      priceOre: standalonePriceOre,
      grossProfitOre: standalonePriceOre - landedOre,
      grossMargin: grossMarginFraction(standalonePriceOre, landedOre),
      clearsFloor: standalonePriceOre >= standaloneMinimumOre,
      minimumPriceOre: standaloneMinimumOre,
    },
    bundled: {
      priceOre: bundledPriceOre,
      grossProfitOre: bundledPriceOre - landedOre,
      grossMargin: grossMarginFraction(bundledPriceOre, landedOre),
      clearsFloor: bundledPriceOre >= bundledMinimumOre,
      minimumPriceOre: bundledMinimumOre,
    },
    savingOre: standalonePriceOre - bundledPriceOre,
  };
}

// Per the locked rule: never silently change an approved price if cost/rate
// changes would breach its floor — flag it for review instead. Returns a
// human-readable warning per breached price, empty when both are safe.
export function displayCaseMarginWarnings(exchangeRateDkkPerPhp: number): string[] {
  const report = calculateDisplayCaseMargins(exchangeRateDkkPerPhp);
  const warnings: string[] = [];
  if (!report.standalone.clearsFloor) {
    warnings.push(
      `Standalone display-case price (${DISPLAY_CASE_STANDALONE_PRICE_DKK} DKK) no longer clears the ${DISPLAY_CASE_STANDALONE_MARGIN_FLOOR * 100}% margin floor at ${exchangeRateDkkPerPhp} DKK/PHP — needs admin review, not a silent price change.`
    );
  }
  if (!report.bundled.clearsFloor) {
    warnings.push(
      `Bundled display-case price (${DISPLAY_CASE_BUNDLED_PRICE_DKK} DKK) no longer clears the ${DISPLAY_CASE_BUNDLED_MARGIN_FLOOR * 100}% margin floor at ${exchangeRateDkkPerPhp} DKK/PHP — needs admin review, not a silent price change.`
    );
  }
  return warnings;
}

// The exact exchange rate at which each approved price would stop clearing
// its floor — useful for the admin view's sensitivity display. Returns DKK
// per 1 PHP.
export function displayCaseBreakEvenRateDkkPerPhp(marginFloor: number, priceDkk: number): number {
  // priceOre = landedOre / (1 - floor), landedOre = supplierOre + freightOre
  // => supplierOre = priceOre * (1 - floor) - freightOre
  // => rate = supplierOre / (supplierCostPhp * 100)
  const priceOre = dkkToOre(priceDkk);
  const maxLandedOre = priceOre * (1 - marginFloor);
  const maxSupplierOre = maxLandedOre - DISPLAY_CASE_FREIGHT_DKK_ORE;
  return oreToDkk(maxSupplierOre) / DISPLAY_CASE_SUPPLIER_UNIT_COST_PHP;
}

// Shared stock model (docs/ASSEMBLY-SERVICE-WORKFLOW.md, unchanged from the
// existing shop_inventory.case_stock singleton): one pool of case stock
// shared across every car model — never a per-car SKU. A standalone
// purchase deducts one case; a car-plus-case purchase deducts one car
// (boxedKitStockAfterOrder) and one case (this function) — both applied only
// at confirmed-payment time, never when a modal is merely opened.
export function displayCaseStockAfterPurchase(currentCaseStock: number, quantity = 1): number {
  if (quantity > currentCaseStock) {
    throw new Error('Insufficient display case stock for this order.');
  }
  return currentCaseStock - quantity;
}

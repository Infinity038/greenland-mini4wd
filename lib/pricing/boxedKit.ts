// Boxed-kit-only sale structure — docs/ASSEMBLY-SERVICE-WORKFLOW.md §6.
// Replaces the old four-way unbuilt/unbuilt+case/built/built+case stock
// split. There is exactly one saleable SKU per car: the Boxed Kit. Assembly
// and the display case are add-ons, never a second car SKU, and never
// change the boxed-kit stock count.

import { type ServiceAddOnId, DEFAULT_SERVICE_ADDONS, serviceAddOnPriceDkkOre } from './serviceAddOns';

export interface BoxedKitOrderSelection {
  productId: string;
  addOns: ServiceAddOnId[]; // 0 or more of display_case / standard_assembly / ready_to_race_assembly
  addOnPriceOverridesDkk?: Partial<Record<ServiceAddOnId, number>>; // admin-configured prices, if different from defaults
}

export interface BoxedKitOrderTotal {
  boxedKitPriceOre: number;
  addOnLines: { addOn: ServiceAddOnId; label: string; priceOre: number }[];
  totalOre: number;
  requiresAssembly: boolean; // true if either assembly add-on was selected — drives the "built to order" lead-time message
}

export function calculateBoxedKitOrderTotal(
  boxedKitPriceOre: number,
  selection: BoxedKitOrderSelection
): BoxedKitOrderTotal {
  const addOnLines = selection.addOns.map(addOn => ({
    addOn,
    label: DEFAULT_SERVICE_ADDONS[addOn].label,
    priceOre: serviceAddOnPriceDkkOre(addOn, selection.addOnPriceOverridesDkk?.[addOn]),
  }));
  const totalOre = boxedKitPriceOre + addOnLines.reduce((sum, l) => sum + l.priceOre, 0);
  const requiresAssembly = selection.addOns.includes('standard_assembly') || selection.addOns.includes('ready_to_race_assembly');

  return { boxedKitPriceOre, addOnLines, totalOre, requiresAssembly };
}

// A car kit's stock is a single number (the Boxed Kit count). Ordering an
// assembly add-on never creates or requires a second "built" SKU — it only
// consumes one unit of Boxed Kit stock, same as an order with no add-ons.
export function boxedKitStockAfterOrder(currentBoxedKitStock: number, quantity: number): number {
  if (quantity > currentBoxedKitStock) {
    throw new Error('Insufficient boxed kit stock for this order.');
  }
  return currentBoxedKitStock - quantity;
}

// Display Case has its own, separate stock count — never shared with the
// boxed-kit count.
export function displayCaseStockAfterOrder(currentDisplayCaseStock: number, quantity: number): number {
  if (quantity > currentDisplayCaseStock) {
    throw new Error('Insufficient display case stock for this order.');
  }
  return currentDisplayCaseStock - quantity;
}

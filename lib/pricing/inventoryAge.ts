// Inventory-age classification — docs/CATALOG-COSTING-AND-FREIGHT.md /
// docs/SALE-CAMPAIGN-RULES.md §14. Based on stock-RECEIPT date, never
// product-creation date. This is purely informational: reaching an age
// threshold never auto-discounts anything, it only feeds campaign targeting
// ("inventory older than N days") and an admin-facing recommendation badge.

export type InventoryAgeBucket = 'normal' | 'consider_promotion' | 'slow_moving' | 'clearance_candidate' | 'high_priority_clearance';

export interface InventoryAgeClassification {
  bucket: InventoryAgeBucket;
  label: string;
  recommendation: string;
}

export function classifyInventoryAge(daysSinceStockReceipt: number): InventoryAgeClassification {
  if (daysSinceStockReceipt < 0) {
    throw new Error('daysSinceStockReceipt must not be negative');
  }
  if (daysSinceStockReceipt < 90) {
    return { bucket: 'normal', label: 'Normal', recommendation: 'No action needed.' };
  }
  if (daysSinceStockReceipt < 180) {
    return { bucket: 'consider_promotion', label: 'Consider promotion', recommendation: 'Eligible for a Standard Sale campaign.' };
  }
  if (daysSinceStockReceipt < 270) {
    return { bucket: 'slow_moving', label: 'Slow moving', recommendation: 'Consider an Anniversary Sale or a targeted promotion.' };
  }
  if (daysSinceStockReceipt < 365) {
    return { bucket: 'clearance_candidate', label: 'Clearance candidate', recommendation: 'Consider a Clearance campaign.' };
  }
  return { bucket: 'high_priority_clearance', label: 'High-priority clearance', recommendation: 'Consider Clearance or Liquidation.' };
}

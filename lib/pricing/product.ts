// The product shape the campaign engine reasons about. This is intentionally
// broader than the live `products` table today — it's the target shape once
// Phase 5+ of the pricing migration (supabase/migrations-proposed) lands.
// Until then, callers build this from the existing catalog JSON
// (catalog/bmax-initial-catalog.json) plus the pricing fields added in
// lib/pricing/catalogPricingStatus.ts.

import type { ShippingClass } from './shippingClasses';

export type ChassisFamily = 'AR' | 'FM-A' | 'VZ' | 'MA' | 'MS' | 'Super II';

export type ProductCategory = 'cars' | 'parts';

// Coarser classification than `subcategory`, used by campaign targeting
// ("all motors", "all rollers", etc.) — kept separate from the free-text
// `subcategory` field already in the catalog so targeting doesn't silently
// break if subcategory wording changes.
export type PartGroup =
  | 'motors'
  | 'rollers'
  | 'plates'
  | 'gears_drivetrain'
  | 'body_chassis_sets'
  | 'wheels_tires'
  | 'brakes_dampers'
  | 'screws_spacers'
  | 'bearings'
  | 'starter_upgrade_sets'
  | 'accessories'
  | 'other_part';

export interface PricedProduct {
  id: string;
  itemNo: string;
  name: string;
  category: ProductCategory;
  isCompleteCarKit: boolean; // true for a full boxed Mini 4WD kit / Starter Pack
  partGroup?: PartGroup; // set only when category === 'parts'
  chassis?: ChassisFamily;
  tags: string[];
  isCollectorsVault: boolean;
  isPreorder: boolean;
  isSpecialOrder: boolean;
  isClubAsset: boolean; // club display/demo/house car — never eligible for any campaign
  isNewlyArrived: boolean; // convenience flag mirroring `daysSinceStockReceipt < 30`, see inventoryAge.ts
  shippingClass: ShippingClass;
  regularPriceOre: number;
  landedCostOre: number;
  daysSinceStockReceipt: number | null; // null when no receipt record exists yet
}

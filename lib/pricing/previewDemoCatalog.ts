// PREVIEW-ONLY demo catalog for the admin pricing/campaign UI
// (app/admin/pricing). This file is never used by the public shop and is
// never written back to catalog/bmax-initial-catalog.json.
//
// The 10 car kits below are real, board-approved products (item numbers and
// approved regular prices copied from the real catalog — see
// catalog/bmax-initial-catalog.json and docs/PRODUCT-PRICING-POLICY.md §4).
// Their `landedCostOre` values here ARE illustrative placeholders — no
// verified Philippine supplier cost has been entered for these specific
// approved-fixed-price items, so a margin-floor demo needs *some* landed
// cost to compute against. Everything below `--- ILLUSTRATIVE PARTS ---` is
// entirely fictional example data (fake item numbers, fake costs) included
// only so the campaign engine's category/chassis/part-group targeting can
// be demonstrated end-to-end in Preview. None of it must ever be imported
// into the live catalog or Supabase.

import type { PricedProduct } from './product';
import { dkkToOre } from './money';

const APPROVED_CARS: PricedProduct[] = [
  { id: 'tamiya-19443-diospada-premium', itemNo: '19443', name: 'Diospada Premium', category: 'cars', isCompleteCarKit: true, chassis: 'MA', tags: [], isCollectorsVault: false, isPreorder: false, isSpecialOrder: false, isClubAsset: false, isNewlyArrived: false, shippingClass: 'complete_car_kit', regularPriceOre: dkkToOre(249), landedCostOre: dkkToOre(105), daysSinceStockReceipt: 20 },
  { id: 'tamiya-18704-shadow-shark', itemNo: '18704', name: 'Shadow Shark', category: 'cars', isCompleteCarKit: true, chassis: 'MS', tags: [], isCollectorsVault: false, isPreorder: false, isSpecialOrder: false, isClubAsset: false, isNewlyArrived: false, shippingClass: 'complete_car_kit', regularPriceOre: dkkToOre(299), landedCostOre: dkkToOre(125), daysSinceStockReceipt: 400 },
  { id: 'tamiya-18705-flame-astute', itemNo: '18705', name: 'Flame Astute', category: 'cars', isCompleteCarKit: true, chassis: 'MS', tags: [], isCollectorsVault: false, isPreorder: false, isSpecialOrder: false, isClubAsset: false, isNewlyArrived: false, shippingClass: 'complete_car_kit', regularPriceOre: dkkToOre(299), landedCostOre: dkkToOre(125), daysSinceStockReceipt: 60 },
  { id: 'tamiya-19447-beak-stinger-g', itemNo: '19447', name: 'Beak Stinger G', category: 'cars', isCompleteCarKit: true, chassis: 'MA', tags: [], isCollectorsVault: false, isPreorder: false, isSpecialOrder: false, isClubAsset: false, isNewlyArrived: false, shippingClass: 'complete_car_kit', regularPriceOre: dkkToOre(299), landedCostOre: dkkToOre(125), daysSinceStockReceipt: 10 },
  { id: 'tamiya-19451-gun-bluster-xto-premium', itemNo: '19451', name: 'Gun Bluster XTO Premium', category: 'cars', isCompleteCarKit: true, chassis: 'AR', tags: [], isCollectorsVault: false, isPreorder: false, isSpecialOrder: false, isClubAsset: false, isNewlyArrived: false, shippingClass: 'complete_car_kit', regularPriceOre: dkkToOre(299), landedCostOre: dkkToOre(125), daysSinceStockReceipt: 200 },
  { id: 'tamiya-18099-ray-spear', itemNo: '18099', name: 'Ray Spear', category: 'cars', isCompleteCarKit: true, chassis: 'VZ', tags: [], isCollectorsVault: false, isPreorder: false, isSpecialOrder: false, isClubAsset: false, isNewlyArrived: true, shippingClass: 'complete_car_kit', regularPriceOre: dkkToOre(319), landedCostOre: dkkToOre(135), daysSinceStockReceipt: 5 },
  { id: 'tamiya-95126-cyclone-magnum', itemNo: '95126', name: 'Cyclone Magnum Memorial 25th Anniversary', category: 'cars', isCompleteCarKit: true, chassis: 'AR', tags: ['Limited Edition'], isCollectorsVault: true, isPreorder: false, isSpecialOrder: false, isClubAsset: false, isNewlyArrived: false, shippingClass: 'complete_car_kit', regularPriceOre: dkkToOre(329), landedCostOre: dkkToOre(140), daysSinceStockReceipt: 100 },
  { id: 'tamiya-95571-exflowly-purple', itemNo: '95571', name: 'Exflowly Polycarbonate Body Special (Purple)', category: 'cars', isCompleteCarKit: true, chassis: 'FM-A', tags: ['Limited Edition'], isCollectorsVault: true, isPreorder: false, isSpecialOrder: false, isClubAsset: false, isNewlyArrived: false, shippingClass: 'complete_car_kit', regularPriceOre: dkkToOre(329), landedCostOre: dkkToOre(140), daysSinceStockReceipt: 150 },
  { id: 'tamiya-95706-geo-glider', itemNo: '95706', name: 'Geo Glider Asia Challenge 2026 Special', category: 'cars', isCompleteCarKit: true, chassis: 'VZ', tags: ['Limited Edition'], isCollectorsVault: true, isPreorder: false, isSpecialOrder: false, isClubAsset: false, isNewlyArrived: false, shippingClass: 'complete_car_kit', regularPriceOre: dkkToOre(359), landedCostOre: dkkToOre(155), daysSinceStockReceipt: 30 },
  { id: 'tamiya-92462-mach-frame-philippine-cup', itemNo: '92462', name: 'Mach Frame Philippine Cup Special', category: 'cars', isCompleteCarKit: true, chassis: 'MA', tags: ['Limited Edition'], isCollectorsVault: true, isPreorder: false, isSpecialOrder: false, isClubAsset: false, isNewlyArrived: false, shippingClass: 'complete_car_kit', regularPriceOre: dkkToOre(389), landedCostOre: dkkToOre(165), daysSinceStockReceipt: 500 },
];

// --- ILLUSTRATIVE PARTS (fictional, Preview demo only) ---
const ILLUSTRATIVE_PARTS: PricedProduct[] = [
  { id: 'demo-motor-1', itemNo: 'DEMO-15477', name: 'Hyper-Dash 3 Motor (demo)', category: 'parts', isCompleteCarKit: false, partGroup: 'motors', tags: [], isCollectorsVault: false, isPreorder: false, isSpecialOrder: false, isClubAsset: false, isNewlyArrived: false, shippingClass: 'small_part', regularPriceOre: dkkToOre(129), landedCostOre: dkkToOre(64), daysSinceStockReceipt: 200 },
  { id: 'demo-motor-2', itemNo: 'DEMO-15484', name: 'Torque-Tuned 2 Motor (demo)', category: 'parts', isCompleteCarKit: false, partGroup: 'motors', tags: [], isCollectorsVault: false, isPreorder: false, isSpecialOrder: false, isClubAsset: false, isNewlyArrived: false, shippingClass: 'small_part', regularPriceOre: dkkToOre(99), landedCostOre: dkkToOre(48), daysSinceStockReceipt: 400 },
  { id: 'demo-roller-1', itemNo: 'DEMO-ROLLER', name: '13mm Aluminum Roller Set (demo)', category: 'parts', isCompleteCarKit: false, partGroup: 'rollers', tags: [], isCollectorsVault: false, isPreorder: false, isSpecialOrder: false, isClubAsset: false, isNewlyArrived: false, shippingClass: 'small_part', regularPriceOre: dkkToOre(89), landedCostOre: dkkToOre(40), daysSinceStockReceipt: 50 },
  { id: 'demo-body-1', itemNo: 'DEMO-BODYSET', name: 'AR Chassis Replacement Body Set (demo)', category: 'parts', isCompleteCarKit: false, partGroup: 'body_chassis_sets', chassis: 'AR', tags: [], isCollectorsVault: false, isPreorder: false, isSpecialOrder: false, isClubAsset: false, isNewlyArrived: false, shippingClass: 'boxed_body_chassis', regularPriceOre: dkkToOre(199), landedCostOre: dkkToOre(80), daysSinceStockReceipt: 300 },
  { id: 'demo-preorder-1', itemNo: 'DEMO-PREORDER', name: 'Upcoming Limited Kit (demo, preorder)', category: 'cars', isCompleteCarKit: true, chassis: 'MS', tags: [], isCollectorsVault: false, isPreorder: true, isSpecialOrder: false, isClubAsset: false, isNewlyArrived: true, shippingClass: 'complete_car_kit', regularPriceOre: dkkToOre(299), landedCostOre: dkkToOre(125), daysSinceStockReceipt: 0 },
  { id: 'demo-club-asset-1', itemNo: 'DEMO-CLUBCAR', name: 'Club Demo/House Car (demo, club asset)', category: 'cars', isCompleteCarKit: true, chassis: 'VZ', tags: [], isCollectorsVault: false, isPreorder: false, isSpecialOrder: false, isClubAsset: true, isNewlyArrived: false, shippingClass: 'complete_car_kit', regularPriceOre: dkkToOre(299), landedCostOre: dkkToOre(125), daysSinceStockReceipt: 200 },
];

export const PREVIEW_DEMO_CATALOG: PricedProduct[] = [...APPROVED_CARS, ...ILLUSTRATIVE_PARTS];

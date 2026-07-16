// Mock POS catalog: scannable products (stock-tracked) and preset non-product
// items (race entries, practice, rentals, refreshments/merch). Pure lookups
// only — no live inventory table yet, pending schema review.
//
// QR is the primary scan format (see lib/scanner/qrPayload.ts): each product
// carries an opaque qrToken (g4w:product:<qrToken>) and a human-readable
// clubProductId for manual search/typed fallback. The legacy manufacturer
// barcode (EAN/UPC) is kept only as an additional manual-lookup field, not a
// scan target — QR stickers are the club-issued scan target going forward.

export type PosProductAvailability = 'in_stock' | 'low_stock' | 'preorder' | 'out_of_stock';

export interface PosProduct {
  qrToken: string;
  clubProductId: string;
  barcode: string;
  name: string;
  tamiyaItemNumber: string | null;
  unitPriceDkk: number;
  stockQuantity: number;
  category: string;
  chassis: string | null;
  imageUrl: string | null;
  availability: PosProductAvailability;
  // True only for collector kits / limited editions / expensive serialized
  // inventory / display cars — everything else uses one QR per SKU.
  unitLevelQrEligible: boolean;
}

export type PosPresetCategory =
  | 'race_entry'
  | 'second_life'
  | 'practice'
  | 'rental'
  | 'refreshment'
  | 'merchandise';

export interface PosPresetItem {
  barcode: string;
  serviceCode: string;
  name: string;
  category: PosPresetCategory;
  // null = open-price item; staff enters the amount at scan time (e.g. snacks, merch).
  unitPriceDkk: number | null;
  unit: 'each' | 'hour';
}

// Race-related preset categories that must warn staff to attach a Racer
// Profile, and that should never silently accumulate duplicate quantities.
export const RACE_SERVICE_CATEGORIES: PosPresetCategory[] = ['race_entry', 'second_life'];

// Staff-only service QR codes (g4w:service:<serviceCode>) and legacy staff
// barcodes for the same preset. Never customer-facing.
export const PRESET_POS_ITEMS: PosPresetItem[] = [
  { barcode: 'POS-WEEKLY-ENTRY',   serviceCode: 'weekly-entry',        name: 'Weekly Entry',            category: 'race_entry',  unitPriceDkk: 150, unit: 'each' },
  { barcode: 'POS-WEEKLY-2ND',     serviceCode: 'weekly-second-life',  name: 'Weekly Second Life',      category: 'second_life', unitPriceDkk: 50,  unit: 'each' },
  { barcode: 'POS-BIGEVENT-ENTRY', serviceCode: 'bigevent-entry',      name: 'Big Event Entry',         category: 'race_entry',  unitPriceDkk: 500, unit: 'each' },
  { barcode: 'POS-BIGEVENT-2ND',   serviceCode: 'bigevent-second-life', name: 'Big Event Second Life',  category: 'second_life', unitPriceDkk: 100, unit: 'each' },
  { barcode: 'POS-PRACTICE',       serviceCode: 'practice-session',    name: 'Practice Session',        category: 'practice',    unitPriceDkk: 50,  unit: 'each' },
  { barcode: 'POS-HOUSECAR-HR',    serviceCode: 'house-car-rental',    name: 'House Car Rental',        category: 'rental',      unitPriceDkk: 25,  unit: 'hour' },
  { barcode: 'POS-SNACK',          serviceCode: 'snacks',              name: 'Soft Drinks / Snacks',    category: 'refreshment', unitPriceDkk: null, unit: 'each' },
  { barcode: 'POS-MERCH',          serviceCode: 'merchandise',         name: 'Merchandise',             category: 'merchandise', unitPriceDkk: null, unit: 'each' },
];

function deriveAvailability(stockQuantity: number, isPreorder: boolean): PosProductAvailability {
  if (isPreorder) return 'preorder';
  if (stockQuantity <= 0) return 'out_of_stock';
  if (stockQuantity <= 3) return 'low_stock';
  return 'in_stock';
}

// Illustrative example catalog for the mock screen/tests only. Real search
// (by name/item#/Club Product ID/barcode/category/chassis) will need
// server-side/indexed search once wired to a live catalog table with
// hundreds of products — this in-memory filter is a stand-in, not the final
// approach.
export const MOCK_PRODUCT_CATALOG: PosProduct[] = [
  { qrToken: 'tok_prod_95892', clubProductId: 'G4W-P-0001', barcode: '4950344958926', name: 'Mini 4WD Fully Cowled Chassis Kit', tamiyaItemNumber: '95892', unitPriceDkk: 189, stockQuantity: 12, category: 'Chassis', chassis: 'Fully Cowled (FM-A)', imageUrl: null, availability: deriveAvailability(12, false), unitLevelQrEligible: false },
  { qrToken: 'tok_prod_15373', clubProductId: 'G4W-P-0002', barcode: '4950344993737', name: 'Hyper-Dash 3 Motor',                tamiyaItemNumber: '15373', unitPriceDkk: 99,  stockQuantity: 4,  category: 'Motors',  chassis: null,                     imageUrl: null, availability: deriveAvailability(4, false),  unitLevelQrEligible: false },
  { qrToken: 'tok_prod_18093', clubProductId: 'G4W-P-0003', barcode: '4950344180938', name: 'Low Friction Plastic Roller 13mm',  tamiyaItemNumber: '18093', unitPriceDkk: 45,  stockQuantity: 0,  category: 'Rollers', chassis: null,                     imageUrl: null, availability: deriveAvailability(0, false),  unitLevelQrEligible: false },
  { qrToken: 'tok_prod_95173', clubProductId: 'G4W-P-0004', barcode: '4950344951736', name: 'Super-X Chassis Kit',               tamiyaItemNumber: '95173', unitPriceDkk: 175, stockQuantity: 2,  category: 'Chassis', chassis: 'Super-X (SX)',           imageUrl: null, availability: deriveAvailability(2, false),  unitLevelQrEligible: false },
  { qrToken: 'tok_prod_18012', clubProductId: 'G4W-P-0005', barcode: '4950344180129', name: 'Aluminum Roller 9-8mm',             tamiyaItemNumber: '18012', unitPriceDkk: 65,  stockQuantity: 0,  category: 'Rollers', chassis: null,                     imageUrl: null, availability: deriveAvailability(0, true),   unitLevelQrEligible: false },
  { qrToken: 'tok_prod_95428', clubProductId: 'G4W-P-0006', barcode: '4950344954287', name: 'MA Chassis Reinforced Gear Set',    tamiyaItemNumber: '95428', unitPriceDkk: 55,  stockQuantity: 20, category: 'Gears',   chassis: 'MA',                     imageUrl: null, availability: deriveAvailability(20, false), unitLevelQrEligible: false },
  { qrToken: 'tok_prod_99999', clubProductId: 'G4W-P-0007', barcode: '4950344999999', name: '30th Anniversary Limited Edition Kit', tamiyaItemNumber: '99999', unitPriceDkk: 450, stockQuantity: 3, category: 'Collector', chassis: 'Super-II', imageUrl: null, availability: deriveAvailability(3, false), unitLevelQrEligible: true },
];

export type ScannedPosItem =
  | { kind: 'product'; product: PosProduct }
  | { kind: 'preset'; preset: PosPresetItem };

// Legacy manual/typed-code lookup — matches a legacy barcode or a staff
// preset barcode. QR scans are resolved via lookupProductByQrToken /
// lookupServiceByCode after lib/scanner/qrPayload.ts routing instead.
export function scanBarcode(
  barcode: string,
  catalog: PosProduct[] = MOCK_PRODUCT_CATALOG,
  presets: PosPresetItem[] = PRESET_POS_ITEMS
): ScannedPosItem | null {
  const code = barcode.trim();
  const product = catalog.find(p => p.barcode === code);
  if (product) return { kind: 'product', product };
  const preset = presets.find(p => p.barcode === code);
  if (preset) return { kind: 'preset', preset };
  return null;
}

// Resolves a scanned Product QR token. Never mutates stock or any other state.
export function lookupProductByQrToken(token: string, catalog: PosProduct[] = MOCK_PRODUCT_CATALOG): PosProduct | null {
  return catalog.find(p => p.qrToken === token) ?? null;
}

// Resolves a scanned Service QR code (g4w:service:<serviceCode>).
export function lookupServiceByCode(code: string, presets: PosPresetItem[] = PRESET_POS_ITEMS): PosPresetItem | null {
  return presets.find(p => p.serviceCode === code) ?? null;
}

// Race-related preset services must not silently accumulate duplicate
// quantities on a single line — the POS UI uses this to disable the "+"
// stepper for these line items instead.
export function isRaceServiceBarcode(barcode: string, presets: PosPresetItem[] = PRESET_POS_ITEMS): boolean {
  const preset = presets.find(p => p.barcode === barcode);
  return !!preset && RACE_SERVICE_CATEGORIES.includes(preset.category);
}

// Searches name, Tamiya item number, Club Product ID, barcode, category and
// chassis. Returns the full catalog for an empty query so the combobox can
// show "browse all".
export function searchProducts(query: string, catalog: PosProduct[] = MOCK_PRODUCT_CATALOG): PosProduct[] {
  const q = query.trim().toLowerCase();
  if (!q) return catalog;
  return catalog.filter(p =>
    p.name.toLowerCase().includes(q) ||
    (p.tamiyaItemNumber ?? '').toLowerCase().includes(q) ||
    p.clubProductId.toLowerCase().includes(q) ||
    p.barcode.includes(q) ||
    p.category.toLowerCase().includes(q) ||
    (p.chassis ?? '').toLowerCase().includes(q)
  );
}

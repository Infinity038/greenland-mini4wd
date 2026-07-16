// Mock POS catalog: scannable products (stock-tracked) and preset non-product
// items (race entries, practice, rentals, refreshments/merch). Pure lookups
// only — no live inventory table yet, pending schema review.

export type PosProductAvailability = 'in_stock' | 'low_stock' | 'preorder' | 'out_of_stock';

export interface PosProduct {
  barcode: string;
  name: string;
  tamiyaItemNumber: string | null;
  unitPriceDkk: number;
  stockQuantity: number;
  category: string;
  chassis: string | null;
  imageUrl: string | null;
  availability: PosProductAvailability;
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
  name: string;
  category: PosPresetCategory;
  // null = open-price item; staff enters the amount at scan time (e.g. snacks, merch).
  unitPriceDkk: number | null;
  unit: 'each' | 'hour';
}

// Race-related preset categories that must warn staff to attach a Racer
// Profile, and that should never silently accumulate duplicate quantities.
export const RACE_SERVICE_CATEGORIES: PosPresetCategory[] = ['race_entry', 'second_life'];

// Staff-only barcodes for non-product charges. Never customer-facing.
export const PRESET_POS_ITEMS: PosPresetItem[] = [
  { barcode: 'POS-WEEKLY-ENTRY',   name: 'Weekly Entry',            category: 'race_entry',  unitPriceDkk: 150, unit: 'each' },
  { barcode: 'POS-WEEKLY-2ND',     name: 'Weekly Second Life',      category: 'second_life', unitPriceDkk: 50,  unit: 'each' },
  { barcode: 'POS-BIGEVENT-ENTRY', name: 'Big Event Entry',         category: 'race_entry',  unitPriceDkk: 500, unit: 'each' },
  { barcode: 'POS-BIGEVENT-2ND',   name: 'Big Event Second Life',   category: 'second_life', unitPriceDkk: 100, unit: 'each' },
  { barcode: 'POS-PRACTICE',       name: 'Practice Session',        category: 'practice',    unitPriceDkk: 50,  unit: 'each' },
  { barcode: 'POS-HOUSECAR-HR',    name: 'House Car Rental',        category: 'rental',      unitPriceDkk: 25,  unit: 'hour' },
  { barcode: 'POS-SNACK',          name: 'Soft Drinks / Snacks',    category: 'refreshment', unitPriceDkk: null, unit: 'each' },
  { barcode: 'POS-MERCH',          name: 'Merchandise',             category: 'merchandise', unitPriceDkk: null, unit: 'each' },
];

function deriveAvailability(stockQuantity: number, isPreorder: boolean): PosProductAvailability {
  if (isPreorder) return 'preorder';
  if (stockQuantity <= 0) return 'out_of_stock';
  if (stockQuantity <= 3) return 'low_stock';
  return 'in_stock';
}

// Illustrative example catalog for the mock screen/tests only. Real search
// (by name/item#/barcode/category/chassis) will need server-side/indexed
// search once wired to a live catalog table with hundreds of products —
// this in-memory filter is a stand-in for that, not the final approach.
export const MOCK_PRODUCT_CATALOG: PosProduct[] = [
  { barcode: '4950344958926', name: 'Mini 4WD Fully Cowled Chassis Kit', tamiyaItemNumber: '95892', unitPriceDkk: 189, stockQuantity: 12, category: 'Chassis', chassis: 'Fully Cowled (FM-A)', imageUrl: null, availability: deriveAvailability(12, false) },
  { barcode: '4950344993737', name: 'Hyper-Dash 3 Motor',                tamiyaItemNumber: '15373', unitPriceDkk: 99,  stockQuantity: 4,  category: 'Motors',  chassis: null,                     imageUrl: null, availability: deriveAvailability(4, false) },
  { barcode: '4950344180938', name: 'Low Friction Plastic Roller 13mm',  tamiyaItemNumber: '18093', unitPriceDkk: 45,  stockQuantity: 0,  category: 'Rollers', chassis: null,                     imageUrl: null, availability: deriveAvailability(0, false) },
  { barcode: '4950344951736', name: 'Super-X Chassis Kit',               tamiyaItemNumber: '95173', unitPriceDkk: 175, stockQuantity: 2,  category: 'Chassis', chassis: 'Super-X (SX)',           imageUrl: null, availability: deriveAvailability(2, false) },
  { barcode: '4950344180129', name: 'Aluminum Roller 9-8mm',             tamiyaItemNumber: '18012', unitPriceDkk: 65,  stockQuantity: 0,  category: 'Rollers', chassis: null,                     imageUrl: null, availability: deriveAvailability(0, true) },
  { barcode: '4950344954287', name: 'MA Chassis Reinforced Gear Set',    tamiyaItemNumber: '95428', unitPriceDkk: 55,  stockQuantity: 20, category: 'Gears',   chassis: 'MA',                     imageUrl: null, availability: deriveAvailability(20, false) },
];

export type ScannedPosItem =
  | { kind: 'product'; product: PosProduct }
  | { kind: 'preset'; preset: PosPresetItem };

// Read-only lookup. Never mutates stock or any other state.
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

// Race-related preset services must not silently accumulate duplicate
// quantities on a single line — the POS UI uses this to disable the "+"
// stepper for these line items instead.
export function isRaceServiceBarcode(barcode: string, presets: PosPresetItem[] = PRESET_POS_ITEMS): boolean {
  const preset = presets.find(p => p.barcode === barcode);
  return !!preset && RACE_SERVICE_CATEGORIES.includes(preset.category);
}

// Searches name, Tamiya item number, barcode, category and chassis. Returns
// the full catalog for an empty query so the combobox can show "browse all".
export function searchProducts(query: string, catalog: PosProduct[] = MOCK_PRODUCT_CATALOG): PosProduct[] {
  const q = query.trim().toLowerCase();
  if (!q) return catalog;
  return catalog.filter(p =>
    p.name.toLowerCase().includes(q) ||
    (p.tamiyaItemNumber ?? '').toLowerCase().includes(q) ||
    p.barcode.includes(q) ||
    p.category.toLowerCase().includes(q) ||
    (p.chassis ?? '').toLowerCase().includes(q)
  );
}

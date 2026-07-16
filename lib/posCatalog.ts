// Mock POS catalog: scannable products (stock-tracked) and preset non-product
// items (race entries, practice, rentals, refreshments/merch). Pure lookups
// only — no live inventory table yet, pending schema review.

export interface PosProduct {
  barcode: string;
  name: string;
  tamiyaItemNumber: string | null;
  unitPriceDkk: number;
  stockQuantity: number;
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

// Illustrative example catalog for the mock screen/tests only.
export const MOCK_PRODUCT_CATALOG: PosProduct[] = [
  { barcode: '4950344958926', name: 'Mini 4WD Fully Cowled Chassis Kit', tamiyaItemNumber: '95892', unitPriceDkk: 189, stockQuantity: 12 },
  { barcode: '4950344993737', name: 'Hyper-Dash 3 Motor',                tamiyaItemNumber: '15373', unitPriceDkk: 99,  stockQuantity: 4 },
  { barcode: '4950344180938', name: 'Low Friction Plastic Roller 13mm',  tamiyaItemNumber: '18093', unitPriceDkk: 45,  stockQuantity: 0 },
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

// Typed architecture for linking an unknown scanned barcode to a product.
// Non-persistent: proposeBarcodeMapping() only builds the record a real
// implementation would save — nothing here writes to Supabase. Saving these
// mappings is a future database-dependent phase pending schema/RLS review.

export type BarcodeType = 'ean_13' | 'ean_8' | 'upc_a' | 'upc_e' | 'code_128' | 'manual';

export interface BarcodeMapping {
  productId: string;
  barcode: string;
  barcodeType: BarcodeType;
  assignedBy: string;
  assignedAt: string;
  active: boolean;
}

export function proposeBarcodeMapping(input: {
  productId: string;
  barcode: string;
  barcodeType: BarcodeType;
  assignedBy: string;
}): BarcodeMapping {
  return { ...input, assignedAt: new Date().toISOString(), active: true };
}

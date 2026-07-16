// Pure, testable capability detection for the camera scanner. Kept separate
// from the React component so support checks can be unit tested without a
// real camera or browser. See components/pos/CameraScannerModal.tsx for the
// actual getUserMedia + BarcodeDetector wiring.

export type ScannerCapability = 'supported' | 'unsupported';

// Barcode formats the product scanner requests from BarcodeDetector.
export const PRODUCT_BARCODE_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'] as const;
// Racer identity is always a QR code.
export const RACER_QR_FORMATS = ['qr_code'] as const;

export type BarcodeFormat = (typeof PRODUCT_BARCODE_FORMATS)[number] | (typeof RACER_QR_FORMATS)[number];

interface BarcodeDetectorGlobal {
  new (options?: { formats: string[] }): { detect(source: unknown): Promise<{ rawValue: string }[]> };
  getSupportedFormats?: () => Promise<string[]>;
}

function getWindowWithBarcodeDetector(): (Window & { BarcodeDetector?: BarcodeDetectorGlobal }) | undefined {
  return typeof window !== 'undefined' ? (window as Window & { BarcodeDetector?: BarcodeDetectorGlobal }) : undefined;
}

// Chrome/Edge desktop + Android Chrome have shipped the Shape Detection
// BarcodeDetector API since 2020; Safari added it in Safari 17 (iOS/macOS,
// Sept 2023). Firefox has not implemented it as of this writing — those
// browsers fall back to the barcode field, hardware scanner, or search.
export function getBarcodeDetectorCapability(): ScannerCapability {
  const win = getWindowWithBarcodeDetector();
  return win && 'BarcodeDetector' in win ? 'supported' : 'unsupported';
}

export function getCameraCapability(): ScannerCapability {
  if (typeof navigator === 'undefined') return 'unsupported';
  return typeof navigator.mediaDevices?.getUserMedia === 'function' ? 'supported' : 'unsupported';
}

export function createBarcodeDetector(formats: readonly string[]): { detect(source: unknown): Promise<{ rawValue: string }[]> } | null {
  const win = getWindowWithBarcodeDetector();
  if (!win || !('BarcodeDetector' in win) || !win.BarcodeDetector) return null;
  return new win.BarcodeDetector({ formats: [...formats] });
}

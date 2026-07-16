// Pure, testable capability detection for the camera scanner. Kept separate
// from the React component so support checks can be unit tested without a
// real camera or browser. See components/pos/CameraScannerModal.tsx for the
// actual getUserMedia + decoder wiring, and lib/scanner/qrDecoderEngine.ts
// for the native/fallback decode engines.

export type ScannerCapability = 'supported' | 'unsupported';

// Every club-controlled code is a QR code (see lib/scanner/qrPayload.ts).
export const QR_FORMATS = ['qr_code'] as const;

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

import { describe, it, expect, afterEach } from 'vitest';
import { getBarcodeDetectorCapability, getCameraCapability, createBarcodeDetector, PRODUCT_BARCODE_FORMATS } from './scannerSupport';

describe('scannerSupport', () => {
  afterEach(() => {
    // @ts-expect-error test cleanup of a global stub
    delete window.BarcodeDetector;
  });

  it('reports unsupported when window.BarcodeDetector is absent', () => {
    expect(getBarcodeDetectorCapability()).toBe('unsupported');
  });

  it('reports supported when window.BarcodeDetector is present', () => {
    // @ts-expect-error test stub
    window.BarcodeDetector = class {};
    expect(getBarcodeDetectorCapability()).toBe('supported');
  });

  it('reports camera capability based on navigator.mediaDevices.getUserMedia', () => {
    const original = navigator.mediaDevices;
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: () => {} }, configurable: true });
    expect(getCameraCapability()).toBe('supported');
    Object.defineProperty(navigator, 'mediaDevices', { value: original, configurable: true });
  });

  it('createBarcodeDetector returns null when unsupported', () => {
    expect(createBarcodeDetector(PRODUCT_BARCODE_FORMATS)).toBeNull();
  });

  it('createBarcodeDetector constructs a detector with the given formats when supported', () => {
    let capturedFormats: string[] = [];
    // @ts-expect-error test stub
    window.BarcodeDetector = class {
      constructor(opts: { formats: string[] }) { capturedFormats = opts.formats; }
      detect() { return Promise.resolve([]); }
    };
    const detector = createBarcodeDetector(PRODUCT_BARCODE_FORMATS);
    expect(detector).not.toBeNull();
    expect(capturedFormats).toEqual([...PRODUCT_BARCODE_FORMATS]);
  });
});

// QR decode engine abstraction: prefers the native BarcodeDetector when QR
// support is genuinely available, and lazy-loads a pure-JS WASM-free QR
// decoder (jsQR) otherwise — critically including iPhone Safari/WebKit,
// which historically lagged native Shape Detection support. jsQR is only
// ever fetched when the native path is unavailable, so browsers with native
// support never download it.
import { getBarcodeDetectorCapability, createBarcodeDetector, QR_FORMATS } from './scannerSupport';

export interface QrDecodeResult {
  rawValue: string;
}

export interface QrDecoderEngine {
  readonly kind: 'native' | 'fallback';
  detect(video: HTMLVideoElement): Promise<QrDecodeResult[]>;
}

export function createNativeQrDecoder(): QrDecoderEngine | null {
  if (getBarcodeDetectorCapability() === 'unsupported') return null;
  const detector = createBarcodeDetector(QR_FORMATS);
  if (!detector) return null;
  return {
    kind: 'native',
    detect: (video: HTMLVideoElement) => detector.detect(video),
  };
}

// Injectable jsQR loader so tests can stub the dynamic import instead of
// bundling/mocking the real library.
export type JsQrLoader = () => Promise<{ default: (data: Uint8ClampedArray, width: number, height: number) => { data: string } | null }>;

const defaultJsQrLoader: JsQrLoader = () => import('jsqr');

export async function loadFallbackQrDecoder(loadJsQr: JsQrLoader = defaultJsQrLoader): Promise<QrDecoderEngine> {
  const { default: jsQR } = await loadJsQr();
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  return {
    kind: 'fallback',
    async detect(video: HTMLVideoElement): Promise<QrDecodeResult[]> {
      const width = video.videoWidth;
      const height = video.videoHeight;
      if (!ctx || !width || !height) return [];
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(video, 0, 0, width, height);
      const imageData = ctx.getImageData(0, 0, width, height);
      const result = jsQR(imageData.data, imageData.width, imageData.height);
      return result ? [{ rawValue: result.data }] : [];
    },
  };
}

// Chooses the best available engine: native first, lazy-loaded fallback
// second. Returns null only when neither path can work (camera itself is
// checked separately via getCameraCapability()).
export async function selectQrDecoderEngine(loadJsQr: JsQrLoader = defaultJsQrLoader): Promise<QrDecoderEngine | null> {
  const native = createNativeQrDecoder();
  if (native) return native;
  try {
    return await loadFallbackQrDecoder(loadJsQr);
  } catch {
    return null;
  }
}

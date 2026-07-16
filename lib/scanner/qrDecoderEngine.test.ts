import { describe, it, expect, vi, afterEach } from 'vitest';
import { createNativeQrDecoder, loadFallbackQrDecoder, selectQrDecoderEngine } from './qrDecoderEngine';

function mockCanvasContext() {
  const drawImage = vi.fn();
  const getImageData = vi.fn().mockReturnValue({ data: new Uint8ClampedArray(4), width: 10, height: 10 });
  HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({ drawImage, getImageData });
  return { drawImage, getImageData };
}

function mockVideo(width = 640, height = 480): HTMLVideoElement {
  const video = document.createElement('video');
  Object.defineProperty(video, 'videoWidth', { value: width, configurable: true });
  Object.defineProperty(video, 'videoHeight', { value: height, configurable: true });
  return video;
}

describe('createNativeQrDecoder', () => {
  afterEach(() => {
    // @ts-expect-error test cleanup
    delete window.BarcodeDetector;
  });

  it('returns null when BarcodeDetector is unsupported', () => {
    expect(createNativeQrDecoder()).toBeNull();
  });

  it('returns a native decoder that delegates to BarcodeDetector.detect', async () => {
    // @ts-expect-error test stub
    window.BarcodeDetector = class {
      detect() { return Promise.resolve([{ rawValue: 'g4w:product:tok_1' }]); }
    };
    const decoder = createNativeQrDecoder();
    expect(decoder?.kind).toBe('native');
    const results = await decoder!.detect(mockVideo());
    expect(results).toEqual([{ rawValue: 'g4w:product:tok_1' }]);
  });
});

describe('loadFallbackQrDecoder', () => {
  it('loads the injected jsQR module and decodes a video frame', async () => {
    mockCanvasContext();
    const jsQR = vi.fn().mockReturnValue({ data: 'g4w:racer:tok_2' });
    const loader = vi.fn().mockResolvedValue({ default: jsQR });
    const decoder = await loadFallbackQrDecoder(loader);
    expect(loader).toHaveBeenCalledTimes(1);
    expect(decoder.kind).toBe('fallback');
    const results = await decoder.detect(mockVideo());
    expect(jsQR).toHaveBeenCalled();
    expect(results).toEqual([{ rawValue: 'g4w:racer:tok_2' }]);
  });

  it('returns no results when jsQR finds nothing in the frame', async () => {
    mockCanvasContext();
    const jsQR = vi.fn().mockReturnValue(null);
    const loader = vi.fn().mockResolvedValue({ default: jsQR });
    const decoder = await loadFallbackQrDecoder(loader);
    const results = await decoder.detect(mockVideo());
    expect(results).toEqual([]);
  });
});

describe('selectQrDecoderEngine', () => {
  afterEach(() => {
    // @ts-expect-error test cleanup
    delete window.BarcodeDetector;
  });

  it('prefers the native decoder when BarcodeDetector is supported', async () => {
    // @ts-expect-error test stub
    window.BarcodeDetector = class { detect() { return Promise.resolve([]); } };
    const loader = vi.fn();
    const engine = await selectQrDecoderEngine(loader);
    expect(engine?.kind).toBe('native');
    expect(loader).not.toHaveBeenCalled();
  });

  it('falls back to the lazy-loaded JS decoder in an iPhone-Safari-style environment (no BarcodeDetector)', async () => {
    mockCanvasContext();
    const jsQR = vi.fn().mockReturnValue(null);
    const loader = vi.fn().mockResolvedValue({ default: jsQR });
    const engine = await selectQrDecoderEngine(loader);
    expect(engine?.kind).toBe('fallback');
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('returns null when neither native nor the fallback loader can produce a decoder', async () => {
    const loader = vi.fn().mockRejectedValue(new Error('network error'));
    const engine = await selectQrDecoderEngine(loader);
    expect(engine).toBeNull();
  });
});

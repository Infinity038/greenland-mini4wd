import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import CameraScannerModal from './CameraScannerModal';
import { PRODUCT_BARCODE_FORMATS } from '@/lib/scanner/scannerSupport';

function mockStream() {
  const stop = vi.fn();
  return { getTracks: () => [{ stop }] } as unknown as MediaStream;
}

describe('CameraScannerModal', () => {
  afterEach(() => {
    // @ts-expect-error test cleanup
    delete window.BarcodeDetector;
    Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true });
    vi.restoreAllMocks();
  });

  it('shows an unsupported-browser message when BarcodeDetector is missing', async () => {
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: vi.fn() }, configurable: true });
    render(<CameraScannerModal title="Scan Product" formats={PRODUCT_BARCODE_FORMATS} onDetected={vi.fn()} onCancel={vi.fn()} />);
    await waitFor(() => expect(screen.getByText(/isn't supported in this browser/)).toBeInTheDocument());
  });

  it('shows a permission-denied message and offers Retry when getUserMedia is rejected', async () => {
    // @ts-expect-error test stub
    window.BarcodeDetector = class { detect() { return Promise.resolve([]); } };
    const getUserMedia = vi.fn().mockRejectedValue(Object.assign(new Error('denied'), { name: 'NotAllowedError' }));
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia }, configurable: true });
    render(<CameraScannerModal title="Scan Product" formats={PRODUCT_BARCODE_FORMATS} onDetected={vi.fn()} onCancel={vi.fn()} />);
    await waitFor(() => expect(screen.getByText(/permission was denied/)).toBeInTheDocument());
    expect(screen.getByText('RETRY')).toBeInTheDocument();
  });

  it('calls onCancel and stops any camera stream when Cancel is clicked', async () => {
    const stream = mockStream();
    // @ts-expect-error test stub
    window.BarcodeDetector = class { detect() { return Promise.resolve([]); } };
    const getUserMedia = vi.fn().mockResolvedValue(stream);
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia }, configurable: true });
    const onCancel = vi.fn();
    const { container } = render(<CameraScannerModal title="Scan Product" formats={PRODUCT_BARCODE_FORMATS} onDetected={vi.fn()} onCancel={onCancel} />);
    const video = container.querySelector('video');
    if (video) video.play = vi.fn().mockResolvedValue(undefined);
    await waitFor(() => expect(getUserMedia).toHaveBeenCalled());
    await new Promise(resolve => setTimeout(resolve, 0));
    fireEvent.click(screen.getByText('CANCEL'));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect((stream.getTracks()[0] as unknown as { stop: ReturnType<typeof vi.fn> }).stop).toHaveBeenCalled();
  });

  it('calls onDetected with the decoded value and stops the camera on a valid scan', async () => {
    const stop = vi.fn();
    const stream = { getTracks: () => [{ stop }] } as unknown as MediaStream;
    // @ts-expect-error test stub
    window.BarcodeDetector = class { detect() { return Promise.resolve([{ rawValue: '4950344993737' }]); } };
    const getUserMedia = vi.fn().mockResolvedValue(stream);
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia }, configurable: true });
    const onDetected = vi.fn();
    const { container } = render(<CameraScannerModal title="Scan Product" formats={PRODUCT_BARCODE_FORMATS} onDetected={onDetected} onCancel={vi.fn()} />);
    const video = container.querySelector('video');
    if (video) video.play = vi.fn().mockResolvedValue(undefined);
    await waitFor(() => expect(onDetected).toHaveBeenCalledWith('4950344993737'));
    expect(stop).toHaveBeenCalled();
  });
});

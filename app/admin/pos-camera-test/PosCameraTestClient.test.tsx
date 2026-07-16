import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import PosCameraTestClient from './PosCameraTestClient';
import { MOCK_PRODUCT_CATALOG } from '@/lib/posCatalog';
import { MOCK_RACER_DIRECTORY } from '@/lib/posRacerDirectory';
import { MOCK_CAR_DIRECTORY } from '@/lib/posCarDirectory';
import { MOCK_EVENT_DIRECTORY } from '@/lib/posEventDirectory';

function parseManually(value: string) {
  fireEvent.change(screen.getByPlaceholderText(/type\/paste a QR payload/), { target: { value } });
  fireEvent.click(screen.getByText('PARSE'));
}

afterEach(() => {
  // @ts-expect-error test cleanup
  delete window.BarcodeDetector;
  Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true });
  vi.restoreAllMocks();
});

describe('PosCameraTestClient — warning and links', () => {
  it('shows the required large warning banner', () => {
    render(<PosCameraTestClient />);
    expect(screen.getByText('PREVIEW CAMERA TEST — MOCK DATA ONLY')).toBeInTheDocument();
  });

  it('links to the printable QR test sheet', () => {
    render(<PosCameraTestClient />);
    const link = screen.getByText(/View the printable QR test sheet/).closest('a');
    expect(link).toHaveAttribute('href', '/admin/qr-test-sheet');
  });
});

describe('PosCameraTestClient — manual QR payload input and decoded-result display', () => {
  it('parses and displays a Product QR result', () => {
    render(<PosCameraTestClient />);
    parseManually('g4w:product:tok_prod_15373');
    expect(screen.getByText(/Type: product/)).toBeInTheDocument();
    expect(screen.getByText(/Hyper-Dash 3 Motor/)).toBeInTheDocument();
  });

  it('parses and displays a Racer QR result', () => {
    render(<PosCameraTestClient />);
    parseManually('g4w:racer:tok_racer_0047');
    expect(screen.getByText(/J\. Racer/)).toBeInTheDocument();
  });

  it('parses and displays a Redemption QR result without marking it used', () => {
    render(<PosCameraTestClient />);
    parseManually('g4w:redemption:redeem_demo_valid_0001');
    expect(screen.getByText(/Redemption lookup result: valid/)).toBeInTheDocument();
  });

  it('shows a clear error for a malformed/unknown QR payload', () => {
    render(<PosCameraTestClient />);
    parseManually('g4w:coupon:tok_unknown_0001');
    expect(screen.getByText(/Not a recognized Arctic Mini4WD QR payload/)).toBeInTheDocument();
  });
});

describe('PosCameraTestClient — camera diagnostics', () => {
  it('reports camera and BarcodeDetector capability', () => {
    render(<PosCameraTestClient />);
    expect(screen.getByText('CAMERA DIAGNOSTICS')).toBeInTheDocument();
    expect(screen.getAllByText('unsupported').length).toBe(2);
    expect(screen.getByText(/fallback \(jsQR, lazy-loaded\)/)).toBeInTheDocument();
  });

  it('OPEN CAMERA opens the shared scanner modal', () => {
    // @ts-expect-error test stub
    window.BarcodeDetector = class { detect() { return Promise.resolve([]); } };
    const getUserMedia = vi.fn().mockResolvedValue({ getTracks: () => [{ stop: vi.fn() }] });
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia }, configurable: true });
    render(<PosCameraTestClient />);
    fireEvent.click(screen.getByText('📷 OPEN CAMERA'));
    expect(screen.getByText('Scan QR Code (Preview Test)')).toBeInTheDocument();
  });

  it('a camera-detected QR is parsed and shown, and the modal closes', async () => {
    // @ts-expect-error test stub
    window.BarcodeDetector = class { detect() { return Promise.resolve([{ rawValue: 'g4w:car:tok_car_0047' }]); } };
    const getUserMedia = vi.fn().mockResolvedValue({ getTracks: () => [{ stop: vi.fn() }] });
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia }, configurable: true });
    render(<PosCameraTestClient />);
    fireEvent.click(screen.getByText('📷 OPEN CAMERA'));
    const video = document.querySelector('video');
    if (video) video.play = vi.fn().mockResolvedValue(undefined);
    await waitFor(() => expect(screen.getByText(/Ray Spear/)).toBeInTheDocument());
    expect(screen.queryByText('Scan QR Code (Preview Test)')).not.toBeInTheDocument();
  });
});

describe('PosCameraTestClient — zero mutation', () => {
  it('scanning any QR type never mutates the underlying mock data', () => {
    const beforeProducts = JSON.stringify(MOCK_PRODUCT_CATALOG);
    const beforeRacers = JSON.stringify(MOCK_RACER_DIRECTORY);
    const beforeCars = JSON.stringify(MOCK_CAR_DIRECTORY);
    const beforeEvents = JSON.stringify(MOCK_EVENT_DIRECTORY);

    render(<PosCameraTestClient />);
    parseManually('g4w:product:tok_prod_15373');
    parseManually('g4w:racer:tok_racer_0047');
    parseManually('g4w:car:tok_car_0047');
    parseManually('g4w:event:tok_event_weekly_260718');
    parseManually('g4w:redemption:redeem_demo_valid_0001');
    parseManually('g4w:service:weekly-entry');

    expect(JSON.stringify(MOCK_PRODUCT_CATALOG)).toBe(beforeProducts);
    expect(JSON.stringify(MOCK_RACER_DIRECTORY)).toBe(beforeRacers);
    expect(JSON.stringify(MOCK_CAR_DIRECTORY)).toBe(beforeCars);
    expect(JSON.stringify(MOCK_EVENT_DIRECTORY)).toBe(beforeEvents);
  });

  it('repeated redemption lookups of the same valid token remain "valid" (never auto-marked used)', () => {
    render(<PosCameraTestClient />);
    parseManually('g4w:redemption:redeem_demo_valid_0001');
    expect(screen.getByText(/Redemption lookup result: valid/)).toBeInTheDocument();
    parseManually('g4w:redemption:redeem_demo_valid_0001');
    expect(screen.getByText(/Redemption lookup result: valid/)).toBeInTheDocument();
  });
});

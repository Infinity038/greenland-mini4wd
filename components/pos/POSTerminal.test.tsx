import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import POSTerminal from './POSTerminal';

const MOTOR_BARCODE = '4950344993737'; // Hyper-Dash 3 Motor, stock 4
const OUT_OF_STOCK_BARCODE = '4950344180938'; // Low Friction Roller, stock 0
const RACER_ID = 'G4W-R-0047';

function scan(input: HTMLElement, value: string) {
  fireEvent.change(input, { target: { value } });
  fireEvent.keyDown(input, { key: 'Enter' });
}

function mockCameraSupport(detected: string[] = []) {
  let call = 0;
  // @ts-expect-error test stub
  window.BarcodeDetector = class {
    detect() {
      const value = detected[call];
      call += 1;
      return Promise.resolve(value ? [{ rawValue: value }] : []);
    }
  };
  const stop = vi.fn();
  const getUserMedia = vi.fn().mockResolvedValue({ getTracks: () => [{ stop }] });
  Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia }, configurable: true });
  return { stop };
}

describe('POSTerminal — product scan/search', () => {
  afterEach(() => {
    // @ts-expect-error test cleanup
    delete window.BarcodeDetector;
    Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true });
    vi.useRealTimers();
  });

  it('shows a validation message when ADD / LOOK UP is clicked with an empty field', () => {
    render(<POSTerminal />);
    fireEvent.click(screen.getByText('ADD / LOOK UP'));
    expect(screen.getByText('Enter a barcode or use the camera scanner.')).toBeInTheDocument();
  });

  it('a valid product barcode adds the product to Sale Items', () => {
    render(<POSTerminal />);
    scan(screen.getByPlaceholderText('Barcode or item number'), MOTOR_BARCODE);
    expect(screen.getByText('Hyper-Dash 3 Motor')).toBeInTheDocument();
  });

  it('refuses to add an out-of-stock product', () => {
    render(<POSTerminal />);
    scan(screen.getByPlaceholderText('Barcode or item number'), OUT_OF_STOCK_BARCODE);
    expect(screen.getByText(/out of stock/i)).toBeInTheDocument();
    expect(screen.queryByText('Low Friction Plastic Roller 13mm')).not.toBeInTheDocument();
  });

  it('debounces an immediate duplicate scan of the same barcode (no quantity increase)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    render(<POSTerminal />);
    const input = screen.getByPlaceholderText('Barcode or item number');
    scan(input, MOTOR_BARCODE);
    vi.setSystemTime(200);
    scan(input, MOTOR_BARCODE);
    // Only one line item, quantity still 1 — visible as a single "1" quantity control.
    expect(screen.getAllByText('1')).toHaveLength(1);
  });

  it('accepts an intentional re-scan of the same barcode after the debounce window and increases quantity', () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    render(<POSTerminal />);
    const input = screen.getByPlaceholderText('Barcode or item number');
    scan(input, MOTOR_BARCODE);
    vi.setSystemTime(2000);
    scan(input, MOTOR_BARCODE);
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('an unknown barcode opens the "not linked" flow with Search/Scan Again/Cancel actions', () => {
    render(<POSTerminal />);
    scan(screen.getByPlaceholderText('Barcode or item number'), '0000000000000');
    expect(screen.getByText('Barcode not linked to a product.')).toBeInTheDocument();
    expect(screen.getByText('SEARCH PRODUCT')).toBeInTheDocument();
    expect(screen.getByText('SCAN AGAIN')).toBeInTheDocument();
    expect(screen.getByText('CANCEL')).toBeInTheDocument();
  });

  it('selecting a product from search after an unknown barcode offers to link it, and adds the product', () => {
    render(<POSTerminal />);
    scan(screen.getByPlaceholderText('Barcode or item number'), '0000000000000');
    fireEvent.click(screen.getByText('SEARCH PRODUCT'));
    fireEvent.change(screen.getByPlaceholderText(/Search by name/), { target: { value: 'Hyper-Dash' } });
    fireEvent.click(screen.getByText('Hyper-Dash 3 Motor'));
    expect(screen.getByText('Link this barcode to this product.')).toBeInTheDocument();
    expect(screen.getAllByText('Hyper-Dash 3 Motor').length).toBeGreaterThan(0);
  });

  it('selecting a product from the standalone Search Products button adds it', () => {
    render(<POSTerminal />);
    fireEvent.click(screen.getByText('SEARCH PRODUCTS'));
    fireEvent.change(screen.getByPlaceholderText(/Search by name/), { target: { value: 'Super-X' } });
    fireEvent.click(screen.getByText('Super-X Chassis Kit'));
    expect(screen.getAllByText('Super-X Chassis Kit').length).toBeGreaterThan(0);
    expect(screen.queryByText('Link this barcode to this product.')).not.toBeInTheDocument();
  });

  it('scanning alone does not mutate stock/points — no confirmation appears', () => {
    render(<POSTerminal />);
    scan(screen.getByPlaceholderText('Barcode or item number'), MOTOR_BARCODE);
    expect(screen.queryByText(/PAYMENT CONFIRMED/)).not.toBeInTheDocument();
    expect(screen.getAllByText(/No Racer Profile attached/).length).toBeGreaterThan(0);
  });

  it('OPEN CAMERA opens the scanner interface', async () => {
    mockCameraSupport();
    render(<POSTerminal />);
    fireEvent.click(screen.getByText('📷 OPEN CAMERA'));
    expect(screen.getByText('Scan Product Barcode')).toBeInTheDocument();
  });

  it('Cancel in the camera modal closes and stops the scanner', async () => {
    const { stop } = mockCameraSupport();
    render(<POSTerminal />);
    fireEvent.click(screen.getByText('📷 OPEN CAMERA'));
    await waitFor(() => expect(screen.getByTestId('scanner-video')).toBeInTheDocument());
    fireEvent.click(screen.getByText('CANCEL'));
    expect(screen.queryByText('Scan Product Barcode')).not.toBeInTheDocument();
    expect(stop).toHaveBeenCalled();
  });

  it('a camera-detected barcode adds the product and closes the modal', async () => {
    mockCameraSupport([MOTOR_BARCODE]);
    render(<POSTerminal />);
    fireEvent.click(screen.getByText('📷 OPEN CAMERA'));
    await waitFor(() => expect(screen.getByText('Hyper-Dash 3 Motor')).toBeInTheDocument());
    expect(screen.queryByText('Scan Product Barcode')).not.toBeInTheDocument();
  });
});

describe('POSTerminal — racer scan/search', () => {
  afterEach(() => {
    // @ts-expect-error test cleanup
    delete window.BarcodeDetector;
    Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true });
  });

  it('shows a validation message when LOOK UP is clicked with an empty racer field', () => {
    render(<POSTerminal />);
    fireEvent.click(screen.getByText('LOOK UP'));
    expect(screen.getByText('Enter a Racer ID, scan a QR code, or search by name.')).toBeInTheDocument();
  });

  it('a valid Racer ID attaches the profile with Loyalty Points and Shop Credit', () => {
    render(<POSTerminal />);
    scan(screen.getByPlaceholderText('Racer ID or QR token'), RACER_ID);
    expect(screen.getByText('J. Racer')).toBeInTheDocument();
    expect(screen.getByText(RACER_ID)).toBeInTheDocument();
    expect(screen.getByText('100 DKK')).toBeInTheDocument();
  });

  it('an unknown/invalid racer scan shows a not-found message', () => {
    render(<POSTerminal />);
    scan(screen.getByPlaceholderText('Racer ID or QR token'), 'G4W-R-9999');
    expect(screen.getByText(/No Racer Profile found/)).toBeInTheDocument();
  });

  it('a revoked-card scan shows the exact required message', () => {
    render(<POSTerminal />);
    scan(screen.getByPlaceholderText('Racer ID or QR token'), 'REVOKED-CARD-DEMO');
    expect(screen.getByText('This physical card is no longer active. Use the racer’s digital QR code or replacement card.')).toBeInTheDocument();
  });

  it('a Pending Review racer is attached but flagged, with rewards disabled', () => {
    render(<POSTerminal />);
    scan(screen.getByPlaceholderText('Racer ID or QR token'), 'G4W-R-0099');
    expect(screen.getAllByText(/Pending Review/).length).toBeGreaterThan(0);
    expect(screen.getByText('REWARDS UNAVAILABLE')).toBeDisabled();
  });

  it('a Suspended racer is attached but flagged, with rewards disabled', () => {
    render(<POSTerminal />);
    scan(screen.getByPlaceholderText('Racer ID or QR token'), 'G4W-R-0031');
    expect(screen.getAllByText(/Suspended/).length).toBeGreaterThan(0);
    expect(screen.getByText('REWARDS UNAVAILABLE')).toBeDisabled();
  });

  it('an Archived racer is attached but flagged, with rewards disabled', () => {
    render(<POSTerminal />);
    scan(screen.getByPlaceholderText('Racer ID or QR token'), 'G4W-R-0004');
    expect(screen.getAllByText(/Archived/).length).toBeGreaterThan(0);
    expect(screen.getByText('REWARDS UNAVAILABLE')).toBeDisabled();
  });

  it('selecting a racer from search attaches the profile', () => {
    render(<POSTerminal />);
    fireEvent.click(screen.getByText('SEARCH RACERS'));
    fireEvent.change(screen.getByPlaceholderText(/Search by Racer ID/), { target: { value: 'nielsen' } });
    fireEvent.click(screen.getByText('A. Nielsen'));
    expect(screen.getByText('A. Nielsen')).toBeInTheDocument();
    expect(screen.getByText('REMOVE / CHANGE RACER')).toBeInTheDocument();
  });

  it('removing a racer returns the points preview to zero', () => {
    render(<POSTerminal />);
    fireEvent.click(screen.getByText('Weekly Entry — 150 DKK'));
    scan(screen.getByPlaceholderText('Racer ID or QR token'), RACER_ID);
    expect(screen.getByText(/Racer will earn 1.50 Loyalty Points/)).toBeInTheDocument();
    fireEvent.click(screen.getByText('REMOVE / CHANGE RACER'));
    expect(screen.getAllByText(/No Racer Profile attached/).length).toBeGreaterThan(0);
  });

  it('OPEN QR CAMERA opens the scanner interface for racers', () => {
    mockCameraSupport();
    render(<POSTerminal />);
    fireEvent.click(screen.getByText('📷 OPEN QR CAMERA'));
    expect(screen.getByText('Scan Racer QR Code')).toBeInTheDocument();
  });
});

describe('POSTerminal — race service validation and payment', () => {
  it('adding a race service preset without a racer shows the required warning', () => {
    render(<POSTerminal />);
    fireEvent.click(screen.getByText('Weekly Entry — 150 DKK'));
    expect(screen.getByText('Attach a Racer Profile before confirming a race-related payment.')).toBeInTheDocument();
  });

  it('the "+" quantity stepper is disabled for a race-service line item', () => {
    render(<POSTerminal />);
    fireEvent.click(screen.getByText('Weekly Entry — 150 DKK'));
    expect(screen.getByLabelText('Increase quantity for Weekly Entry')).toBeDisabled();
  });

  it('confirming payment shows a receipt, points awarded, and an audit-log entry', () => {
    render(<POSTerminal />);
    fireEvent.click(screen.getByText('Weekly Entry — 150 DKK'));
    scan(screen.getByPlaceholderText('Racer ID or QR token'), RACER_ID);
    fireEvent.click(screen.getByText('CONFIRM PAYMENT →'));
    expect(screen.getByText(/PAYMENT CONFIRMED/)).toBeInTheDocument();
    expect(screen.getByText(/Points awarded: 1.50/)).toBeInTheDocument();
  });

  it('disables Confirm Payment for an empty sale', () => {
    render(<POSTerminal />);
    expect(screen.getByText('CONFIRM PAYMENT →')).toBeDisabled();
  });

  it('shows a sticky compact cart summary once items are added', () => {
    render(<POSTerminal />);
    fireEvent.click(screen.getByText('Weekly Entry — 150 DKK'));
    expect(screen.getByText('1 item')).toBeInTheDocument();
  });

  it('Sale Items can be collapsed and expanded', () => {
    render(<POSTerminal />);
    fireEvent.click(screen.getByText('Weekly Entry — 150 DKK'));
    expect(screen.getByText('Weekly Entry')).toBeInTheDocument();
    fireEvent.click(screen.getByText(/SALE ITEMS/));
    expect(screen.queryByText('Weekly Entry')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText(/SALE ITEMS/));
    expect(screen.getByText('Weekly Entry')).toBeInTheDocument();
  });
});

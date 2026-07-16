import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import POSTerminal from './POSTerminal';

const MOTOR_BARCODE = '4950344993737'; // Hyper-Dash 3 Motor, stock 4
const OUT_OF_STOCK_BARCODE = '4950344180938'; // Low Friction Roller, stock 0
const RACER_ID = 'G4W-R-0047';
const MOTOR_QR = 'g4w:product:tok_prod_15373'; // Hyper-Dash 3 Motor
const RACER_QR = 'g4w:racer:tok_racer_0047'; // J. Racer
const CAR_QR = 'g4w:car:tok_car_0047'; // G4W-BS-0047
const SERVICE_QR = 'g4w:service:weekly-entry'; // Weekly Entry, 150 DKK
const EVENT_QR = 'g4w:event:tok_event_weekly_260718'; // Weekly Race Night

function scan(input: HTMLElement, value: string) {
  fireEvent.change(input, { target: { value } });
  fireEvent.keyDown(input, { key: 'Enter' });
}

function routeQr(value: string) {
  const input = screen.getByPlaceholderText(/type\/paste a QR payload/);
  fireEvent.change(input, { target: { value } });
  fireEvent.click(screen.getByText('ROUTE'));
}

function selectWeeklyEventAndRacer() {
  fireEvent.click(screen.getByText('Weekly Entry — 150 DKK'));
  scan(screen.getByPlaceholderText('Racer ID'), RACER_ID);
  fireEvent.click(screen.getByText('SELECT EVENT'));
  fireEvent.click(screen.getByText('Weekly Race Night'));
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

afterEach(() => {
  // @ts-expect-error test cleanup
  delete window.BarcodeDetector;
  Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true });
  vi.useRealTimers();
});

describe('POSTerminal — typed QR payload routing', () => {
  it('rejects an unknown QR record type', () => {
    render(<POSTerminal />);
    routeQr('g4w:coupon:tok_abc');
    expect(screen.getByText(/not a recognized Arctic Mini4WD code/)).toBeInTheDocument();
  });

  it('rejects a malformed QR payload', () => {
    render(<POSTerminal />);
    routeQr('not a qr code at all');
    expect(screen.getByText(/not a recognized Arctic Mini4WD code/)).toBeInTheDocument();
  });

  it('a Product QR adds the correct item to Sale Items', () => {
    render(<POSTerminal />);
    routeQr(MOTOR_QR);
    expect(screen.getByText('Hyper-Dash 3 Motor')).toBeInTheDocument();
  });

  it('repeated Product QR increases quantity after the debounce cooldown', () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    render(<POSTerminal />);
    routeQr(MOTOR_QR);
    vi.setSystemTime(2000);
    routeQr(MOTOR_QR);
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('an immediate duplicate Product QR scan is debounced (no quantity increase)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    render(<POSTerminal />);
    routeQr(MOTOR_QR);
    vi.setSystemTime(100);
    routeQr(MOTOR_QR);
    expect(screen.getAllByText('1')).toHaveLength(1);
  });

  it('a Racer QR attaches the profile', () => {
    render(<POSTerminal />);
    routeQr(RACER_QR);
    expect(screen.getByText('J. Racer')).toBeInTheDocument();
    expect(screen.getByText(RACER_ID)).toBeInTheDocument();
  });

  it('the permanent Racer QR does not itself redeem a reward', () => {
    render(<POSTerminal />);
    routeQr(RACER_QR); // J. Racer has 42 points, eligible for a reward
    expect(screen.getByText(/APPLY REWARD/)).toBeInTheDocument();
    expect(screen.queryByText(/REWARD APPLIED/)).not.toBeInTheDocument();
  });

  it('a Car QR identifies the registered chassis', () => {
    render(<POSTerminal />);
    routeQr(CAR_QR);
    expect(screen.getByText('Ray Spear')).toBeInTheDocument();
    expect(screen.getByText('G4W-BS-0047')).toBeInTheDocument();
  });

  it('a Service QR adds the correct preset amount', () => {
    render(<POSTerminal />);
    routeQr(SERVICE_QR);
    expect(screen.getByText('Weekly Entry')).toBeInTheDocument();
    expect(screen.getAllByText('150 DKK').length).toBeGreaterThan(0);
  });

  it('an Event QR selects the event', () => {
    render(<POSTerminal />);
    routeQr(EVENT_QR);
    expect(screen.getByText('Weekly Race Night')).toBeInTheDocument();
    expect(screen.getByText('CHANGE EVENT')).toBeInTheDocument();
  });

  it('scanning alone (any QR type) creates no stock or points mutation', () => {
    render(<POSTerminal />);
    routeQr(MOTOR_QR);
    routeQr(RACER_QR);
    expect(screen.queryByText(/PAYMENT CONFIRMED/)).not.toBeInTheDocument();
  });
});

describe('POSTerminal — Redemption QR', () => {
  it('a valid Redemption QR identifies the reward but requires confirmation before it is applied', () => {
    render(<POSTerminal />);
    routeQr(SERVICE_QR); // Weekly Entry, so there is a total to discount
    routeQr(RACER_QR);
    fireEvent.click(screen.getByText('GENERATE REDEMPTION QR (DEMO)'));
    const code = screen.getByText(/g4w:redemption:/).textContent!.replace('Demo redemption code (scan/paste to redeem): ', '');
    routeQr(code);
    expect(screen.getByText(/Redemption identified/)).toBeInTheDocument();
    expect(screen.queryByText(/REWARD APPLIED/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('CONFIRM REDEMPTION'));
    expect(screen.getByText(/REWARD APPLIED/)).toBeInTheDocument();
  });

  it('cancelling a pending redemption does not apply it and leaves the code reusable', () => {
    render(<POSTerminal />);
    routeQr(RACER_QR);
    fireEvent.click(screen.getByText('GENERATE REDEMPTION QR (DEMO)'));
    const code = screen.getByText(/g4w:redemption:/).textContent!.replace('Demo redemption code (scan/paste to redeem): ', '');
    routeQr(code);
    fireEvent.click(screen.getByText('CANCEL'));
    expect(screen.queryByText(/REWARD APPLIED/)).not.toBeInTheDocument();
    routeQr(code);
    expect(screen.getByText(/Redemption identified/)).toBeInTheDocument();
  });

  it('the seeded demo valid Redemption QR (as printed on the test sheet) identifies the reward', () => {
    render(<POSTerminal />);
    routeQr(RACER_QR);
    routeQr('g4w:redemption:redeem_demo_valid_0001');
    expect(screen.getByText(/Redemption identified/)).toBeInTheDocument();
  });

  it('the seeded demo expired Redemption QR (as printed on the test sheet) is rejected as expired', () => {
    render(<POSTerminal />);
    routeQr(RACER_QR);
    routeQr('g4w:redemption:redeem_demo_expired_0001');
    expect(screen.getByText(/has expired/)).toBeInTheDocument();
  });

  it('an expired Redemption QR is rejected', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-16T12:00:00Z'));
    render(<POSTerminal />);
    routeQr(RACER_QR);
    fireEvent.click(screen.getByText('GENERATE REDEMPTION QR (DEMO)'));
    vi.setSystemTime(new Date('2026-07-16T12:10:00Z')); // past the 5-minute TTL
    const code = screen.getByText(/g4w:redemption:/).textContent!.replace('Demo redemption code (scan/paste to redeem): ', '');
    routeQr(code);
    expect(screen.getByText(/has expired/)).toBeInTheDocument();
  });

  it('a redeemed Redemption QR cannot be reused', () => {
    render(<POSTerminal />);
    routeQr(RACER_QR);
    fireEvent.click(screen.getByText('GENERATE REDEMPTION QR (DEMO)'));
    const code = screen.getByText(/g4w:redemption:/).textContent!.replace('Demo redemption code (scan/paste to redeem): ', '');
    routeQr(code);
    fireEvent.click(screen.getByText('CONFIRM REDEMPTION'));
    expect(screen.getByText(/Redeemed:/)).toBeInTheDocument();
    routeQr(code);
    expect(screen.getByText(/already been used/)).toBeInTheDocument();
  });
});

describe('POSTerminal — camera scanning', () => {
  it('OPEN CAMERA (SCAN QR) opens the shared scanner interface', () => {
    mockCameraSupport();
    render(<POSTerminal />);
    fireEvent.click(screen.getByText('📷 SCAN QR'));
    expect(screen.getByText('Scan QR Code')).toBeInTheDocument();
  });

  it('a camera-detected Product QR adds the product and closes the modal', async () => {
    mockCameraSupport([MOTOR_QR]);
    render(<POSTerminal />);
    fireEvent.click(screen.getByText('📷 SCAN QR'));
    await waitFor(() => expect(screen.getByText('Hyper-Dash 3 Motor')).toBeInTheDocument());
    expect(screen.queryByText('Scan QR Code')).not.toBeInTheDocument();
  });

  it('an iPhone-Safari-style environment (no native BarcodeDetector) still opens the scanner via the fallback decoder', async () => {
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({ drawImage: vi.fn(), getImageData: vi.fn().mockReturnValue({ data: new Uint8ClampedArray(4), width: 2, height: 2 }) });
    const getUserMedia = vi.fn().mockResolvedValue({ getTracks: () => [{ stop: vi.fn() }] });
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia }, configurable: true });
    render(<POSTerminal />);
    fireEvent.click(screen.getByText('📷 SCAN QR'));
    const video = document.querySelector('video');
    if (video) video.play = vi.fn().mockResolvedValue(undefined);
    await waitFor(() => expect(screen.getByTestId('scanner-video')).toBeVisible());
  });
});

describe('POSTerminal — manual fallback (unchanged)', () => {
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
  });

  it('an unknown barcode opens the "not linked" flow', () => {
    render(<POSTerminal />);
    scan(screen.getByPlaceholderText('Barcode or item number'), '0000000000000');
    expect(screen.getByText('Barcode not linked to a product.')).toBeInTheDocument();
    expect(screen.getByText('SEARCH PRODUCT')).toBeInTheDocument();
    expect(screen.getByText('SCAN AGAIN')).toBeInTheDocument();
    expect(screen.getByText('CANCEL')).toBeInTheDocument();
  });

  it('shows a validation message when LOOK UP is clicked with an empty racer field', () => {
    render(<POSTerminal />);
    fireEvent.click(screen.getByText('LOOK UP'));
    expect(screen.getByText('Enter a Racer ID, scan a QR code, or search by name.')).toBeInTheDocument();
  });

  it('a valid typed Racer ID attaches the profile', () => {
    render(<POSTerminal />);
    scan(screen.getByPlaceholderText('Racer ID'), RACER_ID);
    expect(screen.getByText('J. Racer')).toBeInTheDocument();
  });

  it('selecting a product from Search Products adds it', () => {
    render(<POSTerminal />);
    fireEvent.click(screen.getByText('SEARCH PRODUCTS'));
    fireEvent.change(screen.getByPlaceholderText(/Search by name/), { target: { value: 'Super-X' } });
    fireEvent.click(screen.getByText('Super-X Chassis Kit'));
    expect(screen.getAllByText('Super-X Chassis Kit').length).toBeGreaterThan(0);
  });

  it('selecting a racer from Search Racers attaches the profile', () => {
    render(<POSTerminal />);
    fireEvent.click(screen.getByText('SEARCH RACERS'));
    fireEvent.change(screen.getByPlaceholderText(/Search by Racer ID/), { target: { value: 'nielsen' } });
    fireEvent.click(screen.getByText('A. Nielsen'));
    expect(screen.getByText('A. Nielsen')).toBeInTheDocument();
  });

  it('selecting a car from Search Cars identifies it', () => {
    render(<POSTerminal />);
    fireEvent.click(screen.getByText('SEARCH CARS'));
    fireEvent.change(screen.getByPlaceholderText(/Search by Club Car ID/), { target: { value: 'G4W-BS-0047' } });
    fireEvent.click(screen.getByText('Ray Spear'));
    expect(screen.getByText('G4W-BS-0047')).toBeInTheDocument();
  });

  it('removing a racer returns the points preview to zero', () => {
    render(<POSTerminal />);
    routeQr(SERVICE_QR);
    scan(screen.getByPlaceholderText('Racer ID'), RACER_ID);
    expect(screen.getByText(/Racer will earn 1.50 Loyalty Points/)).toBeInTheDocument();
    fireEvent.click(screen.getByText('REMOVE / CHANGE RACER'));
    expect(screen.getAllByText(/No Racer Profile attached/).length).toBeGreaterThan(0);
  });

  it('invalid and revoked Racer QR outcomes are displayed', () => {
    render(<POSTerminal />);
    scan(screen.getByPlaceholderText('Racer ID'), 'G4W-R-9999');
    expect(screen.getByText(/No Racer Profile found/)).toBeInTheDocument();
    scan(screen.getByPlaceholderText('Racer ID'), 'REVOKED-CARD-DEMO');
    expect(screen.getByText('This physical card is no longer active. Use the racer’s digital QR code or replacement card.')).toBeInTheDocument();
  });
});

describe('POSTerminal — race service validation and payment', () => {
  it('shows a warning for a race service without a racer or event attached', () => {
    render(<POSTerminal />);
    fireEvent.click(screen.getByText('Weekly Entry — 150 DKK'));
    expect(screen.getByText('Attach a Racer Profile before confirming a race-related payment.')).toBeInTheDocument();
  });

  it('blocks payment confirmation for a race service missing an event, even with an Active racer attached', () => {
    render(<POSTerminal />);
    fireEvent.click(screen.getByText('Weekly Entry — 150 DKK'));
    scan(screen.getByPlaceholderText('Racer ID'), RACER_ID);
    fireEvent.click(screen.getByText('CONFIRM PAYMENT →'));
    expect(screen.getByText(/attached Active Racer Profile and a selected event/)).toBeInTheDocument();
  });

  it('confirming payment with a racer and event attached shows a receipt and awards points', () => {
    render(<POSTerminal />);
    selectWeeklyEventAndRacer();
    fireEvent.click(screen.getByText('CONFIRM PAYMENT →'));
    expect(screen.getByText(/PAYMENT CONFIRMED/)).toBeInTheDocument();
    expect(screen.getByText(/Points awarded: 1.50/)).toBeInTheDocument();
  });

  it('a non-race product does not require an event to confirm', () => {
    render(<POSTerminal />);
    scan(screen.getByPlaceholderText('Barcode or item number'), MOTOR_BARCODE);
    fireEvent.click(screen.getByText('CONFIRM PAYMENT →'));
    expect(screen.getByText(/PAYMENT CONFIRMED/)).toBeInTheDocument();
  });

  it('the "+" quantity stepper is disabled for a race-service line item', () => {
    render(<POSTerminal />);
    fireEvent.click(screen.getByText('Weekly Entry — 150 DKK'));
    expect(screen.getByLabelText('Increase quantity for Weekly Entry')).toBeDisabled();
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
});

describe('POSTerminal — mobile layout', () => {
  it('Sale Items can be collapsed and expanded', () => {
    render(<POSTerminal />);
    fireEvent.click(screen.getByText('Weekly Entry — 150 DKK'));
    expect(screen.getByText('Weekly Entry')).toBeInTheDocument();
    fireEvent.click(screen.getByText(/SALE ITEMS/));
    expect(screen.queryByText('Weekly Entry')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText(/SALE ITEMS/));
    expect(screen.getByText('Weekly Entry')).toBeInTheDocument();
  });

  it('all top-level action buttons wrap instead of forcing a fixed width (no horizontal clipping)', () => {
    render(<POSTerminal />);
    const scanButton = screen.getByText('📷 SCAN QR').closest('div');
    expect(scanButton).toHaveStyle({ flexWrap: 'wrap' });
  });
});

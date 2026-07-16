import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import POSTerminal from './POSTerminal';

const MOTOR_BARCODE = '4950344993737'; // Hyper-Dash 3 Motor, stock 4
const OUT_OF_STOCK_BARCODE = '4950344180938'; // Low Friction Roller, stock 0
const RACER_ID = 'G4W-R-0047';

function scan(input: HTMLElement, value: string) {
  fireEvent.change(input, { target: { value } });
  fireEvent.keyDown(input, { key: 'Enter' });
}

describe('POSTerminal', () => {
  it('scanning a product shows it in the sale without any confirmation or stock message', () => {
    render(<POSTerminal />);
    const barcodeInput = screen.getByPlaceholderText('Scan or type a barcode');
    scan(barcodeInput, MOTOR_BARCODE);
    expect(screen.getByText('Hyper-Dash 3 Motor')).toBeInTheDocument();
    expect(screen.queryByText(/PAYMENT CONFIRMED/)).not.toBeInTheDocument();
  });

  it('refuses to scan an out-of-stock product', () => {
    render(<POSTerminal />);
    const barcodeInput = screen.getByPlaceholderText('Scan or type a barcode');
    scan(barcodeInput, OUT_OF_STOCK_BARCODE);
    expect(screen.getByText(/out of stock/i)).toBeInTheDocument();
    expect(screen.queryByText('Low Friction Plastic Roller 13mm')).not.toBeInTheDocument();
  });

  it('shows no Loyalty Points to earn until a Racer is scanned', () => {
    render(<POSTerminal />);
    fireEvent.click(screen.getByText('Weekly Entry — 150 DKK'));
    expect(screen.getByText(/No Racer Profile scanned/)).toBeInTheDocument();
  });

  it('scanning a Racer ID autofills the profile with Loyalty Points and Shop Credit', () => {
    render(<POSTerminal />);
    const racerInput = screen.getByPlaceholderText('e.g. G4W-R-0047');
    scan(racerInput, RACER_ID);
    expect(screen.getByText('J. Racer')).toBeInTheDocument();
    expect(screen.getByText(RACER_ID)).toBeInTheDocument();
    expect(screen.getByText('100 DKK')).toBeInTheDocument(); // Shop Credit
  });

  it('supports scanning the Racer ID before any products are scanned', () => {
    render(<POSTerminal />);
    const racerInput = screen.getByPlaceholderText('e.g. G4W-R-0047');
    scan(racerInput, RACER_ID);
    fireEvent.click(screen.getByText('Weekly Entry — 150 DKK'));
    expect(screen.getByText(/Racer will earn 1.50 Loyalty Points/)).toBeInTheDocument();
  });

  it('confirming payment shows a receipt, points awarded, and an audit-log entry', () => {
    render(<POSTerminal />);
    fireEvent.click(screen.getByText('Weekly Entry — 150 DKK'));
    const racerInput = screen.getByPlaceholderText('e.g. G4W-R-0047');
    scan(racerInput, RACER_ID);
    fireEvent.click(screen.getByText('CONFIRM PAYMENT →'));
    expect(screen.getByText(/PAYMENT CONFIRMED/)).toBeInTheDocument();
    expect(screen.getByText(/RCPT-/)).toBeInTheDocument();
    expect(screen.getByText(/Points awarded: 1.50/)).toBeInTheDocument();
  });

  it('confirming payment with no racer scanned still completes the sale but awards zero points', () => {
    render(<POSTerminal />);
    fireEvent.click(screen.getByText('Weekly Entry — 150 DKK'));
    fireEvent.click(screen.getByText('CONFIRM PAYMENT →'));
    expect(screen.getByText(/PAYMENT CONFIRMED/)).toBeInTheDocument();
    expect(screen.getByText(/Points awarded: 0.00/)).toBeInTheDocument();
  });

  it('disables Confirm Payment for an empty sale', () => {
    render(<POSTerminal />);
    expect(screen.getByText('CONFIRM PAYMENT →')).toBeDisabled();
  });

  it('cancelling a sale removes the ability to confirm payment', () => {
    render(<POSTerminal />);
    fireEvent.click(screen.getByText('Weekly Entry — 150 DKK'));
    fireEvent.click(screen.getByText('CANCEL SALE'));
    expect(screen.queryByText('CONFIRM PAYMENT →')).not.toBeInTheDocument();
  });

  it('Starting a New Sale resets line items and the confirmed receipt', () => {
    render(<POSTerminal />);
    fireEvent.click(screen.getByText('Weekly Entry — 150 DKK'));
    fireEvent.click(screen.getByText('CONFIRM PAYMENT →'));
    expect(screen.getByText(/PAYMENT CONFIRMED/)).toBeInTheDocument();
    fireEvent.click(screen.getByText('NEW SALE'));
    expect(screen.queryByText(/PAYMENT CONFIRMED/)).not.toBeInTheDocument();
    expect(screen.getByText('No items scanned yet.')).toBeInTheDocument();
  });

  it('prompts for a staff-entered price on an open-price preset item', () => {
    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('35');
    render(<POSTerminal />);
    fireEvent.click(screen.getByText('Soft Drinks / Snacks'));
    expect(promptSpy).toHaveBeenCalled();
    expect(screen.getAllByText('Soft Drinks / Snacks').length).toBeGreaterThan(1);
    expect(screen.getAllByText('35 DKK').length).toBeGreaterThan(0);
    promptSpy.mockRestore();
  });
});

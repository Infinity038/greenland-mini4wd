import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import QrTestSheetPage from './page';

describe('QrTestSheetPage', () => {
  it('is clearly labeled as preview test data not valid for live use', () => {
    render(<QrTestSheetPage />);
    expect(screen.getByText(/PREVIEW TEST DATA — NOT VALID FOR LIVE USE/)).toBeInTheDocument();
  });

  it('prints all 8 required sections with their exact mock payloads', async () => {
    render(<QrTestSheetPage />);
    expect(screen.getByText('g4w:product:tok_prod_15373')).toBeInTheDocument();
    expect(screen.getByText('g4w:service:weekly-entry')).toBeInTheDocument();
    expect(screen.getByText('g4w:racer:tok_racer_0047')).toBeInTheDocument();
    expect(screen.getByText('g4w:car:tok_car_0047')).toBeInTheDocument();
    expect(screen.getByText('g4w:event:tok_event_weekly_260718')).toBeInTheDocument();
    expect(screen.getByText('g4w:redemption:redeem_demo_valid_0001')).toBeInTheDocument();
    expect(screen.getByText('g4w:redemption:redeem_demo_expired_0001')).toBeInTheDocument();
    expect(screen.getByText('g4w:coupon:tok_unknown_0001')).toBeInTheDocument();
  });

  it('shows the expected scanner result under each record', () => {
    render(<QrTestSheetPage />);
    expect(screen.getByText(/Adds the matching mock product to the sale/)).toBeInTheDocument();
    expect(screen.getByText(/Adds the configured preset service and price/)).toBeInTheDocument();
    expect(screen.getByText(/Attaches the mock Active Racer Profile/)).toBeInTheDocument();
    expect(screen.getByText(/Identifies the registered chassis and owner/)).toBeInTheDocument();
    expect(screen.getByText(/Selects the mock event and pricing model/)).toBeInTheDocument();
    expect(screen.getByText(/Identifies the selected reward but requires confirmation/)).toBeInTheDocument();
    expect(screen.getByText(/Rejected as expired/)).toBeInTheDocument();
    expect(screen.getByText(/Rejected with a clear error/)).toBeInTheDocument();
  });

  it('renders one QR image per record once generation completes', async () => {
    render(<QrTestSheetPage />);
    await waitFor(() => {
      const images = screen.getAllByRole('img');
      expect(images).toHaveLength(8);
    });
  });

  it('has a Print button that calls window.print()', () => {
    const printSpy = vi.fn();
    window.print = printSpy;
    render(<QrTestSheetPage />);
    screen.getByText('PRINT').click();
    expect(printSpy).toHaveBeenCalledTimes(1);
  });
});

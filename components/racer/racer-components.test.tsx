import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import BalanceCards from './BalanceCards';
import LoyaltyRoadmap from './LoyaltyRoadmap';
import PointsActivityList from './PointsActivityList';
import { RacerCardFront, RacerCardBack } from './RacerCardPreview';

describe('BalanceCards', () => {
  it('shows Loyalty Points, Shop Credit and Championship Points as three separate figures', () => {
    render(
      <BalanceCards
        balances={{
          loyaltyPoints: 42.5,
          shopCreditDkk: 125,
          championshipPoints: { boxStock: 12, bmax: 37, currentRank: 3 },
        }}
      />
    );
    expect(screen.getByText('42.50')).toBeInTheDocument();
    expect(screen.getByText('125.00')).toBeInTheDocument();
    expect(screen.getByText(/37 points/)).toBeInTheDocument();
    expect(screen.getByText('Current rank: #3')).toBeInTheDocument();
  });
});

describe('LoyaltyRoadmap', () => {
  it('matches the worked example: 42.00 balance shows 8.00 points remaining to the next reward', () => {
    render(<LoyaltyRoadmap balance={42} />);
    expect(screen.getByText('42.00')).toBeInTheDocument();
    expect(screen.getByText('50 DKK reward available')).toBeInTheDocument();
    expect(screen.getByText('8.00 points until the next reward')).toBeInTheDocument();
  });

  it('disables Redeem when no reward is available yet, enables it once one is', () => {
    const { rerender } = render(<LoyaltyRoadmap balance={5} />);
    expect(screen.getByText('REDEEM REWARD')).toBeDisabled();
    rerender(<LoyaltyRoadmap balance={30} />);
    expect(screen.getByText('REDEEM REWARD')).not.toBeDisabled();
  });

  it('calls onRedeem / onViewActivity when clicked', () => {
    const onRedeem = vi.fn();
    const onViewActivity = vi.fn();
    render(<LoyaltyRoadmap balance={30} onRedeem={onRedeem} onViewActivity={onViewActivity} />);
    fireEvent.click(screen.getByText('REDEEM REWARD'));
    fireEvent.click(screen.getByText('VIEW POINTS ACTIVITY'));
    expect(onRedeem).toHaveBeenCalledTimes(1);
    expect(onViewActivity).toHaveBeenCalledTimes(1);
  });
});

describe('PointsActivityList', () => {
  it('shows a genuine empty state with no fixture data', () => {
    render(<PointsActivityList entries={[]} />);
    expect(screen.getByText('No points activity yet.')).toBeInTheDocument();
  });

  it('renders each entry with description, points delta and status', () => {
    render(
      <PointsActivityList
        entries={[
          { id: '1', date: '25 Jul 2026', description: 'B-MAX Race Entry', channel: 'In person', amountDkk: 150, pointsDelta: 1.5, status: 'Confirmed' },
          { id: '2', date: '27 Jul 2026', description: '50 DKK Loyalty Reward', channel: 'In person', amountDkk: null, pointsDelta: -25, status: 'Redeemed' },
        ]}
      />
    );
    expect(screen.getByText('B-MAX Race Entry')).toBeInTheDocument();
    expect(screen.getByText('+1.50 points')).toBeInTheDocument();
    expect(screen.getByText('-25.00 points')).toBeInTheDocument();
    expect(screen.getByText('Redeemed')).toBeInTheDocument();
  });
});

describe('RacerCardPreview', () => {
  it('front shows display name, Racer ID, and a QR placeholder (not a real token)', () => {
    render(<RacerCardFront card={{ displayName: 'J. Racer', racerId: 'AM4WD-0042' }} />);
    expect(screen.getByText('J. Racer')).toBeInTheDocument();
    expect(screen.getByText('Racer ID: AM4WD-0042')).toBeInTheDocument();
    expect(screen.getByText(/QR/)).toBeInTheDocument();
  });

  it('back shows a genuine empty state when there are no stamps yet', () => {
    render(<RacerCardBack stamps={[]} />);
    expect(screen.getByText('No events stamped yet.')).toBeInTheDocument();
  });

  it('back renders a stamp row with event/category/car', () => {
    render(<RacerCardBack stamps={[{ eventDate: '25 Jul 2026', eventCode: 'AM4WD-260725', category: 'B-MAX', car: 'Ray Spear', life1Stamped: true, life2Stamped: false, staffInitials: 'JC' }]} />);
    expect(screen.getByText(/AM4WD-260725/)).toBeInTheDocument();
    expect(screen.getByText(/Ray Spear/)).toBeInTheDocument();
  });
});

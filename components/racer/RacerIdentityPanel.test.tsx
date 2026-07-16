import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import RacerIdentityPanel from './RacerIdentityPanel';

const RACER = { displayName: 'J. Racer', racerId: 'G4W-R-0047', accountStatus: 'Active' as const, photoUrl: null };

describe('RacerIdentityPanel', () => {
  it('identifies a racer by name, Racer ID and status with no physical card requested yet', () => {
    render(<RacerIdentityPanel racer={RACER} />);
    expect(screen.getByText('J. Racer')).toBeInTheDocument();
    expect(screen.getByText('G4W-R-0047')).toBeInTheDocument();
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
    expect(screen.getByText('REQUEST PHYSICAL RACER CARD')).toBeInTheDocument();
  });

  it('falls back to initials when no photo is set', () => {
    render(<RacerIdentityPanel racer={RACER} />);
    expect(screen.getByText('JR')).toBeInTheDocument();
  });

  it('QR identity token contains no email address', () => {
    render(<RacerIdentityPanel racer={{ ...RACER, displayName: 'jane@example.com' }} />);
    const tokenText = screen.getByText(/token:/).textContent || '';
    expect(tokenText).not.toMatch(/@/);
  });

  it('requesting the first physical card shows it as free and version 1', () => {
    render(<RacerIdentityPanel racer={RACER} />);
    fireEvent.click(screen.getByText('REQUEST PHYSICAL RACER CARD'));
    expect(screen.getByText('CARD-0082-V1')).toBeInTheDocument();
    expect(screen.getByText('REQUESTED')).toBeInTheDocument();
  });

  it('replacement flow shows the mandatory confirmation notice before charging the fee', () => {
    render(<RacerIdentityPanel racer={RACER} />);
    fireEvent.click(screen.getByText('REQUEST PHYSICAL RACER CARD'));
    fireEvent.click(screen.getByText('REQUEST REPLACEMENT CARD'));
    expect(screen.getByText(/Replacement cards cost 25 DKK/)).toBeInTheDocument();
    expect(screen.getByText('CONFIRM — PAY 25 DKK')).toBeInTheDocument();
  });

  it('replacement does not change the Racer ID shown on the profile', () => {
    render(<RacerIdentityPanel racer={RACER} />);
    fireEvent.click(screen.getByText('REQUEST PHYSICAL RACER CARD'));
    fireEvent.click(screen.getByText('REQUEST REPLACEMENT CARD'));
    fireEvent.click(screen.getByText('CONFIRM — PAY 25 DKK'));
    expect(screen.getByText('CARD-0082-V2')).toBeInTheDocument();
    expect(screen.getByText('G4W-R-0047')).toBeInTheDocument();
  });
});

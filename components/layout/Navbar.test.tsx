import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import Navbar from './Navbar';

describe('Navbar', () => {
  it('shows public navigation as Race Check-In, linking to /race-check-in', () => {
    render(<Navbar />);
    const link = screen.getByText('🏁 Race Check-In').closest('a');
    expect(link).toHaveAttribute('href', '/race-check-in');
  });

  it('does not show a "Tickets" navigation label anywhere', () => {
    render(<Navbar />);
    expect(screen.queryByText(/^Tickets$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/🎟️/)).not.toBeInTheDocument();
  });
});

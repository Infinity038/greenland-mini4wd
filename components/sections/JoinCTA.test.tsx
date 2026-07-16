import { describe, expect, it, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import JoinCTA from './JoinCTA';

describe('JoinCTA', () => {
  afterEach(() => {
    document.cookie = 'gm4wd_registered=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    localStorage.clear();
  });

  it('shows no online race-ticket purchase CTA for a registered racer', async () => {
    document.cookie = 'gm4wd_registered=1';
    render(<JoinCTA />);
    await waitFor(() => expect(screen.getByText(/RACE DAY/)).toBeInTheDocument());
    expect(screen.queryByText(/BUY TICKETS/)).not.toBeInTheDocument();
    const raceLink = screen.getByText(/RACE DAY/).closest('a');
    expect(raceLink).toHaveAttribute('href', '/race-check-in');
  });
});

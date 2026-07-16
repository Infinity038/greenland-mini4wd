import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import RacerSearchCombobox from './RacerSearchCombobox';

describe('RacerSearchCombobox', () => {
  it('is a searchable listbox, not a plain HTML select', () => {
    render(<RacerSearchCombobox onSelect={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(document.querySelector('select')).toBeNull();
  });

  it('finds a racer by Racer ID', () => {
    render(<RacerSearchCombobox onSelect={vi.fn()} onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/Search by Racer ID/), { target: { value: 'G4W-R-0047' } });
    expect(screen.getByText('J. Racer')).toBeInTheDocument();
  });

  it('finds a racer by display name', () => {
    render(<RacerSearchCombobox onSelect={vi.fn()} onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/Search by Racer ID/), { target: { value: 'nielsen' } });
    expect(screen.getByText('A. Nielsen')).toBeInTheDocument();
  });

  it('shows a profile picture/initials and account status on each result, but never a phone number', () => {
    render(<RacerSearchCombobox onSelect={vi.fn()} onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/Search by Racer ID/), { target: { value: 'G4W-R-0047' } });
    expect(screen.getByText('JR')).toBeInTheDocument(); // initials fallback
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.queryByText(/\+299/)).not.toBeInTheDocument();
  });

  it('selecting a result calls onSelect with the racer record', () => {
    const onSelect = vi.fn();
    render(<RacerSearchCombobox onSelect={onSelect} onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/Search by Racer ID/), { target: { value: 'G4W-R-0047' } });
    fireEvent.click(screen.getByText('J. Racer'));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ racerId: 'G4W-R-0047' }));
  });

  it('shows no results until the staff member types something', () => {
    render(<RacerSearchCombobox onSelect={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText('Start typing to search.')).toBeInTheDocument();
  });
});

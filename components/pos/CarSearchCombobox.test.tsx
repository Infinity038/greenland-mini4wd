import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import CarSearchCombobox from './CarSearchCombobox';

describe('CarSearchCombobox', () => {
  it('is a searchable listbox, not a plain HTML select', () => {
    render(<CarSearchCombobox onSelect={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(document.querySelector('select')).toBeNull();
  });

  it('finds a car by Club Car ID', () => {
    render(<CarSearchCombobox onSelect={vi.fn()} onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/Search by Club Car ID/), { target: { value: 'G4W-BS-0047' } });
    expect(screen.getByText('Ray Spear')).toBeInTheDocument();
  });

  it('finds a car by owner/racer name', () => {
    render(<CarSearchCombobox onSelect={vi.fn()} onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/Search by Club Car ID/), { target: { value: 'nielsen' } });
    expect(screen.getByText('Astral Star')).toBeInTheDocument();
  });

  it('finds a car by model', () => {
    render(<CarSearchCombobox onSelect={vi.fn()} onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/Search by Club Car ID/), { target: { value: 'Dragon Slash' } });
    expect(screen.getByText('G4W-OBS-0099')).toBeInTheDocument();
  });

  it('selecting a result calls onSelect with the car record', () => {
    const onSelect = vi.fn();
    render(<CarSearchCombobox onSelect={onSelect} onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/Search by Club Car ID/), { target: { value: 'G4W-BS-0047' } });
    fireEvent.click(screen.getByText('Ray Spear'));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ clubCarId: 'G4W-BS-0047' }));
  });
});

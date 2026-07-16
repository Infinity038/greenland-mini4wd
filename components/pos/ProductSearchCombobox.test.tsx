import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import ProductSearchCombobox from './ProductSearchCombobox';

describe('ProductSearchCombobox', () => {
  it('is a searchable listbox, not a plain HTML select', () => {
    render(<ProductSearchCombobox onSelect={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(document.querySelector('select')).toBeNull();
  });

  it('finds a product by name as the staff member types', () => {
    render(<ProductSearchCombobox onSelect={vi.fn()} onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/Search by name/), { target: { value: 'Hyper-Dash' } });
    expect(screen.getByText('Hyper-Dash 3 Motor')).toBeInTheDocument();
  });

  it('finds a product by Tamiya item number', () => {
    render(<ProductSearchCombobox onSelect={vi.fn()} onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/Search by name/), { target: { value: '95892' } });
    expect(screen.getByText('Mini 4WD Fully Cowled Chassis Kit')).toBeInTheDocument();
  });

  it('finds a product by barcode', () => {
    render(<ProductSearchCombobox onSelect={vi.fn()} onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/Search by name/), { target: { value: '4950344180938' } });
    expect(screen.getByText('Low Friction Plastic Roller 13mm')).toBeInTheDocument();
  });

  it('selecting a result calls onSelect with the product', () => {
    const onSelect = vi.fn();
    render(<ProductSearchCombobox onSelect={onSelect} onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/Search by name/), { target: { value: 'Hyper-Dash' } });
    fireEvent.click(screen.getByText('Hyper-Dash 3 Motor'));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ name: 'Hyper-Dash 3 Motor' }));
  });

  it('shows stock/preorder status and category on each result', () => {
    render(<ProductSearchCombobox onSelect={vi.fn()} onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/Search by name/), { target: { value: 'Aluminum Roller' } });
    expect(screen.getByText(/Preorder/)).toBeInTheDocument();
  });
});

import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { ProductImage, ProductImageFallback } from './ProductImage';

describe('ProductImageFallback', () => {
  it('shows the durable "Image being prepared" fallback with chassis and item number', () => {
    render(<ProductImageFallback category="cars" itemNo="18099" chassis="VZ" />);
    expect(screen.getByText('Image being prepared')).toBeInTheDocument();
    expect(screen.getByText('VZ · #18099')).toBeInTheDocument();
  });

  it('still renders without chassis/item number metadata', () => {
    render(<ProductImageFallback category="parts" />);
    expect(screen.getByText('Image being prepared')).toBeInTheDocument();
  });
});

describe('ProductImage', () => {
  it('renders the fallback (never a blank card) when there is no image URL', () => {
    render(<ProductImage imageUrl="" name="Ray Spear" category="cars" itemNo="18099" chassis="VZ" />);
    expect(screen.getByText('Image being prepared')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('renders an <img> when a valid image URL is provided', () => {
    render(<ProductImage imageUrl="https://example.com/car.png" name="Ray Spear" category="cars" />);
    const img = screen.getByRole('img', { name: 'Ray Spear' });
    expect(img).toHaveAttribute('src', 'https://example.com/car.png');
  });

  it('swaps to the durable fallback instead of a broken image when the <img> fails to load', () => {
    render(<ProductImage imageUrl="https://example.com/broken.png" name="Ray Spear" category="cars" itemNo="18099" chassis="VZ" />);
    const img = screen.getByRole('img', { name: 'Ray Spear' });
    fireEvent.error(img);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('Image being prepared')).toBeInTheDocument();
    expect(screen.getByText('VZ · #18099')).toBeInTheDocument();
  });
});

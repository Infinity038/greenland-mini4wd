import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ResponsiveDataTable from './ResponsiveDataTable';

describe('ResponsiveDataTable', () => {
  const headers = ['Configuration', 'Box Stock', 'B-Max'];
  const rows = [
    ['Chassis cutting', 'No', 'No'],
    ['Wheel piercing', 'No', 'Yes'],
  ];

  it('keeps a semantic desktop table', () => {
    const { container } = render(
      <ResponsiveDataTable headers={headers} rows={rows} ariaLabel="Class comparison" />,
    );

    const table = container.querySelector('table');
    expect(table).toHaveAttribute('aria-label', 'Class comparison');
    expect(container.querySelectorAll('thead th')).toHaveLength(3);
    expect(container.querySelectorAll('tbody tr')).toHaveLength(2);
  });

  it('renders a labeled mobile card for every row', () => {
    const { container } = render(
      <ResponsiveDataTable headers={headers} rows={rows} ariaLabel="Class comparison" />,
    );

    const cards = container.querySelectorAll('article');
    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveTextContent('Configuration');
    expect(cards[0]).toHaveTextContent('Chassis cutting');
    expect(cards[0]).toHaveTextContent('Box Stock');
    expect(cards[0]).toHaveTextContent('B-Max');
  });

  it('uses a durable dash for missing values', () => {
    const { container } = render(
      <ResponsiveDataTable
        headers={['Item', 'Requirement']}
        rows={[['Maximum length']]}
        ariaLabel="Machine limits"
      />,
    );

    expect(container.textContent).toContain('—');
  });
});

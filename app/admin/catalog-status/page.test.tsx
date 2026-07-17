import { describe, it, expect, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import '@testing-library/jest-dom/vitest';
import CatalogStatusPage from './page';

const DIR = join(process.cwd(), 'app/admin/catalog-status');
const ORIGINAL_VERCEL_ENV = process.env.VERCEL_ENV;

describe('CatalogStatusPage — Preview-only gating', () => {
  afterEach(() => {
    if (ORIGINAL_VERCEL_ENV === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = ORIGINAL_VERCEL_ENV;
  });

  it('renders the catalog-status admin UI when VERCEL_ENV is "preview"', () => {
    process.env.VERCEL_ENV = 'preview';
    render(<CatalogStatusPage />);
    expect(screen.getByText(/PREVIEW — CATALOG STATUS & RESTOCK ADMIN/)).toBeInTheDocument();
  });

  it('is unavailable (404 via notFound()) when VERCEL_ENV is "production"', () => {
    process.env.VERCEL_ENV = 'production';
    expect(() => render(<CatalogStatusPage />)).toThrow(/NEXT_HTTP_ERROR_FALLBACK;404/);
  });

  it('is unavailable (404 via notFound()) when VERCEL_ENV is unset', () => {
    delete process.env.VERCEL_ENV;
    expect(() => render(<CatalogStatusPage />)).toThrow(/NEXT_HTTP_ERROR_FALLBACK;404/);
  });

  it('is unavailable for any other VERCEL_ENV value', () => {
    process.env.VERCEL_ENV = 'development';
    expect(() => render(<CatalogStatusPage />)).toThrow(/NEXT_HTTP_ERROR_FALLBACK;404/);
  });
});

describe('CatalogStatusPage — no Supabase dependency (static source check)', () => {
  it('page.tsx has no Supabase import or client usage', () => {
    const src = readFileSync(join(DIR, 'page.tsx'), 'utf-8');
    expect(src).not.toMatch(/from\s+['"].*supabase.*['"]/i);
    expect(src).not.toMatch(/createClient\s*\(/);
  });

  it('CatalogStatusClient.tsx has no Supabase import or client usage', () => {
    const src = readFileSync(join(DIR, 'CatalogStatusClient.tsx'), 'utf-8');
    expect(src).not.toMatch(/from\s+['"].*supabase.*['"]/i);
    expect(src).not.toMatch(/createClient\s*\(/);
  });

  it('CatalogStatusClient.tsx has no hardcoded admin password', () => {
    const src = readFileSync(join(DIR, 'CatalogStatusClient.tsx'), 'utf-8');
    expect(src).not.toMatch(/mini4wd2026/);
    expect(src).not.toMatch(/ADMIN_PASSWORD/);
  });

  it('CatalogStatusClient.tsx never places a supplier order automatically (no order/purchase-order API call)', () => {
    const src = readFileSync(join(DIR, 'CatalogStatusClient.tsx'), 'utf-8');
    expect(src).not.toMatch(/placeOrder|createPurchaseOrder|supplier.*order.*submit/i);
  });
});

describe('CatalogStatusClient.tsx — renders the full curated catalog with required admin columns', () => {
  it('shows all 117 catalog records and the required column headers', () => {
    process.env.VERCEL_ENV = 'preview';
    render(<CatalogStatusPage />);
    expect(screen.getByText(/117 of 117 catalog items/)).toBeInTheDocument();
    for (const header of ['Product', 'SKU', 'Category', 'Chassis', 'Tier', 'Public state', 'Stock', 'Supplier cost', 'Currency', 'Source note', 'Retail price', 'Pricing status', 'Restock interest', 'Suggested reorder', 'Missing-data reason']) {
      expect(screen.getByText(header)).toBeInTheDocument();
    }
    process.env.VERCEL_ENV = ORIGINAL_VERCEL_ENV;
  });
});

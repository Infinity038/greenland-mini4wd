import { describe, it, expect, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import '@testing-library/jest-dom/vitest';
import PricingAdminPage from './page';

const DIR = join(process.cwd(), 'app/admin/pricing');
const ORIGINAL_VERCEL_ENV = process.env.VERCEL_ENV;

describe('PricingAdminPage — Preview-only gating', () => {
  afterEach(() => {
    if (ORIGINAL_VERCEL_ENV === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = ORIGINAL_VERCEL_ENV;
  });

  it('renders the pricing admin UI when VERCEL_ENV is "preview"', () => {
    process.env.VERCEL_ENV = 'preview';
    render(<PricingAdminPage />);
    expect(screen.getByText(/PREVIEW — PRICING & CAMPAIGN ADMIN/)).toBeInTheDocument();
  });

  it('is unavailable (404 via notFound()) when VERCEL_ENV is "production"', () => {
    process.env.VERCEL_ENV = 'production';
    expect(() => render(<PricingAdminPage />)).toThrow(/NEXT_HTTP_ERROR_FALLBACK;404/);
  });

  it('is unavailable (404 via notFound()) when VERCEL_ENV is unset', () => {
    delete process.env.VERCEL_ENV;
    expect(() => render(<PricingAdminPage />)).toThrow(/NEXT_HTTP_ERROR_FALLBACK;404/);
  });

  it('is unavailable for any other VERCEL_ENV value', () => {
    process.env.VERCEL_ENV = 'development';
    expect(() => render(<PricingAdminPage />)).toThrow(/NEXT_HTTP_ERROR_FALLBACK;404/);
  });
});

describe('PricingAdminPage — no Supabase dependency (static source check)', () => {
  it('page.tsx has no Supabase import or client usage', () => {
    const src = readFileSync(join(DIR, 'page.tsx'), 'utf-8');
    expect(src).not.toMatch(/from\s+['"].*supabase.*['"]/i);
    expect(src).not.toMatch(/createClient\s*\(/);
  });

  it('PricingAdminClient.tsx has no Supabase import or client usage', () => {
    const src = readFileSync(join(DIR, 'PricingAdminClient.tsx'), 'utf-8');
    expect(src).not.toMatch(/from\s+['"].*supabase.*['"]/i);
    expect(src).not.toMatch(/createClient\s*\(/);
  });

  it('PricingAdminClient.tsx has no hardcoded admin password', () => {
    const src = readFileSync(join(DIR, 'PricingAdminClient.tsx'), 'utf-8');
    expect(src).not.toMatch(/mini4wd2026/);
    expect(src).not.toMatch(/ADMIN_PASSWORD/);
  });
});

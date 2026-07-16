import { describe, it, expect, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import '@testing-library/jest-dom/vitest';
import PosCameraTestPage from './page';

const DIR = join(process.cwd(), 'app/admin/pos-camera-test');

const ORIGINAL_VERCEL_ENV = process.env.VERCEL_ENV;

describe('PosCameraTestPage — Preview-only gating', () => {
  afterEach(() => {
    if (ORIGINAL_VERCEL_ENV === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = ORIGINAL_VERCEL_ENV;
  });

  it('renders the camera test tool when VERCEL_ENV is "preview"', () => {
    process.env.VERCEL_ENV = 'preview';
    render(<PosCameraTestPage />);
    expect(screen.getByText('PREVIEW CAMERA TEST — MOCK DATA ONLY')).toBeInTheDocument();
  });

  it('is unavailable (404 via notFound()) when VERCEL_ENV is "production"', () => {
    process.env.VERCEL_ENV = 'production';
    expect(() => render(<PosCameraTestPage />)).toThrow(/NEXT_HTTP_ERROR_FALLBACK;404/);
  });

  it('is unavailable (404 via notFound()) when VERCEL_ENV is unset (local/dev)', () => {
    delete process.env.VERCEL_ENV;
    expect(() => render(<PosCameraTestPage />)).toThrow(/NEXT_HTTP_ERROR_FALLBACK;404/);
  });

  it('is unavailable (404 via notFound()) for any other VERCEL_ENV value', () => {
    process.env.VERCEL_ENV = 'development';
    expect(() => render(<PosCameraTestPage />)).toThrow(/NEXT_HTTP_ERROR_FALLBACK;404/);
  });
});

describe('PosCameraTestPage — no Supabase dependency (static source check)', () => {
  it('page.tsx has no Supabase import or client usage', () => {
    const src = readFileSync(join(DIR, 'page.tsx'), 'utf-8');
    expect(src).not.toMatch(/from\s+['"].*supabase.*['"]/i);
    expect(src).not.toMatch(/createClient\s*\(/);
  });

  it('PosCameraTestClient.tsx has no Supabase import or client usage', () => {
    const src = readFileSync(join(DIR, 'PosCameraTestClient.tsx'), 'utf-8');
    expect(src).not.toMatch(/from\s+['"].*supabase.*['"]/i);
    expect(src).not.toMatch(/createClient\s*\(/);
  });
});

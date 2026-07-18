// AdminLoginPage's feature-flag branch — legacy hardcoded-password screen
// vs. the Supabase Auth screen — plus static-source proof the legacy
// password check is untouched. The Supabase Auth client and staff-session
// lookup are mocked so this file never makes a live Supabase call, even
// when the flag is on and the Auth branch renders.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import '@testing-library/jest-dom/vitest';
import { UNAUTHENTICATED_SESSION } from '@/lib/supabaseAuth/roles';

// Both branches call useRouter() (legacy: push on password success; Auth
// screen: replace on staff redirect) — provide a minimal mock covering both
// so rendering either branch works outside a real Next.js App Router tree.
// No navigation actually occurs in any test below (resolveStaffSession is
// mocked to always resolve unauthenticated, so the Auth screen never
// reaches its redirect branch here).
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock('@/lib/supabaseAuth/browserClient', () => ({
  createSupabaseBrowserClient: () => ({
    auth: { signInWithPassword: vi.fn(), signOut: vi.fn() },
  }),
}));
vi.mock('@/lib/supabaseAuth/resolveStaffSession', () => ({
  resolveStaffSession: vi.fn(async () => UNAUTHENTICATED_SESSION),
}));

const ENV_KEY = 'NEXT_PUBLIC_SUPABASE_AUTH_ENABLED';
const original = process.env[ENV_KEY];

afterEach(() => {
  if (original === undefined) delete process.env[ENV_KEY];
  else process.env[ENV_KEY] = original;
  vi.resetModules();
});

async function loadPage() {
  vi.resetModules();
  const mod = await import('./page');
  return mod.default;
}

describe('AdminLoginPage — legacy fallback while the Auth flag is disabled', () => {
  it('renders the legacy hardcoded-password screen when the flag is unset', async () => {
    delete process.env[ENV_KEY];
    const AdminLoginPage = await loadPage();
    render(<AdminLoginPage />);
    expect(screen.getByPlaceholderText(/Enter admin password/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/^Email$/i)).not.toBeInTheDocument();
  });

  it('renders the legacy hardcoded-password screen when the flag is explicitly false', async () => {
    process.env[ENV_KEY] = 'false';
    const AdminLoginPage = await loadPage();
    render(<AdminLoginPage />);
    expect(screen.getByPlaceholderText(/Enter admin password/i)).toBeInTheDocument();
  });

  it('renders the legacy screen for any value other than the literal string "true"', async () => {
    process.env[ENV_KEY] = 'yes';
    const AdminLoginPage = await loadPage();
    render(<AdminLoginPage />);
    expect(screen.getByPlaceholderText(/Enter admin password/i)).toBeInTheDocument();
  });
});

describe('AdminLoginPage — Supabase Auth screen when the flag is explicitly enabled', () => {
  it('renders the Supabase Auth email/password screen instead of the legacy screen', async () => {
    process.env[ENV_KEY] = 'true';
    const AdminLoginPage = await loadPage();
    render(<AdminLoginPage />);
    expect(await screen.findByLabelText(/^Email$/i)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/Enter admin password/i)).not.toBeInTheDocument();
  });
});

describe('AdminLoginPage — static source checks', () => {
  const src = readFileSync(join(process.cwd(), 'app', 'admin', 'login', 'page.tsx'), 'utf-8');

  it('still contains the legacy hardcoded password — this milestone does not remove it', () => {
    expect(src).toMatch(/mini4wd2026/);
    expect(src).toMatch(/ADMIN_PASSWORD/);
  });

  it('declares every legacy hook unconditionally, then branches on FEATURE_FLAGS.supabaseAuthEnabled only right before the legacy JSX return — never before a hook (Rules of Hooks)', () => {
    const lastUseState = src.lastIndexOf('useState(');
    const useRouterIdx = src.indexOf('useRouter(');
    const flagIdx = src.indexOf('FEATURE_FLAGS.supabaseAuthEnabled');
    const legacyReturnIdx = src.indexOf('return (');
    expect(lastUseState).toBeGreaterThan(-1);
    expect(useRouterIdx).toBeGreaterThan(-1);
    expect(flagIdx).toBeGreaterThan(-1);
    expect(legacyReturnIdx).toBeGreaterThan(-1);
    // Every hook runs before the flag check, and the flag check runs before
    // the legacy screen's JSX is returned — so both branches always call
    // exactly the same hooks in exactly the same order.
    expect(useRouterIdx).toBeGreaterThan(lastUseState);
    expect(flagIdx).toBeGreaterThan(useRouterIdx);
    expect(flagIdx).toBeLessThan(legacyReturnIdx);
  });
});

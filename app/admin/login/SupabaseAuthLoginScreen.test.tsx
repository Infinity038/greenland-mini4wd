// Component-level behavior of the feature-flagged Supabase Auth login
// screen, entirely mocked — no live Supabase project or network call is
// made anywhere in this file (createSupabaseBrowserClient and
// resolveStaffSession are both replaced with test doubles below). Uses only
// fireEvent (already part of the installed @testing-library/react) rather
// than adding a new @testing-library/user-event dependency.
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import SupabaseAuthLoginScreen from './SupabaseAuthLoginScreen';
import {
  UNAUTHENTICATED_SESSION,
  EXPIRED_SESSION,
  noStaffRoleSession,
  staffSession,
  type StaffSession,
} from '@/lib/supabaseAuth/roles';
import { DEFAULT_STAFF_REDIRECT_PATH } from '@/lib/supabaseAuth/safeNextPath';

const signInWithPassword = vi.fn();
const signOut = vi.fn();
const routerReplace = vi.fn();

vi.mock('@/lib/supabaseAuth/browserClient', () => ({
  createSupabaseBrowserClient: () => ({
    auth: { signInWithPassword, signOut },
  }),
}));

let resolvedSession: StaffSession = UNAUTHENTICATED_SESSION;
vi.mock('@/lib/supabaseAuth/resolveStaffSession', () => ({
  resolveStaffSession: vi.fn(async () => resolvedSession),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: routerReplace, push: vi.fn() }),
}));

const originalUrl = window.location.href;

beforeEach(() => {
  signInWithPassword.mockReset();
  signOut.mockReset();
  routerReplace.mockReset();
  resolvedSession = UNAUTHENTICATED_SESSION;
});

afterEach(() => {
  window.history.pushState({}, '', originalUrl);
});

describe('SupabaseAuthLoginScreen — initial session check', () => {
  it('shows the sign-in form for an unauthenticated visitor', async () => {
    resolvedSession = UNAUTHENTICATED_SESSION;
    render(<SupabaseAuthLoginScreen />);
    expect(await screen.findByLabelText(/^Email$/i)).toBeInTheDocument();
  });

  it('shows an expired-session message rather than the form', async () => {
    resolvedSession = EXPIRED_SESSION;
    render(<SupabaseAuthLoginScreen />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/session has expired/i);
  });

  it('shows a denied message for an authenticated racer with no staff role, and never redirects to the dashboard', async () => {
    resolvedSession = noStaffRoleSession('racer-1');
    render(<SupabaseAuthLoginScreen />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/not authorized/i);
    expect(routerReplace).not.toHaveBeenCalled();
  });

  it('redirects an already-authorized staff session straight to /admin, never showing a signed-in panel', async () => {
    resolvedSession = staffSession('admin-1', ['admin']);
    render(<SupabaseAuthLoginScreen />);
    await waitFor(() => expect(routerReplace).toHaveBeenCalledWith(DEFAULT_STAFF_REDIRECT_PATH));
    expect(screen.queryByText(/SIGN OUT/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Redirecting/i)).toBeInTheDocument();
  });

  it('redirects an already-authorized staff session to a safe validated ?next= path instead of the default', async () => {
    window.history.pushState({}, '', '/admin/login?next=/admin/orders');
    resolvedSession = staffSession('shop-1', ['shop_staff']);
    render(<SupabaseAuthLoginScreen />);
    await waitFor(() => expect(routerReplace).toHaveBeenCalledWith('/admin/orders'));
  });

  it('falls back to the default redirect path when ?next= is an external open-redirect attempt', async () => {
    window.history.pushState({}, '', '/admin/login?next=' + encodeURIComponent('https://evil.example.com'));
    resolvedSession = staffSession('shop-1', ['shop_staff']);
    render(<SupabaseAuthLoginScreen />);
    await waitFor(() => expect(routerReplace).toHaveBeenCalledWith(DEFAULT_STAFF_REDIRECT_PATH));
  });

  it('falls back to the default redirect path when ?next= is a protocol-relative open-redirect attempt', async () => {
    window.history.pushState({}, '', '/admin/login?next=' + encodeURIComponent('//evil.example.com'));
    resolvedSession = staffSession('shop-1', ['shop_staff']);
    render(<SupabaseAuthLoginScreen />);
    await waitFor(() => expect(routerReplace).toHaveBeenCalledWith(DEFAULT_STAFF_REDIRECT_PATH));
  });
});

describe('SupabaseAuthLoginScreen — sign-in flow', () => {
  it('shows an error for invalid credentials and never redirects', async () => {
    resolvedSession = UNAUTHENTICATED_SESSION;
    signInWithPassword.mockResolvedValue({ error: { message: 'Invalid login credentials' } });
    render(<SupabaseAuthLoginScreen />);

    fireEvent.change(await screen.findByLabelText(/^Email$/i), { target: { value: 'racer@example.com' } });
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: 'wrong-password' } });
    fireEvent.click(screen.getByRole('button', { name: /SIGN IN/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/invalid email or password/i);
    expect(routerReplace).not.toHaveBeenCalled();
  });

  it('denies a valid racer account with no staff role after successful Auth sign-in, signs it back out, and never redirects', async () => {
    signInWithPassword.mockResolvedValue({ error: null });
    render(<SupabaseAuthLoginScreen />);

    fireEvent.change(await screen.findByLabelText(/^Email$/i), { target: { value: 'racer@example.com' } });
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: 'correct-password' } });

    // The mocked resolveStaffSession returns whatever `resolvedSession`
    // currently holds; switch it to "no staff role" right before submit to
    // simulate the post-sign-in lookup finding a real racer account with no
    // staff_roles row.
    resolvedSession = noStaffRoleSession('racer-1');
    fireEvent.click(screen.getByRole('button', { name: /SIGN IN/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/not authorized/i);
    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
    expect(routerReplace).not.toHaveBeenCalled();
  });

  it('redirects to /admin (router.replace) after a valid staff sign-in', async () => {
    signInWithPassword.mockResolvedValue({ error: null });
    render(<SupabaseAuthLoginScreen />);

    fireEvent.change(await screen.findByLabelText(/^Email$/i), { target: { value: 'owner@example.com' } });
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: 'correct-password' } });

    resolvedSession = staffSession('admin-1', ['admin']);
    fireEvent.click(screen.getByRole('button', { name: /SIGN IN/i }));

    await waitFor(() => expect(routerReplace).toHaveBeenCalledWith(DEFAULT_STAFF_REDIRECT_PATH));
    expect(signOut).not.toHaveBeenCalled();
  });
});

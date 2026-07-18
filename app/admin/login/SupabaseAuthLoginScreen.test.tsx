// Component-level behavior of the feature-flagged Supabase Auth login
// screen, entirely mocked — no live Supabase project or network call is
// made anywhere in this file (createSupabaseBrowserClient and
// resolveStaffSession are both replaced with test doubles below). Uses only
// fireEvent (already part of the installed @testing-library/react) rather
// than adding a new @testing-library/user-event dependency.
import { describe, expect, it, vi, beforeEach } from 'vitest';
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

const signInWithPassword = vi.fn();
const signOut = vi.fn();

vi.mock('@/lib/supabaseAuth/browserClient', () => ({
  createSupabaseBrowserClient: () => ({
    auth: { signInWithPassword, signOut },
  }),
}));

let resolvedSession: StaffSession = UNAUTHENTICATED_SESSION;
vi.mock('@/lib/supabaseAuth/resolveStaffSession', () => ({
  resolveStaffSession: vi.fn(async () => resolvedSession),
}));

beforeEach(() => {
  signInWithPassword.mockReset();
  signOut.mockReset();
  resolvedSession = UNAUTHENTICATED_SESSION;
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

  it('shows a denied message for an authenticated racer with no staff role, not the staff panel', async () => {
    resolvedSession = noStaffRoleSession('racer-1');
    render(<SupabaseAuthLoginScreen />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/not authorized/i);
    expect(screen.queryByText(/SIGN OUT/i)).not.toBeInTheDocument();
  });

  it('shows the staff panel for an already-authenticated staff session', async () => {
    resolvedSession = staffSession('admin-1', ['admin']);
    render(<SupabaseAuthLoginScreen />);
    expect(await screen.findByText(/SIGN OUT/i)).toBeInTheDocument();
    // Scope the "admin" check to the subtitle line specifically — the page
    // title "ADMIN ACCESS" also matches a bare /admin/i, so assert against
    // the subtitle node's own text content rather than the whole document.
    expect(screen.getByText(/Signed in as staff/i)).toHaveTextContent(/admin/i);
  });
});

describe('SupabaseAuthLoginScreen — sign-in flow', () => {
  it('shows an error for invalid credentials and never reaches the staff panel', async () => {
    resolvedSession = UNAUTHENTICATED_SESSION;
    signInWithPassword.mockResolvedValue({ error: { message: 'Invalid login credentials' } });
    render(<SupabaseAuthLoginScreen />);

    fireEvent.change(await screen.findByLabelText(/^Email$/i), { target: { value: 'racer@example.com' } });
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: 'wrong-password' } });
    fireEvent.click(screen.getByRole('button', { name: /SIGN IN/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/invalid email or password/i);
    expect(screen.queryByText(/SIGN OUT/i)).not.toBeInTheDocument();
  });

  it('denies a valid racer account with no staff role after successful Auth sign-in, and signs it back out', async () => {
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
    expect(screen.queryByText(/SIGN OUT/i)).not.toBeInTheDocument();
  });

  it('reaches the staff panel for a valid admin sign-in', async () => {
    signInWithPassword.mockResolvedValue({ error: null });
    render(<SupabaseAuthLoginScreen />);

    fireEvent.change(await screen.findByLabelText(/^Email$/i), { target: { value: 'owner@example.com' } });
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: 'correct-password' } });

    resolvedSession = staffSession('admin-1', ['admin']);
    fireEvent.click(screen.getByRole('button', { name: /SIGN IN/i }));

    expect(await screen.findByText(/SIGN OUT/i)).toBeInTheDocument();
    expect(signOut).not.toHaveBeenCalled();
  });
});

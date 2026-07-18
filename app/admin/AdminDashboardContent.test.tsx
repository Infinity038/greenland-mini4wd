// AdminDashboardContent — Sign Out behavior, entirely mocked (no live
// Supabase project, no real Supabase queries: lib/supabase.ts's shared
// client is mocked so the stats-fetching effect resolves immediately with
// empty data).
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import AdminDashboardContent from './AdminDashboardContent';

const signOut = vi.fn();
const routerPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerPush, replace: vi.fn() }),
}));

vi.mock('@/lib/supabaseAuth/browserClient', () => ({
  createSupabaseBrowserClient: () => ({ auth: { signOut } }),
}));

const emptyResult = { data: [], error: null };
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        order: () => Promise.resolve(emptyResult),
        eq: () => ({ limit: () => Promise.resolve(emptyResult) }),
        neq: () => Promise.resolve(emptyResult),
        then: (resolve: (v: typeof emptyResult) => void) => resolve(emptyResult),
      }),
    }),
  },
}));

beforeEach(() => {
  signOut.mockReset();
  routerPush.mockReset();
});

describe('AdminDashboardContent — role display', () => {
  it('shows the resolved roles in the header', async () => {
    render(<AdminDashboardContent roles={['shop_staff', 'checkin_staff']} />);
    expect(screen.getByText(/shop_staff, checkin_staff/i)).toBeInTheDocument();
  });

  it('marks a viewer-only session as read-only', async () => {
    render(<AdminDashboardContent roles={['viewer']} />);
    expect(screen.getByText(/READ-ONLY/i)).toBeInTheDocument();
  });

  it('does not mark a non-viewer-only session as read-only', async () => {
    render(<AdminDashboardContent roles={['admin']} />);
    expect(screen.queryByText(/READ-ONLY/i)).not.toBeInTheDocument();
  });
});

describe('AdminDashboardContent — sign out', () => {
  it('signs out via the Supabase Auth client and navigates to /admin/login', async () => {
    render(<AdminDashboardContent roles={['admin']} />);
    fireEvent.click(screen.getByRole('button', { name: /sign out/i }));
    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(routerPush).toHaveBeenCalledWith('/admin/login'));
  });
});

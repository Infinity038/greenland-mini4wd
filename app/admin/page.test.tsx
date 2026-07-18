// AdminPage's feature-flag branch (Server Component) — legacy dashboard vs.
// the Supabase-Auth-gated dashboard/redirect/deny paths. requireStaffSession()
// is entirely mocked, so this file never touches cookies(), next/headers,
// or a live Supabase project. LegacyAdminDashboard / AdminDashboardContent /
// AccessDeniedScreen are stubbed to lightweight markers so this file stays
// focused on page.tsx's own branching logic (each has, or does not need,
// its own dedicated test elsewhere).
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import '@testing-library/jest-dom/vitest';
import {
  UNAUTHENTICATED_SESSION,
  EXPIRED_SESSION,
  noStaffRoleSession,
  staffSession,
  STAFF_ROLES,
  type StaffSession,
} from '@/lib/supabaseAuth/roles';

let mockedSession: StaffSession = UNAUTHENTICATED_SESSION;
// The mock implementation itself doesn't need the argument (the `void`
// below only exists to declare the real one-argument signature so TS
// doesn't reject passing allowedRoles through from the wrapper below,
// without tripping the no-unused-vars lint rule) — vi.fn() still records
// whatever the wrapper actually passes it, which is what the "calls
// requireStaffSession with the full explicit STAFF_ROLES allow-list" test
// below asserts against.
const requireStaffSessionMock = vi.fn(async (allowedRoles?: unknown) => {
  void allowedRoles;
  return mockedSession;
});
vi.mock('@/lib/supabaseAuth/requireStaffSession', () => ({
  requireStaffSession: (allowedRoles?: unknown) => requireStaffSessionMock(allowedRoles),
}));

vi.mock('./LegacyAdminDashboard', () => ({
  default: () => <div data-testid="legacy-dashboard">legacy</div>,
}));
vi.mock('./AdminDashboardContent', () => ({
  default: ({ roles }: { roles: string[] }) => <div data-testid="dashboard-content">{roles.join(',')}</div>,
}));
vi.mock('./AccessDeniedScreen', () => ({
  default: () => <div data-testid="access-denied">denied</div>,
}));

const ENV_KEY = 'NEXT_PUBLIC_SUPABASE_AUTH_ENABLED';
const original = process.env[ENV_KEY];

afterEach(() => {
  if (original === undefined) delete process.env[ENV_KEY];
  else process.env[ENV_KEY] = original;
  vi.resetModules();
  requireStaffSessionMock.mockClear();
  mockedSession = UNAUTHENTICATED_SESSION;
});

async function loadPage() {
  vi.resetModules();
  const mod = await import('./page');
  return mod.default as () => Promise<React.ReactElement>;
}

function redirectUrl(error: unknown): string {
  const digest = (error as { digest?: string })?.digest ?? '';
  return digest.split(';')[2] ?? '';
}

describe('AdminPage — legacy fallback while the Auth flag is disabled', () => {
  it('renders the legacy dashboard when the flag is unset, without ever calling requireStaffSession', async () => {
    delete process.env[ENV_KEY];
    const AdminPage = await loadPage();
    render(await AdminPage());
    expect(screen.getByTestId('legacy-dashboard')).toBeInTheDocument();
    expect(requireStaffSessionMock).not.toHaveBeenCalled();
  });

  it('renders the legacy dashboard when the flag is explicitly false', async () => {
    process.env[ENV_KEY] = 'false';
    const AdminPage = await loadPage();
    render(await AdminPage());
    expect(screen.getByTestId('legacy-dashboard')).toBeInTheDocument();
    expect(requireStaffSessionMock).not.toHaveBeenCalled();
  });
});

describe('AdminPage — flag enabled, unauthenticated/expired redirect to /admin/login', () => {
  it('redirects to /admin/login for an unauthenticated session', async () => {
    process.env[ENV_KEY] = 'true';
    mockedSession = UNAUTHENTICATED_SESSION;
    const AdminPage = await loadPage();
    await expect(AdminPage()).rejects.toSatisfy((err: unknown) => redirectUrl(err) === '/admin/login');
  });

  it('redirects to /admin/login for an expired session', async () => {
    process.env[ENV_KEY] = 'true';
    mockedSession = EXPIRED_SESSION;
    const AdminPage = await loadPage();
    await expect(AdminPage()).rejects.toSatisfy((err: unknown) => redirectUrl(err) === '/admin/login');
  });
});

describe('AdminPage — flag enabled, authenticated racer with no staff role is denied, not redirected', () => {
  it('renders AccessDeniedScreen, never the dashboard, and never throws a redirect', async () => {
    process.env[ENV_KEY] = 'true';
    mockedSession = noStaffRoleSession('racer-1');
    const AdminPage = await loadPage();
    render(await AdminPage());
    expect(screen.getByTestId('access-denied')).toBeInTheDocument();
    expect(screen.queryByTestId('dashboard-content')).not.toBeInTheDocument();
  });

  it('a valid Auth session alone is never treated as a staff session', async () => {
    process.env[ENV_KEY] = 'true';
    // A real, successfully-authenticated Supabase Auth user, but resolved
    // with zero staff roles — exactly the "normal racer" case this test
    // name calls out. Must still be denied.
    mockedSession = noStaffRoleSession('racer-2');
    const AdminPage = await loadPage();
    render(await AdminPage());
    expect(screen.getByTestId('access-denied')).toBeInTheDocument();
  });
});

describe('AdminPage — flag enabled, every current staff role may access the dashboard', () => {
  for (const role of STAFF_ROLES) {
    it(`renders the dashboard for role "${role}"`, async () => {
      process.env[ENV_KEY] = 'true';
      mockedSession = staffSession(`user-${role}`, [role]);
      const AdminPage = await loadPage();
      render(await AdminPage());
      expect(screen.getByTestId('dashboard-content')).toHaveTextContent(role);
    });
  }

  it('calls requireStaffSession with the full explicit STAFF_ROLES allow-list (no per-page narrowing yet)', async () => {
    process.env[ENV_KEY] = 'true';
    mockedSession = staffSession('admin-1', ['admin']);
    const AdminPage = await loadPage();
    await AdminPage();
    expect(requireStaffSessionMock).toHaveBeenCalledWith(STAFF_ROLES);
  });
});

describe('AdminPage — static source checks', () => {
  const src = readFileSync(join(process.cwd(), 'app', 'admin', 'page.tsx'), 'utf-8');

  it('the flag-branching page itself never references the legacy hardcoded password', () => {
    expect(src).not.toMatch(/mini4wd2026/);
    expect(src).not.toMatch(/ADMIN_PASSWORD/);
  });

  it('the flag-enabled Auth dashboard content never references the legacy hardcoded password', () => {
    const dashboardSrc = readFileSync(join(process.cwd(), 'app', 'admin', 'AdminDashboardContent.tsx'), 'utf-8');
    expect(dashboardSrc).not.toMatch(/mini4wd2026/);
    expect(dashboardSrc).not.toMatch(/ADMIN_PASSWORD/);
    expect(dashboardSrc).not.toMatch(/localStorage/);
  });

  it('the legacy dashboard file still has the hardcoded password — this milestone does not remove it', () => {
    const legacySrc = readFileSync(join(process.cwd(), 'app', 'admin', 'LegacyAdminDashboard.tsx'), 'utf-8');
    expect(legacySrc).toMatch(/mini4wd2026/);
    expect(legacySrc).toMatch(/ADMIN_PASSWORD/);
  });
});

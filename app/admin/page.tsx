// Server Component (no 'use client') — required so the Supabase-Auth branch
// below can verify the staff session server-side, before any protected
// dashboard content is ever sent to the browser.
//
// NEXT_PUBLIC_SUPABASE_AUTH_ENABLED off/absent (default): renders
// LegacyAdminDashboard unchanged — same hardcoded-password gate, same
// localStorage session, same behavior as before this milestone, in every
// environment including Production.
//
// NEXT_PUBLIC_SUPABASE_AUTH_ENABLED true: verifies the caller's Supabase
// Auth session server-side via requireStaffSession() before rendering
// anything from AdminDashboardContent. Unauthenticated and expired sessions
// redirect to /admin/login; an authenticated non-staff (racer) session sees
// AccessDeniedScreen, never the dashboard; only a real staff session
// (any of the six roles — no per-page role split yet, see
// docs/OWNER-BOOTSTRAP-AND-AUTH-ROLLOUT.md for that later phase) reaches
// AdminDashboardContent.
import { redirect } from 'next/navigation';
import { FEATURE_FLAGS } from '@/lib/featureFlags';
import { requireStaffSession } from '@/lib/supabaseAuth/requireStaffSession';
import { STAFF_ROLES } from '@/lib/supabaseAuth/roles';
import LegacyAdminDashboard from './LegacyAdminDashboard';
import AdminDashboardContent from './AdminDashboardContent';
import AccessDeniedScreen from './AccessDeniedScreen';

export default async function AdminPage() {
  if (!FEATURE_FLAGS.supabaseAuthEnabled) {
    return <LegacyAdminDashboard />;
  }

  // Explicit allow-list (all six current roles) rather than omitting the
  // argument — this page allows every staff role for now (§4: no per-page
  // permissions yet), but spelling it out here makes that an intentional,
  // visible decision rather than an implicit default, and exercises
  // requireStaffSession()'s allowedRoles parameter for real.
  const session = await requireStaffSession(STAFF_ROLES);

  if (session.status === 'unauthenticated' || session.status === 'expired') {
    redirect('/admin/login');
  }

  if (session.status === 'authenticated_no_staff_role') {
    return <AccessDeniedScreen />;
  }

  return <AdminDashboardContent roles={session.roles} />;
}

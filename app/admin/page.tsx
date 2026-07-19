import { redirect } from 'next/navigation';
import { requireStaffSession } from '@/lib/supabaseAuth/requireStaffSession';
import { STAFF_ROLES } from '@/lib/supabaseAuth/roles';
import AdminDashboardContent from './AdminDashboardContent';
import AccessDeniedScreen from './AccessDeniedScreen';

export default async function AdminPage() {
  const session = await requireStaffSession(STAFF_ROLES);

  if (session.status === 'unauthenticated' || session.status === 'expired') {
    redirect('/admin/login');
  }

  if (session.status === 'authenticated_no_staff_role') {
    return <AccessDeniedScreen />;
  }

  return <AdminDashboardContent roles={session.roles} />;
}

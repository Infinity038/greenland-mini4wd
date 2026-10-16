import { redirect, notFound } from 'next/navigation';
import { requireStaffSession } from '@/lib/supabaseAuth/requireStaffSession';
import AdminPredictionAccess from './AdminPredictionAccess';

export const dynamic = 'force-dynamic';

export default async function PredictionPitAccessAdminPage() {
  const session = await requireStaffSession(['admin']);
  if (session.status === 'unauthenticated' || session.status === 'expired') redirect('/admin/login');
  if (session.status !== 'staff') notFound();
  return <AdminPredictionAccess />;
}

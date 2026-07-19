import { createSupabaseServerClient } from './serverClient';
import { resolveStaffSession } from './resolveStaffSession';
import { hasAnyRole, noStaffRoleSession, type StaffRole, type StaffSession } from './roles';

export async function requireStaffSession(allowedRoles?: readonly StaffRole[]): Promise<StaffSession> {
  const client = await createSupabaseServerClient();
  const session = await resolveStaffSession(client);

  if (session.status !== 'staff') return session;
  if (allowedRoles?.length && !hasAnyRole(session, allowedRoles)) {
    return noStaffRoleSession(session.userId as string);
  }
  return session;
}

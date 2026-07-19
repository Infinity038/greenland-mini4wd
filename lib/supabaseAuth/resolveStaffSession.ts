import type { SupabaseClient } from '@supabase/supabase-js';
import {
  EXPIRED_SESSION,
  UNAUTHENTICATED_SESSION,
  noStaffRoleSession,
  staffSession,
  type StaffSession,
} from './roles';

const EXPIRED_OR_INVALID_SESSION_PATTERN = /expired|invalid|missing sub claim/i;

export async function resolveStaffSession(client: SupabaseClient): Promise<StaffSession> {
  const { data: userData, error: userError } = await client.auth.getUser();

  if (userError || !userData?.user) {
    return userError && EXPIRED_OR_INVALID_SESSION_PATTERN.test(userError.message)
      ? EXPIRED_SESSION
      : UNAUTHENTICATED_SESSION;
  }

  const { data: roleRows, error: roleError } = await client.rpc('current_staff_roles');
  if (roleError || !roleRows || roleRows.length === 0) {
    return noStaffRoleSession(userData.user.id);
  }

  return staffSession(userData.user.id, roleRows.map((row: { role: string }) => row.role));
}

import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveStaffSession } from '@/lib/supabaseAuth/resolveStaffSession';
import { hasAnyRole, type StaffRole, type StaffSession } from '@/lib/supabaseAuth/roles';

export interface StaffGateDeps { getClient: () => Promise<SupabaseClient> }

export const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return false;
  try { return new URL(origin).host === new URL(req.url).host; } catch { return false; }
}

export interface GateOk { client: SupabaseClient; session: StaffSession; body: Record<string, unknown> }

/**
 * Shared front door for operator JSON routes: POST + same-origin + JSON -> verified staff session (401/403) -> bounded body.
 * Identity is only the session cookie. The caller then validates the body shape and calls `requireRole`.
 */
export async function staffGate(req: Request, deps: StaffGateDeps, maxBody = 64_000): Promise<GateOk | Response> {
  if (req.method !== 'POST') return json(405, { error: 'method not allowed' });
  if (!sameOrigin(req)) return json(403, { error: 'forbidden' });
  if (!(req.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) return json(415, { error: 'unsupported' });
  const client = await deps.getClient();
  const session = await resolveStaffSession(client);
  if (session.status === 'unauthenticated' || session.status === 'expired') return json(401, { error: 'sign-in required' });
  if (session.status !== 'staff') return json(403, { error: 'not permitted' });
  const text = await req.text();
  if (text.length > maxBody) return json(413, { error: 'too large' });
  let body: unknown;
  try { body = JSON.parse(text); } catch { return json(400, { error: 'invalid request' }); }
  if (typeof body !== 'object' || body === null || Array.isArray(body) || Object.getPrototypeOf(body) !== Object.prototype) return json(400, { error: 'invalid request' });
  return { client, session, body: body as Record<string, unknown> };
}

export const requireRole = (g: GateOk, roles: readonly StaffRole[]): Response | null =>
  hasAnyRole(g.session, roles) ? null : json(403, { error: 'not permitted' });

export const onlyKeys = (o: Record<string, unknown>, keys: readonly string[]) => Object.keys(o).every(k => keys.includes(k));
export const isId = (v: unknown): v is string => typeof v === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(v);

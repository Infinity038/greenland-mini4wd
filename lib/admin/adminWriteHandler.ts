import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveStaffSession } from '@/lib/supabaseAuth/resolveStaffSession';
import { hasAnyRole } from '@/lib/supabaseAuth/roles';
import { validateWrite } from './writePolicy';

export interface AdminWriteDeps {
  getClient: () => Promise<SupabaseClient>;
}

/** Large enough for one base64 image data URL (the gallery and tournament forms store images inline); everything else is far smaller. */
const MAX_BODY = 2_000_000;
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

function sameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return false; // browsers always send Origin on cross-site POST and on fetch POST; refuse when absent
  try { return new URL(origin).host === new URL(req.url).host; } catch { return false; }
}

/**
 * POST /api/admin/write. Order matters and fails closed:
 * same-origin + JSON -> bounded body -> structural policy check -> verified staff session -> role for this rule
 * -> execute under the operator's own session (anon key + user JWT; NO service-role key).
 * Roles are resolved from the database each call; the browser cannot assert a role.
 */
export async function handleAdminWrite(req: Request, deps: AdminWriteDeps): Promise<Response> {
  if (req.method !== 'POST') return json(405, { error: 'method not allowed' });
  if (!sameOrigin(req)) return json(403, { error: 'forbidden' });
  if (!(req.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) return json(415, { error: 'unsupported' });

  // Authenticate BEFORE looking at the body, so anonymous callers learn nothing about the policy or its shape.
  // The identity comes only from the verified session cookie; no body field, header or query value is consulted.
  const client = await deps.getClient();
  const session = await resolveStaffSession(client);
  if (session.status === 'unauthenticated' || session.status === 'expired') return json(401, { error: 'sign-in required' });
  if (session.status !== 'staff') return json(403, { error: 'not permitted' });

  const text = await req.text();
  if (text.length > MAX_BODY) return json(413, { error: 'too large' });
  let body: unknown;
  try { body = JSON.parse(text); } catch { return json(400, { error: 'invalid request' }); }

  const checked = validateWrite(body);
  if (!checked.ok) return json(400, { error: checked.error });
  if (!hasAnyRole(session, checked.rule.roles)) return json(403, { error: 'not permitted' });

  const { table, op, values, match, neq, onConflict, returning } = checked.req;
  try {
    let q: any;
    if (op === 'insert') q = client.from(table).insert(values);
    else if (op === 'upsert') q = client.from(table).upsert(values, { onConflict });
    else if (op === 'update') q = client.from(table).update(values);
    else q = client.from(table).delete();
    if (op === 'update' || op === 'delete') {
      for (const [k, v] of Object.entries(match)) q = q.eq(k, v);
      for (const [k, v] of Object.entries(neq)) q = q.neq(k, v);
    }
    if (returning) q = q.select('id').single();
    const { data, error } = await q;
    if (error) return json(409, { error: 'write failed', code: typeof error.code === 'string' ? error.code : undefined, message: String(error.message ?? '').slice(0, 300) });
    return json(200, returning ? { ok: true, id: data?.id ?? null } : { ok: true });
  } catch {
    return json(500, { error: 'write failed' });
  }
}

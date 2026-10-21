import type { WriteRequest } from './writePolicy';

export interface AdminWriteResult { error: { message: string; code?: string } | null; id?: string | null }

/**
 * Browser helper for admin pages. Shaped like a Supabase `{ error }` result so call sites change minimally.
 * It sends NO identity: the server derives the operator from the session cookie.
 */
export async function adminWrite(req: WriteRequest): Promise<AdminWriteResult> {
  try {
    const res = await fetch('/api/admin/write', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(req),
    });
    if (res.ok) { const b = await res.json().catch(() => ({})); return { error: null, id: b?.id ?? null }; }
    const body = await res.json().catch(() => ({}));
    const message = res.status === 401 ? 'Session expired. Sign in again.'
      : res.status === 403 ? 'Your staff role is not permitted to do this.'
      : (body && (body.message || body.error)) || 'Write failed';
    return { error: { message: String(message), code: body?.code } };
  } catch {
    return { error: { message: 'Network error' } };
  }
}

/** Copy only the listed keys (missing keys are skipped). Pages use this so server-managed columns never leave the browser. */
export function pick<T extends Record<string, any>>(obj: T, keys: readonly string[]): Record<string, any> {
  const out: Record<string, any> = {};
  for (const k of keys) if (k in obj && obj[k] !== undefined) out[k] = obj[k];
  return out;
}

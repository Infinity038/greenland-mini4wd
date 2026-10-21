/** Browser helpers for the operator routes that are not plain table writes. They send no identity: the session cookie decides. */
async function post(path: string, body: unknown): Promise<{ ok: boolean; status: number; data: any }> {
  try {
    const res = await fetch(path, { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    return { ok: res.ok, status: res.status, data: await res.json().catch(() => ({})) };
  } catch { return { ok: false, status: 0, data: { error: 'Network error' } }; }
}
const fail = (r: { status: number; data: any }) => new Error(r.status === 403 ? 'Your staff role is not permitted to do this.' : r.status === 401 ? 'Session expired. Sign in again.' : String(r.data?.error || 'Request failed'));

export async function loyaltyAward(source: 'order' | 'ticket', id: string) {
  const r = await post('/api/admin/loyalty', { action: 'award', source, id }); if (!r.ok) throw fail(r); return r.data as { status: string; points?: number; days?: number };
}
export async function loyaltyClawback(source: 'order' | 'ticket', id: string) {
  const r = await post('/api/admin/loyalty', { action: 'clawback', source, id }); if (!r.ok) throw fail(r); return r.data as { status: string };
}
export async function loyaltyAdjust(i: { memberId: string; kind: 'bonus' | 'adjust' | 'redeem'; amount: number; description?: string }) {
  const r = await post('/api/admin/loyalty', { action: 'adjust', ...i }); if (!r.ok) throw fail(r); return r.data as { status: string };
}
export async function hallOfFameCheck(category: 'fastest_lap' | 'most_wins' | 'most_points' | 'most_races', memberId: string) {
  const r = await post('/api/admin/hall-of-fame', { category, memberId }); if (!r.ok) throw fail(r); return r.data as { broke_record: boolean; category: string };
}

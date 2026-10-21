import { awardForSource, clawbackForSource, adjustPoints, LoyaltyError, SOURCES, type Source } from './loyaltyService';
import { checkRecord, HofError, HOF_CATEGORIES, type HofCategory } from './hallOfFameService';
import { isId, json, onlyKeys, requireRole, staffGate, type StaffGateDeps } from './staffGate';

/** POST /api/admin/loyalty  { action: 'award'|'clawback', source: 'order'|'ticket', id } | { action: 'adjust', memberId, kind, amount, description? } */
export async function handleLoyalty(req: Request, deps: StaffGateDeps): Promise<Response> {
  const g = await staffGate(req, deps);
  if (g instanceof Response) return g;
  const b = g.body;
  try {
    if (b.action === 'award' || b.action === 'clawback') {
      if (!onlyKeys(b, ['action', 'source', 'id']) || (b.source !== 'order' && b.source !== 'ticket') || !isId(b.id)) return json(400, { error: 'invalid request' });
      const denied = requireRole(g, SOURCES[b.source as Source].roles); if (denied) return denied;
      const r = b.action === 'award' ? await awardForSource(g.client, b.source as Source, b.id) : await clawbackForSource(g.client, b.source as Source, b.id);
      return json(200, r);
    }
    if (b.action === 'adjust') {
      if (!onlyKeys(b, ['action', 'memberId', 'kind', 'amount', 'description']) || !isId(b.memberId) || !['bonus', 'adjust', 'redeem'].includes(b.kind as string)
        || typeof b.amount !== 'number' || (b.description !== undefined && (typeof b.description !== 'string' || b.description.length > 300))) return json(400, { error: 'invalid request' });
      const denied = requireRole(g, ['admin']); if (denied) return denied;
      return json(200, await adjustPoints(g.client, { memberId: b.memberId, kind: b.kind as 'bonus' | 'adjust' | 'redeem', amount: b.amount, description: b.description as string | undefined }));
    }
    return json(400, { error: 'invalid request' });
  } catch (e) {
    if (e instanceof LoyaltyError) return json(e.status, { error: e.message });
    return json(500, { error: 'loyalty operation failed' });
  }
}

/** POST /api/admin/hall-of-fame  { category, memberId } */
export async function handleHallOfFame(req: Request, deps: StaffGateDeps): Promise<Response> {
  const g = await staffGate(req, deps);
  if (g instanceof Response) return g;
  const b = g.body;
  if (!onlyKeys(b, ['category', 'memberId']) || !HOF_CATEGORIES.includes(b.category as HofCategory) || !isId(b.memberId)) return json(400, { error: 'invalid request' });
  const denied = requireRole(g, ['admin', 'race_marshal']); if (denied) return denied;
  try { return json(200, await checkRecord(g.client, b.category as HofCategory, b.memberId)); }
  catch (e) { return e instanceof HofError ? json(e.status, { error: e.message }) : json(500, { error: 'record check failed' }); }
}

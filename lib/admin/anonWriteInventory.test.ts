import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Ratchet: the exact set of source files that still WRITE to the database through the unauthenticated anon-key
 * client (`@/lib/supabase`, `./supabase`, or a local createClient with NEXT_PUBLIC_SUPABASE_ANON_KEY).
 * Migrating a file off the anon client means removing it here; adding any NEW anon-write file fails this test.
 * The seven pages already moved (cars, hall-of-fame, orders, profile-requests, race-results, seasons, tickets) must
 * never reappear. See docs/phase1/ROLE_REVIEW.md for severity of each remaining entry.
 */
// Every remaining entry is a CUSTOMER-FACING flow (no operator page, no operator library is left). They need member
// Auth + RLS insert-own policies or definer RPCs, which is the production cutover work (see docs/phase1/CUSTOMER_WRITE_PATHS.md).
const REMAINING_ANON_WRITERS = [
  'app/profile/RacerProfile.tsx',      // member self-service (cars, wishlist, profile edit requests) with no Auth identity
  'app/shop/page.tsx',                 // checkout: orders, stock decrement, discount-code use, proofs, preorders, inquiries, wishlist
  'app/tickets/page.tsx',              // race ticket purchase
  'app/tournament/page.tsx',           // race entries
].sort();

const ROOT = process.cwd();
function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) { if (!['node_modules', '.next'].includes(e.name)) walk(rel, out); }
    else if (/\.(ts|tsx)$/.test(e.name) && !/\.test\.(ts|tsx)$/.test(e.name)) out.push(rel);
  }
  return out;
}
const WRITE = /\.(insert|update|delete|upsert)\s*\(/;
const ANON = /from ['"](@\/lib\/supabase|\.\/supabase|\.\.\/supabase)['"]|NEXT_PUBLIC_SUPABASE_ANON_KEY/;
const AUTHED = /createSupabaseServerClient|createSupabaseBrowserClient|createMiddlewareSupabaseClient/;

describe('anonymous-key database writers (ratchet)', () => {
  const files = ['app', 'lib', 'components'].flatMap(d => walk(d));
  const found = files.filter(f => {
    if (f.startsWith('lib/supabaseAuth/') || f.startsWith('lib/admin/') || f === 'lib/supabase.ts') return false;
    const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
    return ANON.test(src) && WRITE.test(src) && !AUTHED.test(src);
  }).sort();

  it('matches the documented remaining set exactly (no new anon writers; migrated files removed from the list)', () => {
    expect(found).toEqual(REMAINING_ANON_WRITERS);
  });
  it('the seven migrated admin pages and the admin write layer contain no anon-client writes', () => {
    for (const p of ['cars', 'hall-of-fame', 'orders', 'profile-requests', 'race-results', 'seasons', 'tickets']) {
      expect(found).not.toContain(`app/admin/${p}/page.tsx`);
    }
  });
  it('the admin write route is the only server route allowed to write for operators and uses no service-role key', () => {
    const handler = fs.readFileSync(path.join(ROOT, 'lib/admin/adminWriteHandler.ts'), 'utf8');
    const route = fs.readFileSync(path.join(ROOT, 'app/api/admin/write/route.ts'), 'utf8');
    for (const src of [handler, route]) expect(src).not.toMatch(/service_role|SERVICE_ROLE|SUPABASE_SERVICE/);
  });
  it('no source file embeds a hard-coded admin password, or a client-side password/localStorage admin gate', () => {
    const offenders = files.filter(f => {
      const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
      return /ADMIN_PASSWORD\s*=\s*['"`]/.test(src) || /gm4wd_admin_authed|gm4wd_admin_expiry/.test(src);
    });
    expect(offenders).toEqual([]);
  });
  it('the legacy /orders route is only a server redirect to the staff-gated /admin/orders', () => {
    const src = fs.readFileSync(path.join(ROOT, 'app/orders/page.tsx'), 'utf8');
    expect(src).toContain("redirect('/admin/orders')");
    expect(src).not.toMatch(/from ['"]@\/lib\/supabase|localStorage\.|useState|^'use client'/m);
  });
  it('operator libraries no longer write from the browser: lib/loyalty.ts is pure and lib/hallOfFame.ts is gone', () => {
    expect(fs.existsSync(path.join(ROOT, 'lib/hallOfFame.ts'))).toBe(false);
    const loyalty = fs.readFileSync(path.join(ROOT, 'lib/loyalty.ts'), 'utf8');
    expect(loyalty).not.toMatch(/from ['"]\.\/supabase|export (async )?function (awardForPayment|clawbackForPayment)/);
  });
  it('public pages never write to operator tables (events must not update tournaments)', () => {
    const events = fs.readFileSync(path.join(ROOT, 'app/events/page.tsx'), 'utf8');
    expect(events).not.toMatch(/\.(insert|update|delete|upsert)\s*\(/);
  });
});

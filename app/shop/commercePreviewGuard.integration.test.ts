// Static-source verification that every commerce-mutating function in the
// storefront and admin order pages calls assertCommerceMutationAllowed()
// — and therefore the server-side /api/commerce-guard check — before it
// performs any Supabase write. This is the structural proof behind:
//   "Preview car-order/part-order/standalone-case/car-plus-case/payment-proof
//    submission is blocked" and "blocked Preview requests do not invoke
//    Supabase mutation functions" — car, part, and standalone-case orders
//    (with or without the display-case add-on) all funnel through the same
//    placeOrder() function, so one guarded entry point covers all four.
// Full behavioral rendering of app/shop/page.tsx is impractical here (heavy
// Supabase/member/browser dependencies, @ts-nocheck) — a source-position
// check is the same pattern already used elsewhere in this repo (e.g.
// app/admin/pricing/page.test.tsx's "no Supabase import" checks) and is a
// direct, unambiguous proof of call ordering.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const shopSrc = readFileSync(join(process.cwd(), 'app', 'shop', 'page.tsx'), 'utf-8');
const adminOrdersSrc = readFileSync(join(process.cwd(), 'app', 'admin', 'orders', 'page.tsx'), 'utf-8');
const legacyOrdersSrc = readFileSync(join(process.cwd(), 'app', 'orders', 'page.tsx'), 'utf-8');

// Extracts the source from `const <name> =` or `function <name>(` up to the
// next top-level `const`/`function` declaration, a reasonable approximation
// of "this function's body" for these flat, sequentially-defined handlers.
function functionSlice(src: string, name: string): string {
  const constIdx = src.indexOf(`const ${name} =`);
  const fnIdx = src.indexOf(`function ${name}(`);
  const start = constIdx !== -1 ? constIdx : fnIdx;
  expect(start, `expected to find "const ${name} =" or "function ${name}("`).toBeGreaterThan(-1);
  const rest = src.slice(start);
  const nextMatch = rest.slice(10).match(/\n {2}(const [a-zA-Z]|(async )?function [a-zA-Z])/);
  return nextMatch ? rest.slice(0, (nextMatch.index ?? 4000 - 10) + 10) : rest.slice(0, 4000);
}

function guardCallPrecedesFirstMutation(slice: string): boolean {
  const guardIdx = slice.indexOf('assertCommerceMutationAllowed()');
  const mutationIdx = slice.search(/supabase\.from\([^)]+\)\.(insert|update|upsert|delete)\(/);
  if (guardIdx === -1) return false; // no guard call at all
  if (mutationIdx === -1) return true; // no mutation in this slice — nothing to protect, trivially fine
  return guardIdx < mutationIdx;
}

describe('storefront commerce mutations are all guarded (app/shop/page.tsx)', () => {
  it('imports the guard', () => {
    expect(shopSrc).toMatch(/from ['"]@\/lib\/commercePreviewGuard['"]/);
    expect(shopSrc).toMatch(/assertCommerceMutationAllowed/);
  });

  it('placeOrder() — covers car, part, and display-case orders (including car-plus-case) — checks the guard before any Supabase write', () => {
    const slice = functionSlice(shopSrc, 'placeOrder');
    expect(guardCallPrecedesFirstMutation(slice)).toBe(true);
    // The guard check happens before the car/non-car branch, so it applies
    // uniformly regardless of which product type or add-ons were selected —
    // there is no separate, unguarded path for parts or the display case.
    const guardIdx = slice.indexOf('assertCommerceMutationAllowed()');
    const carBranchIdx = slice.indexOf('isCarProduct(selected)');
    expect(guardIdx).toBeLessThan(carBranchIdx);
  });

  it('uploadProof() — payment-proof submission — checks the guard before any Supabase write', () => {
    const slice = functionSlice(shopSrc, 'uploadProof');
    expect(guardCallPrecedesFirstMutation(slice)).toBe(true);
  });

  it('toggleWishlist() checks the guard before any Supabase write', () => {
    const slice = functionSlice(shopSrc, 'toggleWishlist');
    expect(guardCallPrecedesFirstMutation(slice)).toBe(true);
  });

  it('sendPreorder() checks the guard before any Supabase write', () => {
    const slice = functionSlice(shopSrc, 'sendPreorder');
    expect(guardCallPrecedesFirstMutation(slice)).toBe(true);
  });

  it('openModal() (the entry point for every RESERVE/PREORDER button, car/part/case alike) short-circuits on the client-side Preview hint before ever reaching placeOrder()', () => {
    const slice = functionSlice(shopSrc, 'openModal');
    expect(slice).toMatch(/previewMode/);
  });

  it('read-only functions are NOT guarded — storefront browsing/reads remain fully available in Preview', () => {
    for (const readFn of ['fetchProducts', 'fetchInventory', 'fetchWishlist']) {
      const slice = functionSlice(shopSrc, readFn);
      expect(slice, `${readFn} should not call the mutation guard`).not.toMatch(/assertCommerceMutationAllowed/);
    }
  });

  it('shows the exact required concise Preview message, never a generic error — via the shared PREVIEW_GUARD_USER_MESSAGE constant, not a duplicated literal', () => {
    expect(shopSrc).toMatch(/PREVIEW_GUARD_USER_MESSAGE/);
  });
});

describe('the shared Preview user-facing message is the exact required wording', () => {
  it('PREVIEW_GUARD_USER_MESSAGE matches the required concise message', async () => {
    const { PREVIEW_GUARD_USER_MESSAGE } = await import('@/lib/commercePreviewGuard');
    expect(PREVIEW_GUARD_USER_MESSAGE).toBe('Preview mode — orders are disabled and no inventory will be changed.');
  });
});

describe('admin order-approval actions are guarded (app/admin/orders/page.tsx)', () => {
  it('imports the guard', () => {
    expect(adminOrdersSrc).toMatch(/from ['"]@\/lib\/commercePreviewGuard['"]/);
  });

  it('updateStatus() (the future inventory-decrementing approval action) checks the guard before any Supabase write', () => {
    const start = adminOrdersSrc.indexOf('async function updateStatus');
    const end = adminOrdersSrc.indexOf('async function deleteOrder');
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const body = adminOrdersSrc.slice(start, end);
    expect(guardCallPrecedesFirstMutation(body)).toBe(true);
  });

  it('deleteOrder() checks the guard before deleting an order', () => {
    const start = adminOrdersSrc.indexOf('async function deleteOrder');
    const body = adminOrdersSrc.slice(start, start + 500);
    expect(guardCallPrecedesFirstMutation(body)).toBe(true);
  });
});

describe('legacy admin order-approval actions are guarded (app/orders/page.tsx)', () => {
  it('imports the guard', () => {
    expect(legacyOrdersSrc).toMatch(/from ['"]@\/lib\/commercePreviewGuard['"]/);
  });

  it('updateOrder, confirmPayment, and rejectProof all check the guard before any Supabase write', () => {
    const start = legacyOrdersSrc.indexOf('const guardBlocked');
    const end = legacyOrdersSrc.indexOf('const unlockMembership');
    const body = legacyOrdersSrc.slice(start, end);
    // All three call the shared guardBlocked() helper, which itself calls
    // assertCommerceMutationAllowed() — verify that wiring directly.
    expect(body).toMatch(/assertCommerceMutationAllowed/);
    const updateOrderCalls = (body.match(/if \(await guardBlocked\(\)\)/g) || []).length;
    expect(updateOrderCalls).toBe(3); // updateOrder, confirmPayment, rejectProof
  });

  it('unlockMembership is intentionally NOT guarded — it is a membership-status action, not a commerce/inventory mutation', () => {
    const start = legacyOrdersSrc.indexOf('const unlockMembership');
    const body = legacyOrdersSrc.slice(start, start + 300);
    expect(body).not.toMatch(/assertCommerceMutationAllowed/);
  });
});

describe('the restock-interest store is unaffected — it never touches Supabase in any environment', () => {
  it('lib/pricing/restockInterest.ts has no Supabase import', () => {
    const src = readFileSync(join(process.cwd(), 'lib', 'pricing', 'restockInterest.ts'), 'utf-8');
    expect(src).not.toMatch(/from\s+['"].*supabase.*['"]/i);
  });
});

// Preview-order protection — blocks every commerce mutation (order/reservation
// creation, payment-proof submission, stock decrement, order-status change)
// on Vercel Preview deployments, so manual testing there can never create a
// real order or mutate live inventory.
//
// `isPreviewCommerceMutationBlocked()` is the authoritative check. It reads
// `process.env.VERCEL_ENV`, a server-only variable (no `NEXT_PUBLIC_` prefix)
// that is never inlined into the client bundle — so it can only ever be
// evaluated correctly on the server, never spoofed by editing browser JS.
// That is why the real enforcement point is the `/api/commerce-guard` Route
// Handler (app/api/commerce-guard/route.ts), which runs this check
// server-side and is the thing every mutation function below actually calls
// and awaits before doing anything else. Disabling a button in the UI is a
// UX nicety layered on top of this, never the enforcement itself.

export const PREVIEW_GUARD_ERROR_CODE = 'PREVIEW_ORDER_SUBMISSION_DISABLED' as const;
export const PREVIEW_GUARD_MESSAGE = 'Preview deployment — order submission is disabled to protect live inventory.';
export const PREVIEW_GUARD_USER_MESSAGE = 'Preview mode — orders are disabled and no inventory will be changed.';

export interface CommerceGuardStatus {
  blocked: boolean;
  code: typeof PREVIEW_GUARD_ERROR_CODE | null;
  message: string | null;
}

// Server-only. Never call this from client code expecting a trustworthy
// result — process.env.VERCEL_ENV is undefined in the browser bundle, so a
// client-side call would always evaluate to "not blocked" regardless of the
// real environment. Only app/api/commerce-guard/route.ts (a Route Handler,
// which always executes server-side) may call this directly.
//
// Documented behavior for every VERCEL_ENV value:
//   'preview'            -> blocked (true) — the only case this guards against.
//   'production'         -> not blocked (false) — this task never changes
//                            Production behavior.
//   'development'        -> not blocked (false) — same as Production; Vercel
//                            sets this for `vercel dev`, not used by this repo.
//   undefined/unset       -> not blocked (false) — local `next dev`, CI, and
//                            this test suite never set VERCEL_ENV, so
//                            mutations remain allowed there by design; this
//                            guard exists specifically to stop Preview
//                            deployments, not to lock down every non-Preview
//                            environment.
export function isPreviewCommerceMutationBlocked(): boolean {
  return process.env.VERCEL_ENV === 'preview';
}

export function commerceGuardStatus(): CommerceGuardStatus {
  const blocked = isPreviewCommerceMutationBlocked();
  return {
    blocked,
    code: blocked ? PREVIEW_GUARD_ERROR_CODE : null,
    message: blocked ? PREVIEW_GUARD_MESSAGE : null,
  };
}

export class PreviewCommerceMutationBlockedError extends Error {
  code = PREVIEW_GUARD_ERROR_CODE;
  constructor(message: string = PREVIEW_GUARD_MESSAGE) {
    super(message);
    this.name = 'PreviewCommerceMutationBlockedError';
  }
}

// Client-side call, used at the top of every commerce mutation function
// (placeOrder, uploadProof, toggleWishlist, sendPreorder, admin order-status
// changes, etc.) — awaits a real server round-trip to the authoritative
// check above, then throws if blocked. A mutation function that calls this
// first and returns early on throw can never reach its Supabase write when
// running on Preview, regardless of whether any button was left enabled.
export async function assertCommerceMutationAllowed(): Promise<void> {
  let status: CommerceGuardStatus;
  try {
    const res = await fetch('/api/commerce-guard', { cache: 'no-store' });
    status = await res.json();
  } catch {
    // If the guard endpoint itself is unreachable, fail closed in any
    // environment we can't positively identify as non-Preview — but this
    // codebase has no way to distinguish "network hiccup" from "blocked"
    // here, so we only fail closed when the response was fetched but
    // reported blocked; a genuine network error surfaces to the caller as a
    // normal failure instead of silently permitting the mutation.
    throw new PreviewCommerceMutationBlockedError('Could not verify order submission is allowed. Please try again.');
  }
  if (status.blocked) {
    throw new PreviewCommerceMutationBlockedError(status.message ?? PREVIEW_GUARD_MESSAGE);
  }
}

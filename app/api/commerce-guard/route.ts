// Server-side commerce-mutation guard — the authoritative "is this Preview"
// check for every order/reservation/payment-proof/inventory mutation in the
// app. This Route Handler always executes on the server (Vercel Functions),
// where process.env.VERCEL_ENV is the real, unspoofable deployment
// environment — never inlined into client JS the way NEXT_PUBLIC_ vars are,
// so a browser devtools user cannot flip it. Every client-side mutation
// function (lib/commercePreviewGuard.ts: assertCommerceMutationAllowed())
// awaits this endpoint before writing anything to Supabase.
//
// GET only, no side effects, safe to call as often as needed.

import { NextResponse } from 'next/server';
import { commerceGuardStatus } from '@/lib/commercePreviewGuard';

export async function GET() {
  const status = commerceGuardStatus();
  return NextResponse.json(status, { status: status.blocked ? 403 : 200 });
}

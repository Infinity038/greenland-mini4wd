// Temporary Preview-only route for the pricing/campaign engine admin UI.
// Server Component (no 'use client') so the VERCEL_ENV check runs
// server-side against the real process env, never inlined into the client
// bundle. Renders only on Vercel Preview deployments; 404s everywhere else
// (Production, local dev without VERCEL_ENV=preview, etc).
//
// Why this is Preview-only: Supabase Auth, staff roles, and RLS
// (docs/PHASED-SUPABASE-MIGRATION-PLAN.md) are not live yet, so there is no
// real server-verified session or role to gate this route in Production.
// Campaign/pricing mutation must stay disabled in Production until that
// migration is approved and applied (docs/PRICING-ADMIN-PERMISSIONS.md).
// This page operates entirely on the in-memory Preview demo catalog
// (lib/pricing/previewDemoCatalog.ts) and a mock role selector — it never
// reads or writes live Supabase data.
import { notFound } from 'next/navigation';
import PricingAdminClient from './PricingAdminClient';

export default function PricingAdminPage() {
  if (process.env.VERCEL_ENV !== 'preview') {
    notFound();
  }

  return <PricingAdminClient />;
}

// Temporary Preview-only route for the catalog-status / restock-interest
// admin view (docs/CATALOG-COSTING-AND-FREIGHT.md §"Admin restock view").
// Server Component (no 'use client') so the VERCEL_ENV check runs
// server-side against the real process env, never inlined into the client
// bundle. Renders only on Vercel Preview deployments; 404s everywhere else
// (Production, local dev without VERCEL_ENV=preview, etc), mirroring
// app/admin/pricing/page.tsx.
//
// Why this is Preview-only: Supabase Auth, staff roles, and RLS
// (docs/PHASED-SUPABASE-MIGRATION-PLAN.md) are not live yet, so there is no
// real server-verified session or role to gate this route in Production.
// This page reads only the bundled curated catalog (lib/pricing/catalogProducts.ts)
// and the in-memory restock-interest store — it never reads or writes live
// Supabase data, and is a planning/visibility tool only: it never places a
// supplier order.
import { notFound } from 'next/navigation';
import CatalogStatusClient from './CatalogStatusClient';

export default function CatalogStatusPage() {
  if (process.env.VERCEL_ENV !== 'preview') {
    notFound();
  }

  return <CatalogStatusClient />;
}

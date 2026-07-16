// Temporary Preview-only route for physical-device camera testing of the
// shared QR scanner. Server Component (no 'use client') so the VERCEL_ENV
// check runs server-side against the real process env, never inlined into
// the client bundle. Renders only on Vercel Preview deployments; 404s
// everywhere else (Production, local dev without VERCEL_ENV=preview, etc).
//
// Remove this route before final production approval.
import { notFound } from 'next/navigation';
import PosCameraTestClient from './PosCameraTestClient';

export default function PosCameraTestPage() {
  if (process.env.VERCEL_ENV !== 'preview') {
    notFound();
  }

  return <PosCameraTestClient />;
}

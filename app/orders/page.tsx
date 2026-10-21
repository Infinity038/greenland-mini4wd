import { redirect } from 'next/navigation';

/**
 * RETIRED. /orders was a legacy order-management page outside /admin, guarded only by a password embedded in the
 * client bundle and a localStorage flag, and it wrote with the public anon key. Nothing in the site links to it and
 * customers see their orders under /profile?tab=orders. Operators now use /admin/orders, which requires a verified
 * staff session (middleware) and performs every write through the server-authorized /api/admin/* routes.
 * The old password must be treated as compromised: it was published in the repository history.
 */
export default function LegacyOrdersRedirect(): never {
  redirect('/admin/orders');
}

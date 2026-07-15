# Proposed admin authentication replacement — DRAFT, NOT IMPLEMENTED

Status: proposal only. No auth code has been changed in this pass. This document
describes what a follow-up implementation would do once the live Supabase schema
is confirmed (see the read-only export queries provided separately).

## Problem (confirmed by code audit)

`ADMIN_PASSWORD = 'mini4wd2026'` is hardcoded in plaintext and duplicated across
17 files:

- `app/admin/login/page.tsx`
- `app/admin/products/page.tsx`
- `app/admin/orders/page.tsx`
- `app/admin/cars/page.tsx`
- `app/admin/gallery/page.tsx`
- `app/admin/hall-of-fame/page.tsx`
- `app/admin/loyalty/page.tsx`
- `app/admin/members/page.tsx`
- `app/admin/news/page.tsx`
- `app/admin/page.tsx`
- `app/admin/profile-requests/page.tsx`
- `app/admin/race-results/page.tsx`
- `app/admin/seasons/page.tsx`
- `app/admin/tickets/page.tsx`
- `app/admin/tournaments/page.tsx`
- `app/orders/page.tsx` (member-facing page, also references the pattern)
- `components/admin/MemberProfileModal.tsx`

Each page independently checks `password === 'mini4wd2026'` client-side and, on
match, writes `localStorage.setItem('adminSession', { expires })`. This is
visible in the shipped JS bundle and trivially bypassable from devtools
(`localStorage.setItem('adminSession', JSON.stringify({expires: Date.now()+1e9}))`
grants access with no password at all). There is currently no server-side
verification of admin identity anywhere, and Supabase RLS (once confirmed) is
presumably not scoped to a real admin role, meaning any client holding the
public anon key can likely write directly to `products`/`orders`/`members` via
the REST API regardless of what the UI enforces.

## Proposed replacement

1. **Supabase Auth for admin sign-in.** Use email+password (or magic link) via
   `supabase.auth.signInWithPassword`. Admins get real accounts in `auth.users`.
2. **`admin_users` table** (or a `profiles.role` column if a profiles table
   already exists — to be confirmed from the schema export):
   ```sql
   create table public.admin_users (
     user_id uuid primary key references auth.users(id) on delete cascade,
     created_at timestamptz not null default now()
   );
   ```
3. **RLS policies** — sketch, to be adjusted once real table/column names and
   any existing policies are confirmed:
   ```sql
   -- Public: read-only, published catalog only
   create policy "public read published products"
     on public.products for select
     using (published = true);

   -- Admins: full read/write
   create policy "admins manage products"
     on public.products for all
     using (exists (select 1 from public.admin_users where user_id = auth.uid()))
     with check (exists (select 1 from public.admin_users where user_id = auth.uid()));
   ```
   Equivalent admin-only write / member-scoped read policies for `orders`,
   `preorders`, `wishlist`, `payment_proofs`, `discount_codes`, etc., each
   reviewed against what that table currently allows before tightening it.
4. **Server-side route protection.** Extend `middleware.ts` (or add server
   component checks) so `/admin/**` requires a valid Supabase session belonging
   to a row in `admin_users` — not a `localStorage` flag the client controls.
5. **Remove every hardcoded credential and `adminSession` localStorage check**
   from the 17 files above, replaced by a single shared `useAdminSession()`
   hook backed by `supabase.auth.getSession()`.
6. **Rotate `mini4wd2026`** — treat it as already compromised (it has been
   visible in the public production JS bundle) regardless of when the new
   system ships; this is an operational step for the project owner, not
   something a code change can do.
7. **Public read access stays anon-key, read-only, published-only** — no
   change needed to how visitors browse the shop.

## Why this isn't implemented yet

Applying RLS policies safely requires seeing the actual current policies first
— a mismatch here could either lock out the current (already insecure) access
path in a way that breaks production, or fail to close the hole if a policy
already grants broad access to `anon`. This is why the export queries request
`pg_policies` and `pg_tables.rowsecurity` specifically. Once that comes back,
this plan gets finalized into an actual migration + code diff for review.

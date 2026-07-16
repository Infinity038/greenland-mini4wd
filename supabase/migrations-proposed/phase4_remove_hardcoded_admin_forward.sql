-- DO NOT RUN — REVIEWED PROPOSAL ONLY
--
-- PHASE 4 — REMOVE HARDCODED ADMIN PASSWORD AND CLIENT-SIDE ADMIN AUTH
--
-- This phase is overwhelmingly a CODE change, not a schema change — the
-- real security boundary (RLS gated on is_admin()/has_staff_role()) was
-- already established in Phase 3. Once Phase 3 is live, the hardcoded
-- `mini4wd2026` string and the `localStorage.adminSession` flag are already
-- decorative: every write they used to gate is independently enforced (or
-- denied) by RLS regardless of what the client-side UI thinks. This phase
-- is what actually deletes the decorative layer and replaces it with a
-- real one, so there is exactly one source of truth instead of two.
--
-- PREREQUISITES: Phase 1 (Auth), Phase 2 (staff_roles), Phase 3 (RLS,
--   specifically the Group D admin-only policies) already live and
--   verified — including a real bootstrap admin who can sign in.
--
-- CODE DEPENDENCIES (not applied in this pass — this is the actual scope of
--   Phase 4's real work; DB side is minimal, see below):
--   - Delete `const ADMIN_PASSWORD = 'mini4wd2026'` and every
--     `password === ADMIN_PASSWORD` check from all 17 files identified in
--     docs/PROPOSED-admin-auth-plan.md (app/admin/login/page.tsx,
--     app/admin/{products,orders,cars,gallery,hall-of-fame,loyalty,members,
--     news,page,profile-requests,race-results,seasons,tickets,tournaments}
--     /page.tsx, app/orders/page.tsx, components/admin/MemberProfileModal.tsx).
--   - Delete every `localStorage.getItem('adminSession')` /
--     `localStorage.setItem('adminSession', ...)` reference.
--   - Rebuild `app/admin/login/page.tsx` to call
--     `supabase.auth.signInWithPassword({ email, password })`.
--   - Add a single shared `useAdminSession()` (or server-side equivalent)
--     hook backed by `supabase.auth.getSession()` + a call confirming
--     `is_admin()` (or the relevant `has_staff_role()`), replacing the 17
--     duplicated checks with one.
--   - `middleware.ts`: remove the blanket
--     `pathname.startsWith("/admin") → NextResponse.next()` exemption.
--     Replace with a real server-side session check (Supabase SSR helper
--     reading the auth cookie) that redirects to `/admin/login` when there
--     is no session, or when the session has no matching `staff_roles` row.
--
-- DATA BACKFILL: none.
--
-- TESTING: confirm an unauthenticated request to any `/admin/*` route
--   redirects to `/admin/login`; confirm a real staff session with the
--   right role reaches the dashboard; confirm a real authenticated racer
--   session (no staff_roles row) is denied, not just hidden by the UI.
--
-- VERIFICATION QUERIES:
--   select count(*) from public.staff_roles; -- at least 1 (bootstrap admin)
--   -- Application-side: grep the deployed bundle for "mini4wd2026" —
--   -- expect zero matches once this phase's code changes ship.
--
-- RISKS: if middleware.ts is changed before the bootstrap admin (Phase 2)
--   actually exists and can sign in, the entire admin panel becomes
--   inaccessible to everyone, including the person who needs to fix it —
--   verify the bootstrap admin can sign in and reach `is_admin() = true`
--   BEFORE removing the old password gate, not after.
--
-- STOP CONDITIONS: bootstrap admin cannot sign in and/or `is_admin()`
--   returns false for them once Phase 2/3 are live.
--
-- ROLLBACK TRIGGERS: legitimate staff locked out of `/admin/*` in
--   Production with no working fallback.

begin;

-- Defense-in-depth alongside Phase 3's RLS (belt-and-suspenders — RLS
-- already blocks these for anon/authenticated without the right role, this
-- makes it true even if a future migration accidentally drops a policy).
revoke all on public.admin_config from anon, authenticated;
revoke all on public.staff_roles from anon, authenticated;
revoke all on public.discount_codes from anon, authenticated;
revoke all on public.discount_code_redemptions from anon, authenticated;
grant select, insert, update, delete on public.admin_config to authenticated; -- RLS (is_admin()) still gates every row
grant select, insert, update, delete on public.staff_roles to authenticated;  -- RLS still gates every row
grant select, insert, update, delete on public.discount_codes to authenticated;
grant select, insert, update, delete on public.discount_code_redemptions to authenticated;

commit;

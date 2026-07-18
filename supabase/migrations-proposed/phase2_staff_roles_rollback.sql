-- DO NOT RUN — REVIEWED PROPOSAL ONLY
--
-- PHASE 2 ROLLBACK
--
-- ROLLBACK TRIGGERS: only safe once Phase 3 (which adds policies referencing
-- has_staff_role()/is_admin()) and Phase 4 (which calls them from app code)
-- are already rolled back — dropping these functions while something still
-- calls them breaks every RLS policy and every admin route check at once.
-- current_staff_roles() carries the same caller — lib/supabaseAuth/
-- resolveStaffSession.ts (Phase B.1) — so it must also already be unused
-- (Auth flag off, or that code path reverted) before this runs.
--
-- Dependency order: current_staff_roles() and has_staff_role() have no
-- dependency on each other (both read staff_roles independently), but both
-- must be dropped before the staff_roles table itself, and the table before
-- the staff_role enum it's typed on.

begin;

drop function if exists public.current_staff_roles();
drop function if exists public.is_admin();
drop function if exists public.has_staff_role(public.staff_role[]);
drop table if exists public.staff_roles;
drop type if exists public.staff_role;

commit;

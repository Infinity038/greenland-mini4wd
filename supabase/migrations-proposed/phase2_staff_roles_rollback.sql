-- DO NOT RUN — REVIEWED PROPOSAL ONLY
--
-- PHASE 2 ROLLBACK
--
-- ROLLBACK TRIGGERS: only safe once Phase 3 (which adds policies referencing
-- has_staff_role()/is_admin()) and Phase 4 (which calls them from app code)
-- are already rolled back — dropping these functions while something still
-- calls them breaks every RLS policy and every admin route check at once.

begin;

drop function if exists public.is_admin();
drop function if exists public.has_staff_role(public.staff_role[]);
drop table if exists public.staff_roles;
drop type if exists public.staff_role;

commit;

-- DO NOT RUN — REVIEWED PROPOSAL ONLY
--
-- PHASE 1 ROLLBACK
--
-- Only removes what Phase 1 added. No pre-existing `members` row is altered
-- or deleted by either the forward or this rollback script.
--
-- ROLLBACK TRIGGERS: see phase1_auth_foundation_forward.sql. Run this before
-- rolling back Phase 2/3 if any of those have shipped since — later phases
-- depend on auth_user_id and staff_roles, so they must be unwound first.

begin;

-- Remove every auth.users row this migration created (identified by the
-- migration tag in raw_user_meta_data, not by guessing which rows are "new").
delete from auth.users
where raw_user_meta_data ? 'migrated_from_members_id';

-- members.auth_user_id already becomes NULL automatically via
-- "on delete set null" above, but drop the column outright if fully
-- reverting Phase 1 (only safe once Phase 2/3 are also rolled back, since
-- Phase 3's RLS policies reference this column).
drop function if exists public.current_member_id();
alter table public.members drop column if exists auth_user_id;

commit;

-- DO NOT RUN — REVIEWED PROPOSAL ONLY
--
-- PHASE 4 ROLLBACK
--
-- Only reverses the belt-and-suspenders GRANT/REVOKE — does not restore the
-- hardcoded password or client-side session flag (that is a code rollback,
-- i.e. `git revert` on the Phase 4 commit, not a SQL concern).
--
-- ROLLBACK TRIGGERS: see phase4_remove_hardcoded_admin_forward.sql.

begin;

grant all on public.admin_config to anon, authenticated;
grant all on public.staff_roles to anon, authenticated;
grant all on public.discount_codes to anon, authenticated;
grant all on public.discount_code_redemptions to anon, authenticated;
-- Note: Phase 3's RLS policies (if still applied) continue to restrict
-- these regardless of the table-level grant restored here.

commit;

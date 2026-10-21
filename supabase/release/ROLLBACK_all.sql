-- Rollback to the audited baseline (anon and authenticated hold every privilege, RLS off). Rows are never touched.
drop policy if exists members_select_own   on public.members;
drop policy if exists members_select_staff on public.members;
drop policy if exists members_update_staff on public.members;
alter table public.members no force row level security;
alter table public.members disable row level security;
grant all on public.members to anon, authenticated;
drop function if exists public.club_member_status(text);
drop function if exists public.club_member_logout(text);
drop function if exists public.club_member_login(text, text);
drop function if exists public.club_register_member(text, text, text, text, text, text, text);
drop table if exists public.club_member_sessions;
drop function if exists public.club_member_view(text, text);

-- R5: row-level security. Owner/definer functions (postgres, BYPASSRLS) are unaffected; clients are fully governed.
alter table public.members enable row level security;
alter table public.members force row level security;
drop policy if exists members_select_own   on public.members;
drop policy if exists members_select_staff on public.members;
drop policy if exists members_update_staff on public.members;
create policy members_select_own on public.members for select to authenticated using (auth_user_id = auth.uid());
create policy members_select_staff on public.members for select to authenticated
  using (public.has_staff_role(array['admin','registration_staff','checkin_staff','shop_staff','race_marshal','viewer']::public.staff_role[]));
create policy members_update_staff on public.members for update to authenticated
  using (public.has_staff_role(array['admin','registration_staff','checkin_staff','shop_staff','race_marshal']::public.staff_role[]))
  with check (public.has_staff_role(array['admin','registration_staff','checkin_staff','shop_staff','race_marshal']::public.staff_role[]));
-- no INSERT or DELETE policy for any client: registration happens only through public.club_register_member

-- P4 step 2: R4 + R5 TOGETHER in ONE transaction (never R4 alone). Apply only after P4_01 passed its checks.
begin;
-- R4 (corrected): a column-level REVOKE does NOT override a table-level GRANT, so the TABLE-level privileges are removed first
-- and only the safe columns are granted back. Apply only after the app no longer reads or writes members as anon (R2 + session RPCs).
revoke select, insert, update on public.members from anon, authenticated;
do $$
declare cols text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position) into cols
    from information_schema.columns where table_schema = 'public' and table_name = 'members' and column_name not in ('password_hash');
  execute format('grant select (%s) on public.members to authenticated', cols);   -- everything except the hash
end $$;
-- staff write path (columns from lib/admin/writePolicy.ts and loyaltyService); WHO may write is decided by the R5 policy
grant update (name, avatar_url, member_status, loyalty_tier, points_rate, loyalty_progress, loyalty_needed,
              weekly_loyalty_progress, season_loyalty_progress, total_points, rank, membership_expires_at,
              is_active_member, lifetime_spending) on public.members to authenticated;

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
commit;

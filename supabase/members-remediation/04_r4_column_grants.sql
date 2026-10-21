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

begin;
-- C1: scoped read of the SIGNED-IN legacy member's own data. Identity comes only from the opaque session token (checked against
-- public.club_member_sessions); no email, member id or role is accepted from the caller. Each scope returns only the fields one
-- consumer needs; an explicit allow-list is used (not "all columns minus some") so a future column can never leak by default.
create or replace function public.club_member_view(p_token text, p_scope text)
returns jsonb language plpgsql stable security definer
set search_path = pg_catalog, extensions, pg_temp as $$
declare m public.members;
begin
  if p_token is null or char_length(p_token) <> 64 or p_scope is null or p_scope not in ('tier', 'ticket_progress', 'membership', 'profile') then
    return jsonb_build_object('ok', false);
  end if;
  select mm.* into m from public.club_member_sessions s join public.members mm on mm.id = s.member_id
   where s.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex') and s.expires_at > now();
  if m.id is null then return jsonb_build_object('ok', false); end if;
  return jsonb_build_object('ok', true, 'data', case p_scope
    when 'tier' then jsonb_build_object('loyalty_tier', m.loyalty_tier)
    when 'ticket_progress' then jsonb_build_object('weekly_loyalty_progress', m.weekly_loyalty_progress, 'season_loyalty_progress', m.season_loyalty_progress)
    when 'membership' then jsonb_build_object('membership_expires_at', m.membership_expires_at)
    else jsonb_build_object('id', m.id, 'name', m.name, 'first_name', m.first_name, 'last_name', m.last_name, 'email', m.email, 'phone', m.phone,
      'nationality', m.nationality, 'city', m.city, 'experience', m.experience, 'created_at', m.created_at, 'member_status', m.member_status,
      'referral_code', m.referral_code, 'referred_by', m.referred_by, 'rank', m.rank, 'total_points', m.total_points,
      'favorite_chassis', m.favorite_chassis, 'is_active_member', m.is_active_member, 'membership_expires_at', m.membership_expires_at,
      'loyalty_tier', m.loyalty_tier, 'points_rate', m.points_rate, 'loyalty_progress', m.loyalty_progress, 'loyalty_needed', m.loyalty_needed,
      'weekly_loyalty_progress', m.weekly_loyalty_progress, 'season_loyalty_progress', m.season_loyalty_progress,
      'lifetime_spending', m.lifetime_spending, 'avatar_url', m.avatar_url)
  end);
end $$;
revoke all on function public.club_member_view(text, text) from public;
grant execute on function public.club_member_view(text, text) to anon, authenticated;
commit;

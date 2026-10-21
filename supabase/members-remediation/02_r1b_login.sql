-- R1b: legacy password check inside the database. The hash is never returned. Needs public.rate_limit_hit (club_rate_limit.sql).
create or replace function public.club_member_login(p_email text, p_password text)
returns jsonb language plpgsql volatile security definer
set search_path = pg_catalog, extensions, pg_temp as $$
declare e text := lower(btrim(coalesce(p_email, ''))); m public.members; h text; ok boolean := false; rl record;
begin
  if e = '' or char_length(e) > 254 or p_password is null or char_length(p_password) not between 1 and 200 then
    return jsonb_build_object('ok', false); end if;
  select * into rl from public.rate_limit_hit('memberlogin:' || e, 900, 10);
  if not rl.allowed then return jsonb_build_object('ok', false, 'limited', true, 'retry_after', rl.retry_after); end if;
  select * into m from public.members where email = e;
  h := coalesce(m.password_hash, '$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ01234');
  h := regexp_replace(h, '^\$2b\$', '$2a$');
  ok := m.id is not null and m.password_hash is not null and extensions.crypt(p_password, h) = h;
  if not ok then return jsonb_build_object('ok', false); end if;
  return jsonb_build_object('ok', true, 'member', to_jsonb(m) - 'password_hash');
end $$;
revoke all on function public.club_member_login(text, text) from public;
grant execute on function public.club_member_login(text, text) to anon, authenticated;

-- R1a (v2, Gate C2): registration through a validated SECURITY DEFINER function. A password never reaches the database, only a bcrypt hash.
-- v2 answers {"status":"accepted"} for a NEW and for an ALREADY-REGISTERED address and returns no member data, so the function itself
-- (callable directly with the public key) cannot be used to find out which emails are registered.
create or replace function public.club_register_member(
  p_name text, p_email text, p_phone text, p_nationality text, p_city text,
  p_password_hash text, p_referred_by text default null)
returns jsonb language plpgsql volatile security definer
set search_path = pg_catalog, pg_temp as $$
declare e text := lower(btrim(coalesce(p_email, '')));
begin
  if e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(e) > 254
     or p_name is null or char_length(btrim(p_name)) not between 1 and 80
     or p_password_hash is null or p_password_hash !~ '^\$2[aby]\$[0-9]{2}\$[./A-Za-z0-9]{53}$'
     or char_length(coalesce(p_phone, '')) > 30 or char_length(coalesce(p_nationality, '')) > 60
     or char_length(coalesce(p_city, '')) > 80 or char_length(coalesce(p_referred_by, '')) > 40 then
    raise exception 'invalid registration' using errcode = '22023';
  end if;
  insert into public.members(name, email, phone, nationality, city, password_hash, referred_by)
  values (btrim(p_name), e, nullif(btrim(p_phone), ''), nullif(btrim(p_nationality), ''), nullif(btrim(p_city), ''),
          p_password_hash, nullif(upper(btrim(p_referred_by)), ''))
  on conflict (email) do nothing;
  return jsonb_build_object('status', 'accepted');
end $$;
revoke all on function public.club_register_member(text, text, text, text, text, text, text) from public;
grant execute on function public.club_register_member(text, text, text, text, text, text, text) to anon, authenticated;

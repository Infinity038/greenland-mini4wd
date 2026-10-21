-- R1c: legacy members keep a password login WITHOUT Supabase Auth: the database issues an opaque expiring session token
-- (only its sha256 is stored). It replaces the anonymous by-email reads (shop, tickets, tournament) once members is sealed.
create table if not exists public.club_member_sessions (
  token_hash text primary key,
  member_id  uuid not null references public.members(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now());
alter table public.club_member_sessions enable row level security;
alter table public.club_member_sessions force row level security;
revoke all on public.club_member_sessions from public, anon, authenticated;

create or replace function public.club_member_login(p_email text, p_password text)
returns jsonb language plpgsql volatile security definer
set search_path = pg_catalog, extensions, pg_temp as $$
declare e text := lower(btrim(coalesce(p_email, ''))); m public.members; h text; ok boolean := false; rl record; tok text;
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
  tok := encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.club_member_sessions(token_hash, member_id, expires_at)
    values (encode(extensions.digest(tok, 'sha256'), 'hex'), m.id, now() + interval '12 hours');
  if random() < 0.05 then delete from public.club_member_sessions where expires_at < now(); end if;
  return jsonb_build_object('ok', true, 'session_token', tok, 'member', to_jsonb(m) - 'password_hash');
end $$;

-- only the fields the legacy pages read by email today (shop tier, ticket progress, tournament expiry) plus identity basics
create or replace function public.club_member_status(p_token text)
returns jsonb language plpgsql stable security definer
set search_path = pg_catalog, extensions, pg_temp as $$
declare m public.members;
begin
  if p_token is null or char_length(p_token) <> 64 then return jsonb_build_object('ok', false); end if;
  select mm.* into m from public.club_member_sessions s join public.members mm on mm.id = s.member_id
   where s.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex') and s.expires_at > now();
  if m.id is null then return jsonb_build_object('ok', false); end if;
  return jsonb_build_object('ok', true, 'member', jsonb_build_object('id', m.id, 'name', m.name, 'email', m.email, 'member_status', m.member_status,
    'loyalty_tier', m.loyalty_tier, 'weekly_loyalty_progress', m.weekly_loyalty_progress, 'season_loyalty_progress', m.season_loyalty_progress,
    'membership_expires_at', m.membership_expires_at, 'is_active_member', m.is_active_member));
end $$;

create or replace function public.club_member_logout(p_token text) returns boolean
language plpgsql volatile security definer set search_path = pg_catalog, extensions, pg_temp as $$
declare n int;
begin
  delete from public.club_member_sessions where token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex');
  get diagnostics n = row_count; return n > 0;
end $$;
revoke all on function public.club_member_login(text, text), public.club_member_status(text), public.club_member_logout(text) from public;
grant execute on function public.club_member_login(text, text), public.club_member_status(text), public.club_member_logout(text) to anon, authenticated;

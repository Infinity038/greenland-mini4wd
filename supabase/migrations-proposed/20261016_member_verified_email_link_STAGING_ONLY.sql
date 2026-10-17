-- NOT APPLIED. This is an additive building block for reviewed Supabase Auth
-- migration only; it does not fix current anonymous table grants by itself.
-- Requires production backup, verified callback allowlist, and secure sign-in UI.
begin;
do $guard$
begin
  if to_regclass('public.members') is null
     or to_regclass('auth.users') is null
     or not exists (select 1 from information_schema.columns
        where table_schema='public' and table_name='members'
          and column_name='auth_user_id') then
    raise exception 'Verified-email member linkage prerequisites missing';
  end if;
end
$guard$;

-- Never take member ID or email from request parameters; only active verified auth identity.
create or replace function public.claim_existing_member_after_verified_email()
returns uuid
language plpgsql volatile security definer
set search_path = ''
as $function$
declare
  verified_id uuid := auth.uid();
  verified_email text;
  verified_at timestamptz;
  matches integer;
  matching_member uuid;
  already_linked uuid;
begin
  if verified_id is null then
    raise exception 'Sign-in required' using errcode = '42501';
  end if;
  select u.email, u.email_confirmed_at
    into verified_email, verified_at
    from auth.users u where u.id=verified_id;
  if verified_at is null or verified_email is null or length(btrim(verified_email))=0 then
    raise exception 'Verified email required' using errcode = '42501';
  end if;
  select count(*)::integer, (array_agg(m.id))[1]
    into matches, matching_member from public.members m
    where lower(btrim(m.email))=lower(btrim(verified_email));
  if matches <> 1 then
    raise exception 'Contact organizer to verify member account' using errcode = '42501';
  end if;
  select m.auth_user_id into already_linked
    from public.members m where m.id=matching_member for update;
  if already_linked is not null and already_linked <> verified_id then
    raise exception 'Account linkage conflict; contact organizer' using errcode = '42501';
  end if;
  update public.members m set auth_user_id=verified_id
    where m.id=matching_member and (m.auth_user_id is null or m.auth_user_id=verified_id);
  return matching_member;
end;
$function$;

revoke all on function public.claim_existing_member_after_verified_email() from public;
revoke all on function public.claim_existing_member_after_verified_email() from anon;
grant execute on function public.claim_existing_member_after_verified_email() to authenticated;
commit;

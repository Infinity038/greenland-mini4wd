begin;

create or replace function public.bootstrap_owner_admin()
returns boolean
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  current_user_email text;
  current_user_confirmed_at timestamptz;
  existing_staff_count integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select lower(u.email), u.email_confirmed_at
    into current_user_email, current_user_confirmed_at
  from auth.users u
  where u.id = auth.uid();

  if current_user_email is distinct from 'alltfarmer@gmail.com' then
    raise exception 'Owner account required' using errcode = '42501';
  end if;

  if current_user_confirmed_at is null then
    raise exception 'Email confirmation required' using errcode = '42501';
  end if;

  if exists (
    select 1
    from public.staff_roles sr
    where sr.user_id = auth.uid()
      and sr.role = 'admin'::public.staff_role
  ) then
    return true;
  end if;

  select count(*) into existing_staff_count from public.staff_roles;
  if existing_staff_count <> 0 then
    raise exception 'Owner bootstrap is closed' using errcode = '42501';
  end if;

  insert into public.staff_roles(user_id, role, granted_by)
  values (auth.uid(), 'admin'::public.staff_role, auth.uid());

  return true;
end;
$$;

revoke all on function public.bootstrap_owner_admin() from public;
revoke all on function public.bootstrap_owner_admin() from anon;
grant execute on function public.bootstrap_owner_admin() to authenticated;

commit;

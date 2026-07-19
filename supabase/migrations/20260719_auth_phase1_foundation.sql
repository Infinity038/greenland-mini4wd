begin;

alter table public.members
  add column if not exists auth_user_id uuid references auth.users(id) on delete set null;

create unique index if not exists members_auth_user_id_key
  on public.members (auth_user_id)
  where auth_user_id is not null;

create or replace function public.current_member_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select m.id
  from public.members m
  where m.auth_user_id = auth.uid()
  limit 1;
$$;

revoke all on function public.current_member_id() from public;
revoke all on function public.current_member_id() from anon;
grant execute on function public.current_member_id() to authenticated;

commit;

begin;

do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'staff_role'
  ) then
    create type public.staff_role as enum (
      'admin',
      'registration_staff',
      'checkin_staff',
      'shop_staff',
      'race_marshal',
      'viewer'
    );
  end if;
end $$;

create table if not exists public.staff_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.staff_role not null,
  granted_at timestamptz not null default now(),
  granted_by uuid references auth.users(id) on delete set null,
  unique (user_id, role)
);

create index if not exists staff_roles_granted_by_idx on public.staff_roles(granted_by) where granted_by is not null;

alter table public.staff_roles enable row level security;
alter table public.staff_roles force row level security;
revoke all on public.staff_roles from anon, authenticated;
grant usage on type public.staff_role to authenticated;

create or replace function public.has_staff_role(required_roles public.staff_role[])
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(exists (
    select 1
    from public.staff_roles sr
    where sr.user_id = auth.uid()
      and sr.role = any(required_roles)
  ), false);
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.has_staff_role(array['admin']::public.staff_role[]);
$$;

create or replace function public.current_staff_roles()
returns table (role public.staff_role)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select sr.role
  from public.staff_roles sr
  where sr.user_id = auth.uid()
  order by sr.role::text;
$$;

revoke all on function public.has_staff_role(public.staff_role[]) from public;
revoke all on function public.has_staff_role(public.staff_role[]) from anon;
grant execute on function public.has_staff_role(public.staff_role[]) to authenticated;

revoke all on function public.is_admin() from public;
revoke all on function public.is_admin() from anon;
grant execute on function public.is_admin() to authenticated;

revoke all on function public.current_staff_roles() from public;
revoke all on function public.current_staff_roles() from anon;
grant execute on function public.current_staff_roles() to authenticated;

commit;

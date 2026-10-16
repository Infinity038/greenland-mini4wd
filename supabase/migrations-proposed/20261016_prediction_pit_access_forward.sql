-- REVIEW ONLY: do not apply before verifying live Mini4WD schema, Supabase Auth linkage,
-- staff-role functions, existing RLS and backups. Virtual points are not official rewards.
begin;

create table if not exists public.prediction_pit_access (
  member_id uuid primary key references public.members(id) on delete cascade,
  allowed boolean not null default false,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
create table if not exists public.prediction_pit_access_audit (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  old_allowed boolean not null,
  new_allowed boolean not null,
  changed_by uuid not null references auth.users(id),
  changed_at timestamptz not null default now()
);
create index if not exists prediction_pit_access_audit_member_at
  on public.prediction_pit_access_audit(member_id, changed_at desc);

alter table public.prediction_pit_access enable row level security;
alter table public.prediction_pit_access_audit enable row level security;
-- No direct authenticated or anonymous table access; only narrowly scoped functions below.
revoke all on public.prediction_pit_access from public, anon, authenticated;
revoke all on public.prediction_pit_access_audit from public, anon, authenticated;

create or replace function public.prediction_pit_allowed()
returns boolean language plpgsql stable security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then return false; end if;
  if public.is_admin() then return true; end if;
  return exists (
    select 1 from public.prediction_pit_access a
    join public.members m on m.id = a.member_id
    where m.auth_user_id = auth.uid() and a.allowed = true
  );
end;
$$;

create or replace function public.prediction_pit_admin_roster()
returns table(member_id uuid, member_name text, member_email text, auth_linked boolean, allowed boolean)
language plpgsql stable security definer set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Access denied' using errcode = '42501';
  end if;
  return query
    select m.id, m.name::text, m.email::text, m.auth_user_id is not null, coalesce(a.allowed, false)
    from public.members m left join public.prediction_pit_access a on a.member_id = m.id
    order by lower(m.name::text), m.id;
end;
$$;

create or replace function public.set_prediction_pit_access(target_member_id uuid, new_allowed boolean)
returns void language plpgsql volatile security definer
set search_path = public, pg_temp
as $$
declare old_value boolean;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Access denied' using errcode = '42501';
  end if;
  if target_member_id is null or new_allowed is null then
    raise exception 'Member and explicit approval required' using errcode = '22023';
  end if;
  -- Lock the member row to serialize permission changes and prevent writes for unknown IDs.
  perform 1 from public.members where id = target_member_id for update;
  if not found then raise exception 'Member not found' using errcode = '22023'; end if;
  select a.allowed into old_value from public.prediction_pit_access a
    where a.member_id = target_member_id for update;
  if coalesce(old_value, false) = new_allowed then return; end if;
  insert into public.prediction_pit_access(member_id, allowed, updated_by, updated_at)
    values (target_member_id, new_allowed, auth.uid(), now())
    on conflict (member_id) do update
      set allowed = excluded.allowed, updated_by = excluded.updated_by, updated_at = excluded.updated_at;
  insert into public.prediction_pit_access_audit(member_id, old_allowed, new_allowed, changed_by)
    values(target_member_id, coalesce(old_value, false), new_allowed, auth.uid());
end;
$$;

revoke all on function public.prediction_pit_allowed() from public, anon;
revoke all on function public.prediction_pit_admin_roster() from public, anon;
revoke all on function public.set_prediction_pit_access(uuid, boolean) from public, anon;
grant execute on function public.prediction_pit_allowed() to authenticated;
grant execute on function public.prediction_pit_admin_roster() to authenticated;
grant execute on function public.set_prediction_pit_access(uuid, boolean) to authenticated;
commit;

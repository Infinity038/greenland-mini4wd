-- Roll back only before any production member links or non-owner staff roles exist.
begin;

do $$
declare
  linked_members integer;
  staff_rows integer;
begin
  select count(*) into linked_members from public.members where auth_user_id is not null;
  select count(*) into staff_rows from public.staff_roles;
  if linked_members > 0 or staff_rows > 1 then
    raise exception 'Auth rollback blocked: linked members %, staff roles %', linked_members, staff_rows;
  end if;
end $$;

drop function if exists public.current_staff_roles();
drop function if exists public.is_admin();
drop function if exists public.has_staff_role(public.staff_role[]);
drop table if exists public.staff_roles;
drop type if exists public.staff_role;

drop function if exists public.current_member_id();
drop index if exists public.members_auth_user_id_key;
alter table public.members drop column if exists auth_user_id;

commit;

-- READ ONLY: metadata and counts, no customer record fields or password hashes.
select current_database() as database_name, current_timestamp as inspected_at;
select c.relname as relation,
       c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced,
       has_table_privilege('anon', c.oid, 'SELECT') as anon_select,
       has_table_privilege('anon', c.oid, 'INSERT') as anon_insert,
       has_table_privilege('anon', c.oid, 'UPDATE') as anon_update,
       has_table_privilege('anon', c.oid, 'DELETE') as anon_delete,
       has_table_privilege('anon', c.oid, 'TRUNCATE') as anon_truncate
from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind='r' order by c.relname;
select has_column_privilege('anon','public.members','password_hash','SELECT')
  as anon_password_hash_select,
  to_regprocedure('public.is_admin()') is not null as staff_helper_exists,
  to_regprocedure('public.current_member_id()') is not null as member_helper_exists;
select schemaname, tablename, policyname, roles, cmd
from pg_catalog.pg_policies where schemaname='public' order by tablename,policyname;
select 'members' as subject, count(*) as amount from public.members
union all select 'auth_linked_members',count(*) from public.members where auth_user_id is not null
union all select 'cars',count(*) from public.cars
union all select 'tournaments',count(*) from public.tournaments
union all select 'race_results',count(*) from public.race_results
union all select 'race_entries',count(*) from public.race_entries;

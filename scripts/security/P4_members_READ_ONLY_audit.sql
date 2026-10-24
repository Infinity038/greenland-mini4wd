-- GM4WD P4 production access gate: READ ONLY. No row contents, passwords or credentials read.
-- Run on Supabase project greenland-mini4wd. Never run against an unrelated project.
-- Interpreting the results: P4_01 is complete when the legacy destructive grants are false.
-- P4_02 is complete only when members has RLS and anon SELECT/INSERT are both false.
WITH member AS (
 SELECT c.oid,c.relrowsecurity AS rls_enabled,c.relforcerowsecurity AS rls_forced
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relname='members' AND c.relkind='r'
),
grants AS (
 SELECT
 has_table_privilege('anon',oid,'SELECT') AS anon_select,
 has_table_privilege('anon',oid,'INSERT') AS anon_insert,
 has_table_privilege('anon',oid,'UPDATE') AS anon_update,
 has_table_privilege('anon',oid,'DELETE') AS anon_delete,
 has_table_privilege('anon',oid,'TRUNCATE') AS anon_truncate,
 has_table_privilege('authenticated',oid,'DELETE') AS authenticated_delete,
 has_table_privilege('authenticated',oid,'TRUNCATE') AS authenticated_truncate
 FROM member
),
functions AS (
 SELECT COUNT(DISTINCT proname) AS found FROM pg_proc
 WHERE pronamespace='public'::regnamespace
 AND proname IN ('club_member_login','club_member_logout','club_member_status','club_member_view','club_register_member','rate_limit_hit')
),
roles AS (
 SELECT COUNT(*) AS assigned_staff_roles FROM public.staff_roles
)
SELECT 'members_rls_enabled' AS check_name,rls_enabled::text AS observed,
CASE WHEN rls_enabled THEN 'LOCKDOWN_ON' ELSE 'LOCKDOWN_PENDING' END AS status FROM member
UNION ALL SELECT 'members_rls_forced',rls_forced::text,CASE WHEN rls_forced THEN 'LOCKDOWN_ON' ELSE 'LOCKDOWN_PENDING' END FROM member
UNION ALL SELECT 'anon_select_members',anon_select::text,CASE WHEN NOT anon_select THEN 'LOCKDOWN_ON' ELSE 'SENSITIVE_ACCESS_OPEN' END FROM grants
UNION ALL SELECT 'anon_insert_members',anon_insert::text,CASE WHEN NOT anon_insert THEN 'LOCKDOWN_ON' ELSE 'WRITE_ACCESS_OPEN' END FROM grants
UNION ALL SELECT 'p4_01_anon_unused_grants_removed',((NOT anon_update) AND (NOT anon_delete) AND (NOT anon_truncate))::text,CASE WHEN NOT anon_update AND NOT anon_delete AND NOT anon_truncate THEN 'PASS' ELSE 'PENDING' END FROM grants
UNION ALL SELECT 'p4_01_authenticated_unused_grants_removed',((NOT authenticated_delete) AND (NOT authenticated_truncate))::text,CASE WHEN NOT authenticated_delete AND NOT authenticated_truncate THEN 'PASS' ELSE 'PENDING' END FROM grants
UNION ALL SELECT 'p1_club_functions_present',found::text,CASE WHEN found=6 THEN 'PASS' ELSE 'INVESTIGATE' END FROM functions
UNION ALL SELECT 'staff_role_assignment_exists',(assigned_staff_roles>0)::text,CASE WHEN assigned_staff_roles>0 THEN 'PRESENT' ELSE 'MISSING' END FROM roles
ORDER BY check_name;

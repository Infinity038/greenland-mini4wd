-- Greenland Mini4WD SSO/security P0 metadata gate. READ-ONLY; run only against existing GM4WD Supabase.
-- No member row contents, credentials, email addresses or hashes are displayed.
WITH m AS (
 SELECT c.relrowsecurity AS rls,has_table_privilege('anon',c.oid,'SELECT') AS anon_select,
 has_table_privilege('anon',c.oid,'INSERT') AS anon_insert
 FROM pg_class c WHERE c.oid='public.members'::regclass
),checks AS (
 SELECT 1 AS n,'members_rls' AS check_name,rls::text AS observed,CASE WHEN rls THEN 'ENABLED_REQUIRES_APP_TEST' ELSE 'BLOCKED_RLS_OFF' END AS result FROM m
 UNION ALL SELECT 2,'anonymous_members_select',anon_select::text,CASE WHEN anon_select THEN 'BLOCKED_READ_EXPOSURE' ELSE 'REVOKED' END FROM m
 UNION ALL SELECT 3,'anonymous_members_insert',anon_insert::text,CASE WHEN anon_insert THEN 'BLOCKED_WRITE_EXPOSURE' ELSE 'REVOKED' END FROM m
 UNION ALL SELECT 4,'members_count',(SELECT count(*)::text FROM public.members),'PRESERVE'
 UNION ALL SELECT 5,'staff_role_rows',(SELECT count(*)::text FROM public.staff_roles),'PRESENCE_NOT_LOGIN_PROOF'
 UNION ALL SELECT 6,'club_session_rpc_count',
 (SELECT count(DISTINCT proname)::text FROM pg_proc WHERE pronamespace='public'::regnamespace
 AND proname IN ('club_member_login','club_member_logout','club_member_view','club_register_member','club_member_status','rate_limit_hit')),
 'FUNCTION_PRESENCE_NOT_P3_TEST'
 UNION ALL SELECT 7,'pit_member_approval_table',coalesce(to_regclass('public.prediction_pit_access')::text,'absent'),
 CASE WHEN to_regclass('public.prediction_pit_access') IS NULL THEN 'BLOCKED_NO_HOSTED_APPROVAL_TABLE' ELSE 'REVIEW_RLS_AND_GRANTS' END
 UNION ALL SELECT 8,'pit_approval_rpc',coalesce(to_regprocedure('public.set_prediction_pit_access(uuid,boolean)')::text,'absent'),
 'PRESENCE_NOT_SSO_HANDOFF'
)
SELECT check_name,observed,result FROM checks ORDER BY n;

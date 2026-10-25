-- GM4WD P0 release inventory, strictly READ ONLY and no member PII.
-- Does not prove a recoverable backup, login success or confirmed owner.
SELECT
 (SELECT relrowsecurity FROM pg_class
  WHERE oid='public.members'::regclass) AS members_rls,
 (SELECT relforcerowsecurity FROM pg_class
  WHERE oid='public.members'::regclass) AS members_force_rls,
 has_table_privilege('anon','public.members','SELECT') AS anon_member_select,
 has_table_privilege('anon','public.members','INSERT') AS anon_member_insert,
 to_regclass('public.prediction_pit_owner_authority') IS NOT NULL
   AS owner_authority_table_present_not_pin_proof,
 to_regclass('public.prediction_pit_access') IS NOT NULL
   AS owner_access_table_present_not_approval_proof,
 (SELECT count(*) FROM public.members) AS member_count_preservation_check;

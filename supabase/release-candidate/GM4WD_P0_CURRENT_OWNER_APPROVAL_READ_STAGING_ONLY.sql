-- P0 STAGING ONLY: server-to-server current GM4WD owner approval read.
-- Requires earlier GM4WD owner authority + P4 member lockdown migration.
-- Do NOT run against production before verified recoverable backup/P3 gates.
-- No grants to anon/authenticated, no member profile or secret output.
CREATE OR REPLACE FUNCTION public.pit_p0_current_member_approved(p_member uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog','pg_temp'
AS $secure_pit_approval$
 SELECT coalesce(public.pit_p0_security_ready(),false)
   AND p_member IS NOT NULL
   AND EXISTS (
     SELECT 1 FROM public.prediction_pit_access a
     JOIN public.members m ON m.id=a.member_id
     WHERE a.member_id=p_member AND a.approved=true
       AND a.age_verified=true
       AND a.revoked_at IS NULL
       AND a.approved_by=(SELECT owner_auth_user_id
         FROM public.prediction_pit_owner_authority WHERE singleton=true)
   );
$secure_pit_approval$;
REVOKE ALL ON FUNCTION public.pit_p0_current_member_approved(uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.pit_p0_current_member_approved(uuid)
 TO service_role;

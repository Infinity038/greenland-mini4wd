-- P0 GM4WD access issuance candidate: NOT a live migration.
-- Owner must grant access explicitly and record 18+ verification.
-- A valid GM4WD 64-hex HttpOnly cookie is necessary but not sufficient.
-- Production SSO endpoint must throttle, check same-origin + CSRF, sign
-- server-side only, and the Pit side must verify nonce consumption and approval.
-- OWNER-ONLY authority is deliberately NOT pre-seeded by migration.
-- A separate verified and audited privileged operation must pin exactly
-- one already-existing owner Supabase Auth UUID after the production P3
-- owner sign-in. Admin role ALONE must not approve any Pit account.
CREATE TABLE IF NOT EXISTS public.prediction_pit_owner_authority (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton=true),
 owner_auth_user_id uuid NOT NULL,
 verified_at timestamptz NOT NULL,
 verification_ref text NOT NULL CHECK(length(verification_ref)>=8)
);
ALTER TABLE public.prediction_pit_owner_authority ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.prediction_pit_owner_authority
 FROM PUBLIC,anon,authenticated;
-- No SQL seed, no user-provided email inference, no automatic admin promotion.

CREATE TABLE IF NOT EXISTS public.prediction_pit_access (
 member_id uuid PRIMARY KEY REFERENCES public.members(id) ON DELETE RESTRICT,
 approved boolean NOT NULL DEFAULT false,
 age_verified boolean NOT NULL DEFAULT false,
 approved_by uuid,
 approved_at timestamptz,
 revoked_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK (NOT approved OR (age_verified AND approved_by IS NOT NULL AND approved_at IS NOT NULL))
);
ALTER TABLE public.prediction_pit_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prediction_pit_access FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.prediction_pit_access FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.pit_member_handoff_authorized(p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog','extensions','pg_temp'
AS $pit_approval$
DECLARE
  approved_member uuid;
BEGIN
  IF p_token IS NULL OR p_token !~ '^[0-9a-f]{64}$' THEN
    RETURN jsonb_build_object('allowed',false);
  END IF;
  SELECT s.member_id INTO approved_member
   FROM public.club_member_sessions s
   JOIN public.members m ON m.id=s.member_id
   JOIN public.prediction_pit_access a ON a.member_id=m.id
   WHERE s.token_hash=encode(extensions.digest(p_token,'sha256'),'hex')
     AND s.expires_at > statement_timestamp()
     AND a.approved=true
     AND a.age_verified=true
     AND a.revoked_at IS NULL
   LIMIT 1;
  IF approved_member IS NULL THEN
    RETURN jsonb_build_object('allowed',false);
  END IF;
  RETURN jsonb_build_object('allowed',true,'member_id',approved_member);
END;
$pit_approval$;
REVOKE ALL ON FUNCTION public.pit_member_handoff_authorized(text) FROM PUBLIC,authenticated;
-- Authenticated club visitors may use legacy password/HttpOnly sessions.
-- The issuer server alone performs the resulting signing step and rate limiting.
GRANT EXECUTE ON FUNCTION public.pit_member_handoff_authorized(text) TO anon;

-- Owner access-control writes use the EXISTING GM4WD admin role function.
-- No direct anon/authenticated INSERT, UPDATE or SELECT table grants.
CREATE OR REPLACE FUNCTION public.pit_owner_set_member_access(
 p_member uuid, p_approved boolean, p_age_verified boolean
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog','pg_temp'
AS $owner_access$
BEGIN
 IF auth.uid() IS NULL OR
    auth.uid() IS DISTINCT FROM (
      SELECT owner_auth_user_id FROM public.prediction_pit_owner_authority
      WHERE singleton=true
    ) OR NOT public.has_staff_role(ARRAY['admin']::public.staff_role[]) THEN
   RAISE EXCEPTION 'Owner approval required' USING errcode='42501';
 END IF;
 IF p_member IS NULL OR p_approved IS NULL OR p_age_verified IS NULL
    OR (p_approved AND NOT p_age_verified) THEN
   RAISE EXCEPTION 'Incomplete or underage access approval' USING errcode='22023';
 END IF;
 INSERT INTO public.prediction_pit_access(
    member_id,approved,age_verified,approved_by,approved_at,revoked_at)
 VALUES(p_member,p_approved,p_age_verified,auth.uid(),
   CASE WHEN p_approved THEN now() ELSE NULL END,
   CASE WHEN p_approved THEN NULL ELSE now() END)
 ON CONFLICT(member_id) DO UPDATE SET
   approved=EXCLUDED.approved,age_verified=EXCLUDED.age_verified,
   approved_by=EXCLUDED.approved_by,approved_at=EXCLUDED.approved_at,
   revoked_at=EXCLUDED.revoked_at,updated_at=now();
 RETURN true;
END;
$owner_access$;
REVOKE ALL ON FUNCTION public.pit_owner_set_member_access(uuid,boolean,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.pit_owner_set_member_access(uuid,boolean,boolean) TO authenticated;

-- P0 SSO STAGING CONTRACT ONLY — DO NOT APPLY TO HOSTED SUPABASE.
-- Requires an authenticated/approved GM4WD member session at the issuer,
-- server-side HS256 verification on Pit, and a trusted service-role server
-- adapter. This routine DOES NOT verify cryptographic signatures, approvals,
-- create new players, change auth sessions, or grant wallet permissions.
-- Only the trusted server may call this after verifying a 60-second ticket.
-- Existing wallet owners MUST be verified/linked out of band, never by email.
CREATE TABLE pp.p0_handoff_redemptions (
  nonce_hash text PRIMARY KEY CHECK (nonce_hash ~ '^[a-f0-9]{64}$'),
  member_id uuid NOT NULL,
  player_id uuid NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE pp.p0_handoff_redemptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON pp.p0_handoff_redemptions FROM PUBLIC, anon, authenticated;
GRANT SELECT,INSERT ON pp.p0_handoff_redemptions TO service_role;

CREATE OR REPLACE FUNCTION pp.p0_redeem_verified_handoff(
 p_member uuid, p_nonce_hash text, p_expires_at timestamptz
) RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER
SET search_path TO 'pg_catalog','pg_temp'
AS $p0_handoff$
DECLARE
 player uuid;
 match_count integer;
 accepted uuid;
BEGIN
 IF p_member IS NULL OR p_nonce_hash IS NULL
    OR p_nonce_hash !~ '^[a-f0-9]{64}$'
    OR p_expires_at IS NULL OR p_expires_at <= clock_timestamp()
    OR p_expires_at > clock_timestamp()+interval '60 seconds' THEN
   RAISE EXCEPTION 'Invalid or expired handoff' USING errcode='42501';
 END IF;

 -- The existing member->Pit linkage must be explicitly verified beforehand.
 -- No creation, no silent relink, no email lookup, no resetting wallets.
 SELECT count(*)::integer,min(id) INTO match_count,player
   FROM pp.players WHERE member_id=p_member;
 IF match_count<>1 THEN
   RAISE EXCEPTION 'Verified Pit identity link missing or ambiguous'
     USING errcode='42501';
 END IF;

 -- Atomic uniqueness: simultaneous claims can only redeem once.
 INSERT INTO pp.p0_handoff_redemptions(
   nonce_hash,member_id,player_id,expires_at)
 VALUES(p_nonce_hash,p_member,player,p_expires_at)
 ON CONFLICT(nonce_hash) DO NOTHING
 RETURNING player_id INTO accepted;
 IF accepted IS NULL THEN
   RAISE EXCEPTION 'Handoff already redeemed' USING errcode='42501';
 END IF;
 RETURN accepted;
END;
$p0_handoff$;
REVOKE ALL ON FUNCTION pp.p0_redeem_verified_handoff(uuid,text,timestamptz)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION pp.p0_redeem_verified_handoff(uuid,text,timestamptz)
 TO service_role;

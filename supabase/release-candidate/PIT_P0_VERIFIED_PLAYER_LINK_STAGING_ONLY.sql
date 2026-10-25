-- STAGING-ONLY, not applied to hosted Prediction Pit.
-- Manual verified GM4WD member -> existing Pit player -> existing Supabase
-- Auth user UUID. No email/name/phone matching. Owner must independently
-- verify account control and preserve all historic wallets/tickets.
--
-- This ledger is NOT populated by migration. Until owner-verification evidence
-- has been reconciled under release supervision, every redemption fails closed.
CREATE TABLE pp.p0_verified_player_links(
 member_id uuid PRIMARY KEY,
 player_id uuid NOT NULL UNIQUE REFERENCES pp.players(id) ON DELETE RESTRICT,
 auth_user_id uuid NOT NULL UNIQUE,
 status text NOT NULL DEFAULT 'verified'
   CHECK(status IN ('verified','revoked')),
 verified_by uuid NOT NULL,
 verified_at timestamptz NOT NULL,
 evidence_ref text NOT NULL CHECK(length(evidence_ref)>=12),
 revoked_at timestamptz,
 CHECK ((status='verified' AND revoked_at IS NULL)
   OR (status='revoked' AND revoked_at IS NOT NULL))
);
ALTER TABLE pp.p0_verified_player_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE pp.p0_verified_player_links FROM PUBLIC,anon,authenticated;
GRANT SELECT ON TABLE pp.p0_verified_player_links TO service_role;

-- A signed ticket is not sufficient: trusted SQL must see a verified,
-- unrevoked record matching BOTH the player member_id AND its immutable,
-- existing Supabase Auth account ID. Unique member/player/user keys prevent
-- a single wallet from silently changing owner.
CREATE OR REPLACE FUNCTION pp.p0_redeem_verified_handoff(
 p_member uuid, p_nonce_hash text, p_expires_at timestamptz
) RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER
SET search_path TO 'pg_catalog','pg_temp'
AS $p0_verified_link$
DECLARE
 player uuid;
 match_count integer;
 accepted uuid;
BEGIN
 IF p_member IS NULL OR p_nonce_hash IS NULL
    OR p_nonce_hash !~ '^[a-f0-9]{64}$'
    OR p_expires_at IS NULL OR p_expires_at<=clock_timestamp()
    OR p_expires_at>clock_timestamp()+interval '60 seconds' THEN
   RAISE EXCEPTION 'Invalid or expired handoff' USING errcode='42501';
 END IF;
 SELECT count(*)::integer,(array_agg(p.id))[1] INTO match_count,player
 FROM pp.players p
 JOIN pp.p0_verified_player_links l
   ON l.player_id=p.id AND l.member_id=p.member_id
   AND l.auth_user_id=p.auth_user_id
 WHERE p.member_id=p_member
   AND p.auth_user_id IS NOT NULL
   AND l.status='verified' AND l.revoked_at IS NULL;
 IF match_count<>1 THEN
   RAISE EXCEPTION 'Existing member/player/Auth identity not verified'
     USING errcode='42501';
 END IF;

 INSERT INTO pp.p0_handoff_redemptions(nonce_hash,member_id,player_id,expires_at)
 VALUES(p_nonce_hash,p_member,player,p_expires_at)
 ON CONFLICT(nonce_hash) DO NOTHING
 RETURNING player_id INTO accepted;
 IF accepted IS NULL THEN
   RAISE EXCEPTION 'Handoff already redeemed' USING errcode='42501';
 END IF;
 RETURN accepted;
END;
$p0_verified_link$;

REVOKE ALL ON FUNCTION pp.p0_redeem_verified_handoff(uuid,text,timestamptz)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION pp.p0_redeem_verified_handoff(uuid,text,timestamptz)
 TO service_role;

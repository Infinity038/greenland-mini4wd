-- Disposable PostgreSQL 17 only, never run on hosted GM4WD/Pit.
\set ON_ERROR_STOP on
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role BYPASSRLS NOLOGIN;
CREATE SCHEMA pp;
GRANT USAGE ON SCHEMA pp TO service_role;
CREATE TABLE pp.players(
 id uuid PRIMARY KEY, member_id uuid, auth_user_id uuid
);
CREATE TABLE pp.wallet_accounts(
 player_id uuid,kind text,balance bigint
);
-- Existing legacy owner has a valuable wallet but is NOT verified to a
-- GM4WD member yet. Tests must never attach this account by email.
INSERT INTO pp.players(id,member_id) VALUES
('11111111-1111-4111-8111-111111111111',NULL),
('22222222-2222-4222-8222-222222222222','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
INSERT INTO pp.wallet_accounts VALUES
('11111111-1111-4111-8111-111111111111','available',8000),
('22222222-2222-4222-8222-222222222222','available',100);
GRANT SELECT ON pp.players TO service_role;
-- Synthetic verified existing Auth user, never created from a member email.
UPDATE pp.players
  SET auth_user_id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
  WHERE id='22222222-2222-4222-8222-222222222222';
\i supabase/release-candidate/PIT_P0_SSO_ONE_USE_REDEMPTION_STAGING_ONLY.sql
\i supabase/release-candidate/PIT_P0_VERIFIED_PLAYER_LINK_STAGING_ONLY.sql

-- A member_id on a Pit player does NOT by itself prove wallet ownership.
DO $link_missing$ BEGIN
 BEGIN
  PERFORM pp.p0_redeem_verified_handoff(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    repeat('a',64),clock_timestamp()+interval '30 seconds');
  RAISE EXCEPTION 'Missing explicit owner identity verification was bypassed';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 IF (SELECT count(*) FROM pp.p0_handoff_redemptions)<>0 THEN
   RAISE EXCEPTION 'Unverified member issued a session claim';
 END IF;
END $link_missing$;
-- Synthetic *manual* owner verified evidence; no such rows inserted
-- by the staging migration or any hosted production change.
INSERT INTO pp.p0_verified_player_links(
 member_id,player_id,auth_user_id,status,verified_by,verified_at,evidence_ref)
VALUES('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 '22222222-2222-4222-8222-222222222222',
 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
 'verified','ffffffff-ffff-4fff-8fff-ffffffffffff',
 now(),'SYNTHETIC_OWNER_VERIFIED_CI_ONLY');

DO $test$
DECLARE n int;
BEGIN
 SELECT count(*) INTO n FROM pp.wallet_accounts;
 IF n<>2 THEN RAISE EXCEPTION 'Fixture wallets missing'; END IF;
 IF has_table_privilege('anon','pp.p0_handoff_redemptions','SELECT') OR
    has_table_privilege('authenticated','pp.p0_handoff_redemptions','INSERT') OR
    has_function_privilege('anon',
      'pp.p0_redeem_verified_handoff(uuid,text,timestamptz)'::regprocedure,'EXECUTE') OR
    has_function_privilege('authenticated',
      'pp.p0_redeem_verified_handoff(uuid,text,timestamptz)'::regprocedure,'EXECUTE') THEN
    RAISE EXCEPTION 'Anonymous or member role has access to redemption';
 END IF;
 IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid='pp.p0_handoff_redemptions'::regclass)
 THEN RAISE EXCEPTION 'One-use table lacks RLS'; END IF;
 BEGIN
   PERFORM pp.p0_redeem_verified_handoff(
     'ffffffff-ffff-4fff-8fff-ffffffffffff',
     repeat('a',64),clock_timestamp()+interval '30 seconds');
   RAISE EXCEPTION 'Unverified member was auto-created';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 BEGIN
   PERFORM pp.p0_redeem_verified_handoff(
     'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
     repeat('b',64),clock_timestamp()-interval '1 second');
   RAISE EXCEPTION 'Expired ticket accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 BEGIN
   PERFORM pp.p0_redeem_verified_handoff(
     'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
     repeat('c',64),clock_timestamp()+interval '70 seconds');
   RAISE EXCEPTION 'Overlong ticket accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 BEGIN
   PERFORM pp.p0_redeem_verified_handoff(
     'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
     'raw-token-not-a-hash',clock_timestamp()+interval '30 seconds');
   RAISE EXCEPTION 'Unsigned/invalid nonce accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 IF (SELECT count(*) FROM pp.p0_handoff_redemptions)<>0
   OR (SELECT sum(balance) FROM pp.wallet_accounts)<>8100
   OR (SELECT count(*) FROM pp.players WHERE member_id IS NULL)<>1
 THEN RAISE EXCEPTION 'Denial mutated wallet, legacy owner identity or claim inventory'; END IF;
END $test$;

-- Even a previously verified link is revoked immediately without
-- altering existing wallet balance or its original owner.
UPDATE pp.p0_verified_player_links SET status='revoked',revoked_at=now();
DO $link_revoked$ BEGIN
 BEGIN
  PERFORM pp.p0_redeem_verified_handoff(
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  repeat('e',64),clock_timestamp()+interval '30 seconds');
  RAISE EXCEPTION 'Revoked identity link bypassed';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 IF (SELECT count(*) FROM pp.p0_handoff_redemptions)<>0 THEN
   RAISE EXCEPTION 'Revocation changed nonce inventory';
 END IF;
END $link_revoked$;
UPDATE pp.p0_verified_player_links
 SET status='verified',revoked_at=NULL;

CREATE FUNCTION pp.test_slow_claim() RETURNS trigger LANGUAGE plpgsql AS $tr$
BEGIN
 PERFORM pg_sleep(1.2);
 RETURN NEW;
END $tr$;
CREATE TRIGGER test_handoff_race BEFORE INSERT ON pp.p0_handoff_redemptions
 FOR EACH ROW EXECUTE FUNCTION pp.test_slow_claim();

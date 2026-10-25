-- Disposable PostgreSQL 17 test only; NEVER run on live Supabase projects.
\set ON_ERROR_STOP on
BEGIN;
CREATE SCHEMA auth;
CREATE SCHEMA pp;
CREATE TABLE pp.mcl_seasons(id uuid PRIMARY KEY,starts_at timestamptz,status text);
CREATE TABLE pp.mcl_markets(
 id uuid PRIMARY KEY,season_id uuid,race_id uuid,kind text,cap integer,status text);
CREATE TABLE pp.ledger(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,balance_after bigint);
CREATE TABLE pp.mcl_tickets(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 market_id uuid,player_id uuid,outcome text,stake bigint,weight integer,cap integer,
 status text DEFAULT 'active',idem text,stake_ledger_id bigint);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS
 $$SELECT '00000000-0000-0000-0000-000000000007'::uuid$$;
CREATE FUNCTION pp._require_allowed() RETURNS void LANGUAGE plpgsql AS $mock_void$ BEGIN NULL; END $mock_void$;
CREATE FUNCTION pp._require_game(text) RETURNS void LANGUAGE plpgsql AS $mock_void$ BEGIN NULL; END $mock_void$;
CREATE FUNCTION pp._player_of(uuid) RETURNS uuid LANGUAGE sql AS
 $$SELECT '00000000-0000-0000-0000-000000000008'::uuid$$;
CREATE FUNCTION pp._mcl_market_open(uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT true $$;
CREATE FUNCTION pp._mcl_check_outcome(uuid,text) RETURNS void LANGUAGE plpgsql AS $mock_void$ BEGIN NULL; END $mock_void$;
CREATE FUNCTION pp._mcl_weight(timestamptz) RETURNS integer LANGUAGE sql AS $$SELECT 1$$;
CREATE FUNCTION pp._mcl_estimate(uuid,text,bigint,integer,integer)
 RETURNS numeric LANGUAGE sql AS $$SELECT 0.4::numeric$$;
CREATE FUNCTION pp.game_stake(text,text,bigint,text)
 RETURNS pp.ledger LANGUAGE plpgsql AS $mock$
 DECLARE l pp.ledger;
 BEGIN
 INSERT INTO pp.ledger(balance_after) VALUES (1000) RETURNING * INTO l;
 RETURN l;
 END; $mock$;
\i supabase/release-candidate/PIT_P0_MCL_STAKE_CAPS_STAGING_ONLY.sql

INSERT INTO pp.mcl_seasons(id,status,starts_at) VALUES
('00000000-0000-0000-0000-000000000001','preseason',NOW()+interval '4 days'),
('00000000-0000-0000-0000-000000000002','preseason',NOW()+interval '4 days');
INSERT INTO pp.mcl_markets VALUES
('00000000-0000-0000-0000-000000000101','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000401','winner',2,'open'),
('00000000-0000-0000-0000-000000000102','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000401','position',3,'open'),
('00000000-0000-0000-0000-000000000103','00000000-0000-0000-0000-000000000001',NULL,'champion',8,'open'),
('00000000-0000-0000-0000-000000000104','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000402','winner',2,'open'),
('00000000-0000-0000-0000-000000000105','00000000-0000-0000-0000-000000000002',NULL,'champion',8,'open');

-- Two different markets in the same race must aggregate to 100.
SELECT pp.mcl_place_ticket('00000000-0000-0000-0000-000000000101','M1',50,'race50-one');
SELECT pp.mcl_place_ticket('00000000-0000-0000-0000-000000000102','M1:1',50,'race50-two');
DO $$
DECLARE prior int;
BEGIN
 SELECT count(*) INTO prior FROM pp.ledger;
 BEGIN
 PERFORM pp.mcl_place_ticket('00000000-0000-0000-0000-000000000101','M2',1,'race-over100');
 RAISE EXCEPTION 'P0 aggregate limit unexpectedly accepted';
 EXCEPTION WHEN check_violation THEN NULL;
 END;
 IF (SELECT count(*) FROM pp.ledger)<>prior THEN
   RAISE EXCEPTION 'wallet was debited on denied ticket';
 END IF;
 BEGIN
 PERFORM pp.mcl_place_ticket('00000000-0000-0000-0000-000000000101','M3',51,'race-over-ticket');
 RAISE EXCEPTION 'P0 per-ticket limit unexpectedly accepted';
 EXCEPTION WHEN check_violation THEN NULL;
 END;
 IF (SELECT count(*) FROM pp.ledger)<>prior THEN
   RAISE EXCEPTION 'wallet was debited on denied per-ticket';
 END IF;
END $$;

-- Idempotent replay preserves one accepted ticket and one stake debit.
DO $$
DECLARE prior int; replay jsonb;
BEGIN
 SELECT count(*) INTO prior FROM pp.ledger;
 replay:=pp.mcl_place_ticket('00000000-0000-0000-0000-000000000101','M1',50,'race50-one');
 IF replay->>'replay' <> 'true' OR (SELECT count(*) FROM pp.ledger)<>prior THEN
  RAISE EXCEPTION 'idempotent retry credited/debited again';
 END IF;
END $$;

-- Four champion selections at 25; a fifth across the season is denied.
SELECT pp.mcl_place_ticket('00000000-0000-0000-0000-000000000103','M1',25,'champion-1');
SELECT pp.mcl_place_ticket('00000000-0000-0000-0000-000000000103','M2',25,'champion-2');
SELECT pp.mcl_place_ticket('00000000-0000-0000-0000-000000000103','M3',25,'champion-3');
SELECT pp.mcl_place_ticket('00000000-0000-0000-0000-000000000103','M4',25,'champion-4');
DO $$
DECLARE prior int;
BEGIN
 SELECT count(*) INTO prior FROM pp.ledger;
 BEGIN
 PERFORM pp.mcl_place_ticket('00000000-0000-0000-0000-000000000103','M5',1,'champion-5');
 RAISE EXCEPTION 'champion season 100 exceeded';
 EXCEPTION WHEN check_violation THEN NULL;
 END;
 IF (SELECT count(*) FROM pp.ledger)<>prior THEN
 RAISE EXCEPTION 'wallet was debited on champion decline';
 END IF;
END $$;

-- Different race/season has its own player cap.
SELECT pp.mcl_place_ticket('00000000-0000-0000-0000-000000000104','M1',50,'different-race');
SELECT pp.mcl_place_ticket('00000000-0000-0000-0000-000000000105','M1',25,'different-season');

DO $$
BEGIN
 IF (SELECT count(*) FROM pp.ledger)<>8 OR (SELECT count(*) FROM pp.mcl_tickets)<>8 THEN
  RAISE EXCEPTION 'fixture accepted stakes mismatched';
 END IF;
END $$;
ROLLBACK;

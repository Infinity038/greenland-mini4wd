-- Disposable PostgreSQL 17 test only; NEVER run on live Supabase projects.
\set ON_ERROR_STOP on
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


-- Seed 50 4W already accepted in Winner before concurrent cross-market requests.
SELECT pp.mcl_place_ticket(
 '00000000-0000-0000-0000-000000000101','M1',50,'seed-race-50');

-- Force worker A's ticket INSERT to hold its player/race lock while
-- worker B enters a different market of the SAME race.
CREATE FUNCTION pp.p0_test_delayed_insert() RETURNS trigger
LANGUAGE plpgsql AS $hold$ BEGIN
 PERFORM pg_sleep(1.5);
 RETURN NEW;
END $hold$;
CREATE TRIGGER p0_delayed_accept BEFORE INSERT ON pp.mcl_tickets
FOR EACH ROW EXECUTE FUNCTION pp.p0_test_delayed_insert();

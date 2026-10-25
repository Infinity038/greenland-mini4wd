-- Pure disposable PostgreSQL 16 smoke harness. NEVER run against Supabase.
-- Local CI database contains synthetic MCL records only. No live IDs, wallets or auth.
\set ON_ERROR_STOP on
BEGIN;
CREATE SCHEMA auth;
CREATE SCHEMA pp;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT NULL::uuid $$;
CREATE TABLE pp.mcl_seasons(id uuid PRIMARY KEY,status text,champion text,completed_at timestamptz);
CREATE TABLE pp.mcl_marbles(season_id uuid,marble_id text,color text);
CREATE TABLE pp.mcl_races(id uuid DEFAULT gen_random_uuid(),season_id uuid,phase text,status text,lineup jsonb,result jsonb);
CREATE TABLE pp.mcl_markets(id uuid DEFAULT gen_random_uuid(),season_id uuid,kind text,status text);
CREATE TABLE pp.audit(actor uuid,action text,detail jsonb);
CREATE FUNCTION pp._require_admin() RETURNS void LANGUAGE plpgsql AS $$ BEGIN NULL; END $$;
CREATE FUNCTION pp._mcl_settle_market(uuid,text[],jsonb) RETURNS jsonb LANGUAGE sql
 AS $$ SELECT '{"paid":0}'::jsonb $$;

-- Install only the staged candidate into our disposable mock schema.
\i supabase/release-candidate/PIT_P0_MCL_CHAMPION_GUARD_STAGING_ONLY.sql

INSERT INTO pp.mcl_seasons(id,status) VALUES ('00000000-0000-0000-0000-000000000001','live');
INSERT INTO pp.mcl_marbles(season_id,marble_id,color)
 SELECT '00000000-0000-0000-0000-000000000001'::uuid,'M'||n,'C'||((n-1)/4+1)
 FROM generate_series(1,24) n;

-- Each of 40 regular races contains one marble of each color.
INSERT INTO pp.mcl_races(season_id,phase,status,lineup,result)
 SELECT '00000000-0000-0000-0000-000000000001','regular','settled',
 '["M1","M5","M9","M13","M17","M21"]'::jsonb,
 '["M1","M5","M9","M13","M17","M21"]'::jsonb
 FROM generate_series(1,40);
INSERT INTO pp.mcl_races(season_id,phase,status,lineup,result) VALUES
 ('00000000-0000-0000-0000-000000000001','playoff','settled','["M1","M2","M3","M4","M5","M6"]','["M1","M2","M3","M4","M5","M6"]'),
 ('00000000-0000-0000-0000-000000000001','playoff','settled','["M7","M8","M9","M10","M11","M12"]','["M7","M8","M9","M10","M11","M12"]'),
 ('00000000-0000-0000-0000-000000000001','final','settled','["M1","M2","M3","M7","M8","M9"]','["M1","M2","M3","M7","M8","M9"]');
INSERT INTO pp.mcl_markets(season_id,kind,status)
 SELECT '00000000-0000-0000-0000-000000000001',v.kind,'settled'
 FROM pp.mcl_races r CROSS JOIN (VALUES('winner'),('position')) v(kind)
 WHERE r.season_id='00000000-0000-0000-0000-000000000001';
INSERT INTO pp.mcl_markets(season_id,kind,status)
 VALUES ('00000000-0000-0000-0000-000000000001','champion','locked');

CREATE FUNCTION pg_temp.expect_reject(expected text) RETURNS void LANGUAGE plpgsql AS $fn$
DECLARE reason text;
BEGIN
  BEGIN
    PERFORM pp.mcl_settle_champion(
      '00000000-0000-0000-0000-000000000001','M1','[]'::jsonb);
    RAISE EXCEPTION 'UNEXPECTED SUCCESS (expecting %)',expected;
  EXCEPTION WHEN SQLSTATE '22023' THEN
    GET STACKED DIAGNOSTICS reason=MESSAGE_TEXT;
    IF reason IS DISTINCT FROM expected THEN
      RAISE EXCEPTION 'Expected "%", got "%"',expected,reason;
    END IF;
  END;
END $fn$;

-- An incomplete race blocks settlement without modifying anything.
UPDATE pp.mcl_races SET status='open' WHERE phase='final';
SELECT pg_temp.expect_reject('all race results must be settled six-place arrays');
UPDATE pp.mcl_races SET status='settled' WHERE phase='final';

-- All six colors must have four marbles, even with 24 total.
UPDATE pp.mcl_marbles SET color='C1' WHERE marble_id='M24';
SELECT pg_temp.expect_reject('P0 requires exactly four marbles in each of six colors');
UPDATE pp.mcl_marbles SET color='C6' WHERE marble_id='M24';

-- A regular heat cannot include 2 marbles of the same color.
UPDATE pp.mcl_races
 SET lineup='["M1","M2","M9","M13","M17","M21"]',
     result='["M1","M2","M9","M13","M17","M21"]'
 WHERE phase='regular';
SELECT pg_temp.expect_reject('each regular race must have one marble from each color');
UPDATE pp.mcl_races
 SET lineup='["M1","M5","M9","M13","M17","M21"]',
     result='["M1","M5","M9","M13","M17","M21"]'
 WHERE phase='regular';

-- Existing markets must have completed settlement.
UPDATE pp.mcl_markets SET status='open' WHERE kind='position';
SELECT pg_temp.expect_reject('all 86 race markets must settle before champion market');
UPDATE pp.mcl_markets SET status='settled' WHERE kind='position';

-- Correct champion must win the final.
DO $fn$ BEGIN
  BEGIN
    PERFORM pp.mcl_settle_champion(
      '00000000-0000-0000-0000-000000000001','M9','[]'::jsonb);
    RAISE EXCEPTION 'UNEXPECTED WRONG CHAMPION SUCCESS';
  EXCEPTION WHEN SQLSTATE '22023' THEN
    NULL;
  END;
END $fn$;

-- Once all prerequisites are met, one settlement is recorded.
DO $fn$ DECLARE out jsonb;
BEGIN
  out:=pp.mcl_settle_champion(
    '00000000-0000-0000-0000-000000000001','M1','[]'::jsonb);
  IF out->>'status'<>'settled' THEN RAISE EXCEPTION 'Expected settled: %',out; END IF;
  IF (SELECT status FROM pp.mcl_seasons WHERE id='00000000-0000-0000-0000-000000000001')<>'complete'
  THEN RAISE EXCEPTION 'Season not completed'; END IF;
  IF (SELECT COUNT(*) FROM pp.audit WHERE action='mcl_settle_champion')<>1
  THEN RAISE EXCEPTION 'Wrong audit count'; END IF;
  out:=pp.mcl_settle_champion(
    '00000000-0000-0000-0000-000000000001','M1','[]'::jsonb);
  IF out->>'status'<>'already_settled' THEN RAISE EXCEPTION 'Expected idempotency replay: %',out; END IF;
END $fn$;
ROLLBACK;

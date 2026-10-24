-- Mini4WD disposable PostgreSQL 17 admission smoke. NO real user or wallet data.
\set ON_ERROR_STOP on
BEGIN;
CREATE ROLE anon; CREATE ROLE authenticated;
CREATE SCHEMA auth; CREATE SCHEMA pp;
CREATE TABLE pp.m4_heats (
 id uuid PRIMARY KEY, mode text NOT NULL, status text NOT NULL,
 result jsonb,opened_at timestamptz,locked_at timestamptz);
CREATE TABLE pp.m4_entries (
 id uuid PRIMARY KEY, heat_id uuid NOT NULL,position integer NOT NULL);
CREATE TABLE pp.ledger(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,balance_after bigint);
CREATE TABLE pp.m4_bets (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),heat_id uuid,entry_id uuid,
 player_id uuid,stake bigint,odds numeric,status text DEFAULT 'pending',
 idem text,stake_ledger_id bigint);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS
 $$SELECT '00000000-0000-0000-0000-000000000007'::uuid$$;
CREATE FUNCTION pp._require_allowed() RETURNS void LANGUAGE plpgsql AS $v$ BEGIN NULL; END $v$;
CREATE FUNCTION pp._require_game(text) RETURNS void LANGUAGE plpgsql AS $v$ BEGIN NULL; END $v$;
CREATE FUNCTION pp._player_of(uuid) RETURNS uuid LANGUAGE sql AS
 $$SELECT '00000000-0000-0000-0000-000000000008'::uuid$$;
CREATE FUNCTION pp._m4_quotes(p_heat uuid)
 RETURNS TABLE(entry_id uuid,odds numeric) LANGUAGE sql STABLE AS $q$
 SELECT id,CASE
 WHEN p_heat='00000000-0000-0000-0000-000000000003'::uuid THEN 50
 WHEN p_heat IN (
  '00000000-0000-0000-0000-000000000002'::uuid,
  '00000000-0000-0000-0000-000000000004'::uuid,
  '00000000-0000-0000-0000-000000000005'::uuid,
  '00000000-0000-0000-0000-000000000006'::uuid)
 THEN 40 ELSE 2 END::numeric(8,2)
 FROM pp.m4_entries WHERE heat_id=p_heat ORDER BY position;
$q$;
CREATE FUNCTION pp.game_stake(text,text,bigint,text)
 RETURNS pp.ledger LANGUAGE plpgsql AS $mock$
 DECLARE l pp.ledger;
 BEGIN INSERT INTO pp.ledger(balance_after) VALUES (1000) RETURNING * INTO l;
 RETURN l; END $mock$;

CREATE FUNCTION pp._require_admin() RETURNS void
 LANGUAGE plpgsql AS $v$ BEGIN NULL; END $v$;
CREATE TABLE pp.audit(actor uuid,action text,detail jsonb);
CREATE TABLE pp.mock_game_settlements (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, ref_type text,ref_id text,total bigint
);
CREATE FUNCTION pp.game_settle(p_ref_type text,p_ref_id text,p_result_version integer,p_payouts jsonb,p_max_total bigint)
 RETURNS jsonb LANGUAGE plpgsql AS $mock_settle$
DECLARE total bigint;
BEGIN
 SELECT COALESCE(sum((e->>'amount')::bigint),0) INTO total
 FROM jsonb_array_elements(p_payouts) AS e;
 IF total>p_max_total THEN RAISE EXCEPTION 'invalid funded settlement'; END IF;
 INSERT INTO pp.mock_game_settlements(ref_type,ref_id,total) VALUES(p_ref_type,p_ref_id,total);
 RETURN jsonb_build_object('total_paid',total);
END $mock_settle$;
\i supabase/release-candidate/PIT_P0_MINI4WD_ADMISSION_GUARD_STAGING_ONLY.sql
\i supabase/release-candidate/PIT_P0_MINI4WD_SETTLEMENT_RESERVE_STAGING_ONLY.sql

-- Six entrants per heat, all synthetic, no historic bettor identities.
INSERT INTO pp.m4_heats(id,mode,status)
 SELECT ('00000000-0000-0000-0000-'||lpad(h::text,12,'0'))::uuid,
 CASE WHEN h=4 THEN 'podium' ELSE 'win' END,
 'open'
 FROM generate_series(1,7) h;
INSERT INTO pp.m4_entries(id,heat_id,position)
 SELECT ('10000000-0000-0000-'||lpad(h::text,4,'0')||'-'||lpad(n::text,12,'0'))::uuid,
 ('00000000-0000-0000-0000-'||lpad(h::text,12,'0'))::uuid,
 n
 FROM generate_series(1,7) h CROSS JOIN generate_series(1,6) n;

-- No real funding record is seeded by the release-candidate migration.
DO $x$ DECLARE before_n int;
BEGIN
 SELECT count(*) INTO before_n FROM pp.ledger;
 BEGIN
   PERFORM pp.m4_place_bet(
   '00000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0001-000000000001',25,2,'no-reserve-0001');
   RAISE EXCEPTION 'Missing reserve accepted a ticket';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 IF (SELECT count(*) FROM pp.ledger)<>before_n THEN
   RAISE EXCEPTION 'Failed closed reserve still debited a wallet';
 END IF;
END $x$;

-- Synthetic test-only operator backing, NOT a migration and not actual funds.
INSERT INTO pp.p0_operator_reserve(scope,tier,settled_free_reserve,earmarked_other_liabilities,verified_source_ref,verified_at,enabled)
VALUES('mini4wd',1,30000,0,'SYNTHETIC_CI_ONLY',now(),true);

-- Four tickets x25 for one player; 5th must reject. Quoted odds exactly 2x.
SELECT pp.m4_place_bet(
 '00000000-0000-0000-0000-000000000001',
 '10000000-0000-0000-0001-000000000001',25,2,'h1-stake-first-0001');
SELECT pp.m4_place_bet(
 '00000000-0000-0000-0000-000000000001',
 '10000000-0000-0000-0001-000000000002',25,2,'h1-stake-second0002');
SELECT pp.m4_place_bet(
 '00000000-0000-0000-0000-000000000001',
 '10000000-0000-0000-0001-000000000003',25,2,'h1-stake-third-0003');
SELECT pp.m4_place_bet(
 '00000000-0000-0000-0000-000000000001',
 '10000000-0000-0000-0001-000000000004',25,2,'h1-stake-fourth0004');
DO $x$ DECLARE before_n int;
BEGIN
 SELECT count(*) INTO before_n FROM pp.ledger;
 BEGIN
   PERFORM pp.m4_place_bet(
     '00000000-0000-0000-0000-000000000001',
     '10000000-0000-0000-0001-000000000005',1,2,'h1-fifth-ticket0005');
   RAISE EXCEPTION 'Player heat 100 limit bypassed';
 EXCEPTION WHEN check_violation THEN NULL;
 END;
 BEGIN
   PERFORM pp.m4_place_bet(
     '00000000-0000-0000-0000-000000000001',
     '10000000-0000-0000-0001-000000000005',26,2,'h1-over-ticket0006');
   RAISE EXCEPTION '25 ticket limit bypassed';
 EXCEPTION WHEN check_violation THEN NULL;
 END;
 IF (SELECT count(*) FROM pp.ledger)<>before_n THEN
   RAISE EXCEPTION 'Rejected ticket debited wallet';
 END IF;
END $x$;

-- Event-level worst-case loss of 25x50-25=1225 >1000.
DO $x$ DECLARE before_n int;
BEGIN
 SELECT count(*) INTO before_n FROM pp.ledger;
 BEGIN
  PERFORM pp.m4_place_bet(
  '00000000-0000-0000-0000-000000000003',
  '10000000-0000-0000-0003-000000000001',25,50,'bad-event-risk0003');
  RAISE EXCEPTION '1000 event limit bypassed';
 EXCEPTION WHEN check_violation THEN NULL;
 END;
 IF (SELECT count(*) FROM pp.ledger)<>before_n THEN
  RAISE EXCEPTION 'Rejected event-risk ticket debited wallet';
 END IF;
END $x$;

-- Three independent high-risk heats 25x40=1000 gross each (975 net).
SELECT pp.m4_place_bet(
 '00000000-0000-0000-0000-000000000002',
 '10000000-0000-0000-0002-000000000001',25,40,'combined-heat-0002');
SELECT pp.m4_place_bet(
 '00000000-0000-0000-0000-000000000004',
 '10000000-0000-0000-0004-000000000001',25,40,'combined-heat-0004');
SELECT pp.m4_place_bet(
 '00000000-0000-0000-0000-000000000005',
 '10000000-0000-0000-0005-000000000001',25,40,'combined-heat-0005');
DO $x$ DECLARE before_n int;
BEGIN
 SELECT count(*) INTO before_n FROM pp.ledger;
 BEGIN
  PERFORM pp.m4_place_bet(
  '00000000-0000-0000-0000-000000000006',
  '10000000-0000-0000-0006-000000000001',25,40,'combined-over-0006');
  RAISE EXCEPTION '3000 combined downside exceeded';
 EXCEPTION WHEN check_violation THEN NULL;
 END;
 IF (SELECT count(*) FROM pp.ledger)<>before_n THEN
  RAISE EXCEPTION 'Rejected combined-risk ticket debited wallet';
 END IF;
END $x$;

-- Gross coverage binds independently of net limits (3,100 vs 3,000).
-- Heat 7 uses normal 2x quote, creating only 25 net downside, so the
-- combined downside remains under 3,000 while gross coverage fails.
UPDATE pp.p0_operator_reserve SET settled_free_reserve=3000;
DO $x$ DECLARE before_n int; reason text;
BEGIN
 SELECT count(*) INTO before_n FROM pp.ledger;
 BEGIN
  PERFORM pp.m4_place_bet(
   '00000000-0000-0000-0000-000000000007',
   '10000000-0000-0000-0007-000000000001',25,2,'reserve-low-00007');
  RAISE EXCEPTION 'Gross reserve condition bypassed';
 EXCEPTION WHEN check_violation THEN
  GET STACKED DIAGNOSTICS reason=MESSAGE_TEXT;
  IF reason <> 'P0 Mini4WD gross reserve capacity exceeded' THEN
    RAISE EXCEPTION 'Wrong gross risk failure: %',reason;
  END IF;
 END;
 IF (SELECT count(*) FROM pp.ledger)<>before_n THEN
  RAISE EXCEPTION 'Rejected gross-risk ticket debited wallet';
 END IF;
END $x$;
UPDATE pp.p0_operator_reserve SET enabled=false;
DO $x$ DECLARE before_n int;
BEGIN
 SELECT count(*) INTO before_n FROM pp.ledger;
 BEGIN
  PERFORM pp.m4_place_bet(
   '00000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0001-000000000005',1,2,'reserve-off-00008');
  RAISE EXCEPTION 'Disabled reserve bypassed';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 IF (SELECT count(*) FROM pp.ledger)<>before_n THEN
  RAISE EXCEPTION 'Disabled reserve caused a wallet debit';
 END IF;
END $x$;

DO $x$
BEGIN
 IF (SELECT count(*) FROM pp.ledger)<>7 OR (SELECT count(*) FROM pp.m4_bets)<>7 THEN
   RAISE EXCEPTION 'Synthetic accepted bets mismatch';
 END IF;
END $x$;

-- Test official result and organizer void with synthetic operator capacity.
UPDATE pp.p0_operator_reserve SET enabled=true,settled_free_reserve=30000;
UPDATE pp.m4_heats SET status='locked'
 WHERE id IN ('00000000-0000-0000-0000-000000000002',
              '00000000-0000-0000-0000-000000000004');
SELECT pp.m4_settle(
 '00000000-0000-0000-0000-000000000002',
 ARRAY['10000000-0000-0000-0002-000000000001'::uuid]);
DO $x$ BEGIN
 IF (SELECT settled_free_reserve FROM pp.p0_operator_reserve WHERE scope='mini4wd')<>29025
 THEN RAISE EXCEPTION 'Winner payout must debit reserve by 975'; END IF;
END $x$;
-- Replay should leave one settlement and one reserve audit row.
SELECT pp.m4_settle(
 '00000000-0000-0000-0000-000000000002',
 ARRAY['10000000-0000-0000-0002-000000000001'::uuid]);
DO $x$ BEGIN
 IF (SELECT count(*) FROM pp.p0_reserve_movements)<>1 OR
    (SELECT count(*) FROM pp.mock_game_settlements)<>1
 THEN RAISE EXCEPTION 'Winner replay double-counted'; END IF;
END $x$;

-- Organizer void fully refunds 4 x 25 = 100; no reserve profit/loss.
SELECT pp.m4_void('00000000-0000-0000-0000-000000000001');
SELECT pp.m4_void('00000000-0000-0000-0000-000000000001');
DO $x$ BEGIN
 IF (SELECT settled_free_reserve FROM pp.p0_operator_reserve WHERE scope='mini4wd')<>29025
 THEN RAISE EXCEPTION 'Void changed available operator reserve'; END IF;
 IF (SELECT actual_payouts_or_refunds FROM pp.p0_reserve_movements WHERE action='void')<>100
 THEN RAISE EXCEPTION 'Void did not audit full original stakes'; END IF;
 IF (SELECT count(*) FROM pp.p0_reserve_movements)<>2 OR
    (SELECT count(*) FROM pp.mock_game_settlements)<>2
 THEN RAISE EXCEPTION 'Void double-issued refund or movement'; END IF;
END $x$;

-- Top-3 physical race: one winning 40x ticket, two unmatched positions.
SELECT pp.m4_settle(
 '00000000-0000-0000-0000-000000000004',
 ARRAY[
 '10000000-0000-0000-0004-000000000001'::uuid,
 '10000000-0000-0000-0004-000000000002'::uuid,
 '10000000-0000-0000-0004-000000000003'::uuid]);
DO $x$ BEGIN
 IF (SELECT settled_free_reserve FROM pp.p0_operator_reserve WHERE scope='mini4wd')<>28050
 THEN RAISE EXCEPTION 'Top-3 payout did not reduce reserve by 975'; END IF;
 IF (SELECT count(*) FROM pp.p0_reserve_movements)<>3 OR
    (SELECT count(*) FROM pp.mock_game_settlements)<>3
 THEN RAISE EXCEPTION 'Top-3 official settlement missing audit'; END IF;
END $x$;
ROLLBACK;

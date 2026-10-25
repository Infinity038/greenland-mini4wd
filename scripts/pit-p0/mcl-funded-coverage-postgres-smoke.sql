-- Synthetic PostgreSQL 17 complete-winner funded-pot settlement smoke.
-- Database-only, no real player records, credentials or wallet activity.
\set ON_ERROR_STOP on
BEGIN;
CREATE SCHEMA pp;
CREATE TABLE pp.mcl_markets(
 id uuid PRIMARY KEY, kind text,status text,
 cap integer,settlement jsonb,settled_at timestamptz);
CREATE TABLE pp.mcl_tickets(
 id uuid PRIMARY KEY,market_id uuid,player_id uuid,outcome text,
 stake bigint,weight integer,cap integer,status text DEFAULT 'active',payout bigint
);
CREATE TABLE pp.mock_settlements(
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 market_id text, paid bigint);
CREATE FUNCTION pp.game_settle(
 p_ref_type text,p_ref_id text,p_version integer,p_payouts jsonb,p_ceiling bigint)
 RETURNS jsonb LANGUAGE plpgsql AS $mock$
DECLARE amount bigint;
BEGIN
 SELECT coalesce(sum((x->>'amount')::bigint),0) INTO amount
 FROM jsonb_array_elements(p_payouts) AS x;
 IF amount>p_ceiling THEN RAISE EXCEPTION 'Mock over-funded'; END IF;
 INSERT INTO pp.mock_settlements(market_id,paid) VALUES(p_ref_id,amount);
 RETURN jsonb_build_object('paid',amount);
END $mock$;
\i supabase/release-candidate/PIT_P0_MCL_FUNDED_PAYOUT_COVERAGE_STAGING_ONLY.sql
INSERT INTO pp.mcl_markets(id,kind,status,cap) VALUES
 ('00000000-0000-0000-0000-000000000001','winner','locked',2),
 ('00000000-0000-0000-0000-000000000002','winner','locked',2),
 ('00000000-0000-0000-0000-000000000003','winner','locked',2);
INSERT INTO pp.mcl_tickets(id,market_id,player_id,outcome,stake,weight,cap) VALUES
 ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','LOSE',80,1,2),
 ('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002','WIN',10,1,2),
 ('10000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000003','WIN',10,1,2),
 ('10000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000004','LOSE',180,1,2),
 ('10000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000005','WIN',10,1,2),
 ('10000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000006','WIN',10,1,2),
 ('10000000-0000-0000-0000-000000000007','00000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000007','LOSE',100,1,2);

-- An omitted winning ticket is rejected BEFORE settlement/wallet step.
DO $q$ BEGIN
 BEGIN
  PERFORM pp._mcl_settle_market('00000000-0000-0000-0000-000000000001',ARRAY['WIN'],
   '[{"ticket_id":"10000000-0000-0000-0000-000000000002","amount":20}]'::jsonb);
  RAISE EXCEPTION 'Omission incorrectly accepted';
 EXCEPTION WHEN check_violation THEN NULL;
 END;
 IF (SELECT count(*) FROM pp.mock_settlements)<>0
 THEN RAISE EXCEPTION 'Omission wrote settlement'; END IF;
END $q$;

-- Even both winning tickets can be underpaid by an arbitrary operator
-- in hosted code; P0 guard requires all actually distributable 40 coins.
DO $q$ BEGIN
 BEGIN
  PERFORM pp._mcl_settle_market('00000000-0000-0000-0000-000000000001',ARRAY['WIN'],
   '[{"ticket_id":"10000000-0000-0000-0000-000000000002","amount":19},{"ticket_id":"10000000-0000-0000-0000-000000000003","amount":20}]'::jsonb);
  RAISE EXCEPTION 'Underfunding incorrectly accepted';
 EXCEPTION WHEN check_violation THEN NULL;
 END;
 IF (SELECT count(*) FROM pp.mock_settlements)<>0
 THEN RAISE EXCEPTION 'Underfunding wrote settlement'; END IF;
END $q$;

-- Exactly distributable 40: both win, payouts 20 and 20.
DO $q$ DECLARE summary jsonb;
BEGIN
 summary:=pp._mcl_settle_market('00000000-0000-0000-0000-000000000001',ARRAY['WIN'],
   '[{"ticket_id":"10000000-0000-0000-0000-000000000002","amount":20},{"ticket_id":"10000000-0000-0000-0000-000000000003","amount":20}]'::jsonb);
 IF summary->>'paid'<>'40' OR summary->>'unclaimed'<>'0' THEN
   RAISE EXCEPTION 'Incorrect fully funded settlement: %',summary;
 END IF;
END $q$;

-- Market 2: 200 contributed/80 pot, winning tickets capped at 40
-- together. The true 40 undistributable coins are audited as UNCLAIMED.
DO $q$ DECLARE summary jsonb;
BEGIN
 summary:=pp._mcl_settle_market('00000000-0000-0000-0000-000000000002',ARRAY['WIN'],
   '[{"ticket_id":"10000000-0000-0000-0000-000000000005","amount":20},{"ticket_id":"10000000-0000-0000-0000-000000000006","amount":20}]'::jsonb);
 IF summary->>'prize_allocation'<>'80' OR
    summary->>'paid'<>'40' OR summary->>'unclaimed'<>'40' THEN
    RAISE EXCEPTION 'Prize cap leftover incorrectly recognized: %',summary;
 END IF;
END $q$;

-- Market 3: zero active tickets picked outcome WIN. No fictitious payouts.
DO $q$ DECLARE summary jsonb;
BEGIN
 summary:=pp._mcl_settle_market('00000000-0000-0000-0000-000000000003',ARRAY['WIN'],'[]'::jsonb);
 IF summary->>'paid'<>'0' OR summary->>'unclaimed'<>'40' THEN
    RAISE EXCEPTION 'No-winner prize disposition invalid: %',summary;
 END IF;
END $q$;
DO $q$ BEGIN
 IF (SELECT count(*) FROM pp.mock_settlements)<>3 OR
    (SELECT count(*) FROM pp.mcl_tickets WHERE status='active')<>0 OR
    (SELECT count(*) FROM pp.mcl_markets WHERE status='settled')<>3 THEN
   RAISE EXCEPTION 'Funded settlement count/status mismatch';
 END IF;
END $q$;
ROLLBACK;

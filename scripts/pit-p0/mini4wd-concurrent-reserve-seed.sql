-- Mini4WD disposable PostgreSQL 17 admission smoke. NO real user or wallet data.
\set ON_ERROR_STOP on
CREATE ROLE anon; CREATE ROLE authenticated;
CREATE SCHEMA auth; CREATE SCHEMA pp;
CREATE TABLE pp.m4_heats (
 id uuid PRIMARY KEY, mode text NOT NULL, status text NOT NULL,
 result jsonb,opened_at timestamptz,locked_at timestamptz,settled_at timestamptz);
CREATE TABLE pp.m4_entries (
 id uuid PRIMARY KEY, heat_id uuid NOT NULL,position integer NOT NULL);
CREATE TABLE pp.ledger(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,balance_after bigint);
CREATE TABLE pp.m4_bets (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),heat_id uuid,entry_id uuid,
 player_id uuid,stake bigint,odds numeric,payout bigint DEFAULT 0,status text DEFAULT 'pending',
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


-- Synthetic funding exclusively in isolated disposable QA.
INSERT INTO pp.p0_operator_reserve(scope,tier,settled_free_reserve,earmarked_other_liabilities,verified_source_ref,verified_at,enabled)
VALUES('mini4wd',1,30000,0,'SYNTHETIC_CI_ONLY',now(),true);
-- Two prior independent unresolved 975-downside bets: only ONE additional
-- 975 risk unit can fit under the shared 3000 net-downside ceiling.
SELECT pp.m4_place_bet(
 '00000000-0000-0000-0000-000000000002',
 '10000000-0000-0000-0002-000000000001',25,40,'test-risk-seed-h2-002');
SELECT pp.m4_place_bet(
 '00000000-0000-0000-0000-000000000004',
 '10000000-0000-0000-0004-000000000001',25,40,'test-risk-seed-h4-004');
CREATE FUNCTION pp.p0_test_hold_pending() RETURNS trigger LANGUAGE plpgsql
AS $slow$ BEGIN
  IF NEW.heat_id IN (
    '00000000-0000-0000-0000-000000000005'::uuid,
    '00000000-0000-0000-0000-000000000006'::uuid) THEN
    PERFORM pg_sleep(1.5);
  END IF;
  RETURN NEW;
END $slow$;
CREATE TRIGGER p0_hold_racing_bets BEFORE INSERT ON pp.m4_bets
 FOR EACH ROW EXECUTE FUNCTION pp.p0_test_hold_pending();

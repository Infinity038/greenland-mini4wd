-- STAGING ONLY: owner-approved Tier 1 MCL limits dated 2026-10-24.
-- DO NOT apply without GM4WD backup, hardened member RLS, SSO, QA, rollback.
-- Does not alter existing 60%/40% MCL funded-pool economics.
CREATE OR REPLACE FUNCTION pp._p0_check_mcl_stake(
 p_player uuid, p_market uuid, p_stake bigint
) RETURNS void LANGUAGE plpgsql SECURITY INVOKER
SET search_path TO 'pg_catalog','pg_temp'
AS $p0_mcl_stake$
DECLARE
 m pp.mcl_markets; max_ticket bigint; already_used bigint; key_suffix text;
BEGIN
 IF p_player IS NULL OR p_market IS NULL OR p_stake IS NULL OR p_stake<1 THEN
   RAISE EXCEPTION 'invalid P0 MCL admission request' USING errcode='22023';
 END IF;
 SELECT * INTO m FROM pp.mcl_markets WHERE id=p_market;
 IF NOT FOUND THEN RAISE EXCEPTION 'unknown MCL market' USING errcode='22023'; END IF;
 IF m.kind='champion' THEN
   max_ticket:=25; key_suffix:='champion:'||m.season_id::text;
 ELSIF m.kind IN ('winner','position') AND m.race_id IS NOT NULL THEN
   max_ticket:=50; key_suffix:='race:'||m.race_id::text;
 ELSE RAISE EXCEPTION 'unknown MCL market type' USING errcode='22023';
 END IF;
 IF p_stake>max_ticket THEN
   RAISE EXCEPTION 'P0 MCL per-ticket limit exceeded' USING errcode='23514';
 END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(
   pg_catalog.hashtextextended('pp.p0.mcl.player:'||p_player::text||':'||key_suffix,0));
 SELECT COALESCE(SUM(t.stake),0) INTO already_used
 FROM pp.mcl_tickets t JOIN pp.mcl_markets other ON other.id=t.market_id
 WHERE t.player_id=p_player AND t.status='active'
   AND other.season_id=m.season_id
   AND ((m.kind='champion' AND other.kind='champion')
        OR (m.kind IN ('winner','position') AND other.kind IN ('winner','position')
            AND other.race_id=m.race_id));
 IF already_used+p_stake>100 THEN
   RAISE EXCEPTION 'P0 MCL combined participant limit exceeded' USING errcode='23514';
 END IF;
END;
$p0_mcl_stake$;
REVOKE ALL ON FUNCTION pp._p0_check_mcl_stake(uuid,uuid,bigint) FROM PUBLIC;

CREATE OR REPLACE FUNCTION pp.mcl_place_ticket(p_market uuid, p_outcome text, p_stake bigint, p_idem text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'pg_temp'
AS $function$
declare pid uuid; m pp.mcl_markets; s pp.mcl_seasons; w int; l pp.ledger; t pp.mcl_tickets; est numeric;
begin
  perform pp._require_allowed(); perform pp._require_game('mcl'); pid := pp._player_of(auth.uid());
  if pid is null then raise exception 'No player profile' using errcode = '42501'; end if;
  if p_idem is null or char_length(p_idem) < 8 then raise exception 'idempotency key required' using errcode = '22023'; end if;
  select * into t from pp.mcl_tickets where player_id = pid and idem = p_idem;
  if found then
    if t.market_id <> p_market or t.outcome <> p_outcome or t.stake <> p_stake then raise exception 'idempotency key reused with a different request' using errcode = '22023'; end if;
    return jsonb_build_object('ticket_id', t.id, 'stake', t.stake, 'weight', t.weight, 'cap', t.cap, 'replay', true);
  end if;
  if p_stake is null or p_stake < 1 or p_stake > 1000000 then raise exception 'invalid amount' using errcode = '22023'; end if;
  select * into m from pp.mcl_markets where id = p_market for share; if not found then raise exception 'unknown market' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('pp.mcl.market:' || p_market::text, 0));
  if not pp._mcl_market_open(p_market) then raise exception 'predictions are not open' using errcode = '22023'; end if;
  perform pp._mcl_check_outcome(p_market, p_outcome);
  if exists (select 1 from pp.mcl_tickets x where x.market_id = p_market and x.player_id = pid and x.outcome = p_outcome and x.status = 'active') then raise exception 'you already have a ticket on this selection' using errcode = '22023'; end if;
  select * into s from pp.mcl_seasons where id = m.season_id;
  w := case when m.kind = 'champion' then pp._mcl_weight(s.starts_at) else 1 end;
  est := pp._mcl_estimate(p_market, p_outcome, p_stake, w, m.cap);
  -- Serialize per-ticket and combined market player caps BEFORE wallet debit.
  perform pp._p0_check_mcl_stake(pid, p_market, p_stake);
  l := pp.game_stake('mcl_market', p_market::text, p_stake, p_idem);
  insert into pp.mcl_tickets(market_id, player_id, outcome, stake, weight, cap, idem, stake_ledger_id) values (p_market, pid, p_outcome, p_stake, w, m.cap, p_idem, l.id) returning * into t;
  return jsonb_build_object('ticket_id', t.id, 'stake', t.stake, 'weight', t.weight, 'cap', t.cap, 'estimate', round(est, 4), 'balance_after', l.balance_after, 'replay', false);
end $function$


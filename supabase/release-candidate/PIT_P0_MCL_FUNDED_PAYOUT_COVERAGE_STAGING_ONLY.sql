-- Disposable PostgreSQL 17 / review-only deterministic integer allocator.
-- Existing canonical JS algorithm: iterative proportional "water fill";
-- assign floor(remaining pool × weight / sum eligible weights), clip to
-- individual ticket caps, and when all floors are zero assign one whole coin
-- to the largest fractional remainder; equal remainders tie by ticket UUID.
-- The most recent actual accepted ticket cap and 4/2/1 weight are authoritative.
CREATE OR REPLACE FUNCTION pp._p0_verify_mcl_exact_payouts(
  p_market uuid,p_winners text[],p_submitted jsonb
) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER
SET search_path TO 'pg_catalog','pg_temp'
AS $exact$
DECLARE
  ids uuid[] := '{}'::uuid[];
  w numeric[] := '{}'::numeric[];
  caps bigint[] := '{}'::bigint[];
  paid bigint[] := '{}'::bigint[];
  n integer:=0;
  i integer;
  r record;
  contributed numeric;
  remaining bigint;
  total_weight numeric;
  delta bigint;
  distributed bigint;
  amount bigint;
  best integer;
  best_remainder numeric;
  fraction_remainder numeric;
  actual bigint;
  seen integer;
  entry jsonb;
BEGIN
  IF p_market IS NULL OR p_winners IS NULL OR
     jsonb_typeof(p_submitted)<>'array' THEN
    RAISE EXCEPTION 'invalid exact MCL payout request' USING errcode='22023';
  END IF;
  SELECT coalesce(sum(stake),0)::numeric INTO contributed
    FROM pp.mcl_tickets
    WHERE market_id=p_market AND status='active';
  IF contributed<0 OR contributed>9223372036854775807 THEN
    RAISE EXCEPTION 'unsafe MCL prize sum' USING errcode='23514';
  END IF;
  remaining:=floor(contributed*0.4)::bigint;
  FOR r IN
     SELECT id,stake,weight,cap
       FROM pp.mcl_tickets
      WHERE market_id=p_market AND status='active'
        AND outcome=ANY(p_winners)
      ORDER BY id
  LOOP
    IF r.stake IS NULL OR r.stake<=0 OR r.weight IS NULL OR
       r.weight NOT IN(1,2,4) OR r.cap IS NULL OR
       r.cap NOT IN(2,3,8) OR r.stake::numeric*r.cap>9223372036854775807 THEN
       RAISE EXCEPTION 'invalid accepted P0 MCL ticket state'
         USING errcode='23514';
    END IF;
    n:=n+1;
    ids:=array_append(ids,r.id);
    w:=array_append(w,r.stake::numeric*r.weight);
    caps:=array_append(caps,(r.stake::numeric*r.cap)::bigint);
    paid:=array_append(paid,0::bigint);
  END LOOP;
  WHILE remaining>0 AND n>0 LOOP
    total_weight:=0;
    FOR i IN 1..n LOOP
      IF paid[i]<caps[i] THEN total_weight:=total_weight+w[i]; END IF;
    END LOOP;
    IF total_weight=0 THEN EXIT; END IF;
    distributed:=0;
    -- Allocate integer-floor weighted shares simultaneously against the
    -- SAME remaining budget, then redistribute under capped-out tickets.
    FOR i IN 1..n LOOP
      IF paid[i]<caps[i] THEN
        amount:=LEAST(caps[i]-paid[i],floor(remaining::numeric*w[i]/total_weight)::bigint);
        paid[i]:=paid[i]+amount;
        distributed:=distributed+amount;
      END IF;
    END LOOP;
    IF distributed=0 THEN
      best:=0;
      best_remainder:=-1;
      FOR i IN 1..n LOOP
        IF paid[i]<caps[i] THEN
          fraction_remainder:=mod(remaining::numeric*w[i],total_weight);
          IF fraction_remainder>best_remainder THEN
            best_remainder:=fraction_remainder;
            best:=i;
          END IF;
        END IF;
      END LOOP;
      IF best=0 THEN RAISE EXCEPTION 'MCL allocator not progressing' USING errcode='23514'; END IF;
      paid[best]:=paid[best]+1;
      distributed:=1;
    END IF;
    remaining:=remaining-distributed;
  END LOOP;

  -- Submitted entries must match every calculated payout exactly.
  IF jsonb_array_length(p_submitted)<>n THEN
    RAISE EXCEPTION 'P0 expected all calculated winning tickets in payout'
      USING errcode='23514';
  END IF;
  FOR i IN 1..n LOOP
    seen:=0; actual:=null;
    FOR entry IN SELECT * FROM jsonb_array_elements(p_submitted) LOOP
      IF entry->>'ticket_id'=ids[i]::text THEN
        seen:=seen+1;
        IF entry->>'amount' !~ '^[0-9]+$' THEN
          RAISE EXCEPTION 'invalid exact payout amount' USING errcode='23514';
        END IF;
        actual:=(entry->>'amount')::bigint;
      END IF;
    END LOOP;
    IF seen<>1 OR actual IS DISTINCT FROM paid[i] THEN
      RAISE EXCEPTION 'P0 weighted payout differs from deterministic allocation'
        USING errcode='23514';
    END IF;
  END LOOP;
END;
$exact$;
REVOKE ALL ON FUNCTION pp._p0_verify_mcl_exact_payouts(uuid,text[],jsonb) FROM PUBLIC;

-- P0 STAGING-ONLY FUNDED PAYOUT INVARIANT — no live deployment.
-- With exact per-ticket independent 4/2/1 allocator now included.
-- Existing hosted function was inspected 2026-10-24. This preserves
-- 60/40 contribution rules and historical results, with only TWO new guards:
-- (1) all active winning tickets explicitly listed, (2) all distributable
--     prize-pot whole coins paid up to aggregate individual cap capacity.
-- STILL BLOCKED: independent 4/2/1 deterministic weighted per-ticket amount
-- verification, before allowing actual wallet settlements.
-- Execute only on a disposable PostgreSQL 17 test database.
CREATE OR REPLACE FUNCTION pp._mcl_settle_market(p_market uuid, p_winners text[], p_payouts jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'pg_temp'
AS $function$
declare m pp.mcl_markets; contributed bigint; prize bigint; e jsonb; tid uuid; amt bigint; tk pp.mcl_tickets; total bigint := 0; ids uuid[] := '{}'; pay jsonb := '[]'::jsonb; summary jsonb;
begin
  select * into m from pp.mcl_markets where id = p_market for update;
  if not found or m.status <> 'locked' then raise exception 'market must be locked first' using errcode = '22023'; end if;
  if jsonb_typeof(p_payouts) <> 'array' then raise exception 'invalid payouts' using errcode = '22023'; end if;
  select coalesce(sum(stake), 0) into contributed from pp.mcl_tickets where market_id = p_market and status = 'active';
  prize := floor(contributed * 0.4)::bigint;
  for e in select * from jsonb_array_elements(p_payouts) loop
    tid := (e ->> 'ticket_id')::uuid; amt := (e ->> 'amount')::bigint;
    select * into tk from pp.mcl_tickets x where x.id = tid and x.market_id = p_market and x.status = 'active';
    if not found then raise exception 'payout for a ticket that is not active in this market' using errcode = '22023'; end if;
    if tid = any (ids) then raise exception 'duplicate payout for a ticket' using errcode = '22023'; end if;
    if not (tk.outcome = any (p_winners)) then raise exception 'payout for a losing ticket' using errcode = '22023'; end if;
    if amt is null or amt < 0 or amt > tk.stake * tk.cap then raise exception 'payout above the ticket cap' using errcode = '23514'; end if;
    ids := ids || tid; total := total + amt;
    if amt > 0 then pay := pay || jsonb_build_object('player_id', tk.player_id, 'amount', amt, 'kind', 'game_payout'); end if;
  end loop;
  -- Every active winning ticket must appear once, even if its mathematically
  -- computed payout is zero. Existing ticket history is never overwritten.
  if exists(
    select 1 from pp.mcl_tickets x
    where x.market_id=p_market and x.status='active'
      and x.outcome=any(p_winners) and not x.id=any(ids)
  ) then
    raise exception 'P0 funded winner omitted from payout inventory' using errcode='23514';
  end if;
  -- Independently check that the funded pot is fully allocated where possible:
  -- the undistributable remainder is unclaimed, not manually withheld.
  -- This is necessary but NOT sufficient to prove weighted 4/2/1 shares.
  if total <> least(
    prize,
    (select coalesce(sum(x.stake::numeric*x.cap),0)::bigint
       from pp.mcl_tickets x
      where x.market_id=p_market and x.status='active'
        and x.outcome=any(p_winners))
  ) then
    raise exception 'P0 funded distribution incomplete or overstated'
      using errcode='23514';
  end if;
  if total > prize then raise exception 'payouts exceed the funded prize allocation' using errcode = '23514'; end if;
  -- P0 exact independent 4/2/1 payout calculation. A correct TOTAL with a
  -- wrong ticket-level split is not enough: reject before any wallet debit.
  PERFORM pp._p0_verify_mcl_exact_payouts(p_market,p_winners,p_payouts);
  perform pp.game_settle('mcl_market', p_market::text, 1, pay, prize);
  update pp.mcl_tickets t set status = case when t.outcome = any (p_winners) then 'won' else 'lost' end,
         payout = coalesce((select (x ->> 'amount')::bigint from jsonb_array_elements(p_payouts) x where (x ->> 'ticket_id')::uuid = t.id), 0)
   where t.market_id = p_market and t.status = 'active';
  summary := jsonb_build_object('contributed', contributed, 'operator_allocation', contributed - prize, 'prize_allocation', prize, 'paid', total, 'unclaimed', prize - total, 'winners', to_jsonb(p_winners));
  update pp.mcl_markets set status = 'settled', settlement = summary, settled_at = now() where id = p_market;
  return summary;
end $function$
;

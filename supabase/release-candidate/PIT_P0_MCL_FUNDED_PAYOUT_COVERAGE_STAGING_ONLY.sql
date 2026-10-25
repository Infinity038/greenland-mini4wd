-- P0 STAGING-ONLY FUNDED PAYOUT INVARIANT — no live deployment.
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
  perform pp.game_settle('mcl_market', p_market::text, 1, pay, prize);
  update pp.mcl_tickets t set status = case when t.outcome = any (p_winners) then 'won' else 'lost' end,
         payout = coalesce((select (x ->> 'amount')::bigint from jsonb_array_elements(p_payouts) x where (x ->> 'ticket_id')::uuid = t.id), 0)
   where t.market_id = p_market and t.status = 'active';
  summary := jsonb_build_object('contributed', contributed, 'operator_allocation', contributed - prize, 'prize_allocation', prize, 'paid', total, 'unclaimed', prize - total, 'winners', to_jsonb(p_winners));
  update pp.mcl_markets set status = 'settled', settlement = summary, settled_at = now() where id = p_market;
  return summary;
end $function$
;

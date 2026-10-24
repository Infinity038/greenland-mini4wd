-- STAGING / QA ONLY. Extend the Mini4WD admission branch with atomic
-- operator-reserve movements on official heat settlement and organizer void.
-- Does not authorize modifying hosted balances or activating betting.
-- Historical settlements must remain unmodified; activation requires fresh
-- backup/restore verification, full owner/member auth and end-to-end QA.
CREATE TABLE IF NOT EXISTS pp.p0_reserve_movements (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  scope text NOT NULL CHECK(scope='mini4wd'),
  heat_id uuid NOT NULL,
  action text NOT NULL CHECK(action IN ('settle','void')),
  accepted_stakes bigint NOT NULL CHECK(accepted_stakes>=0),
  actual_payouts_or_refunds bigint NOT NULL CHECK(actual_payouts_or_refunds>=0),
  reserve_delta bigint NOT NULL,
  reserve_after bigint NOT NULL CHECK(reserve_after>=0),
  actor uuid,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(scope,heat_id)
);
ALTER TABLE pp.p0_reserve_movements ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE pp.p0_reserve_movements FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION pp._p0_close_m4_reserve(
  p_heat uuid, p_action text, p_stakes bigint, p_paid bigint
) RETURNS void LANGUAGE plpgsql SECURITY INVOKER
SET search_path TO 'pg_catalog','pg_temp'
AS $p0_close$
DECLARE
  reserve pp.p0_operator_reserve;
  change bigint;
  next_available bigint;
BEGIN
  IF p_heat IS NULL OR p_action NOT IN ('settle','void') OR
     p_stakes IS NULL OR p_stakes<0 OR p_paid IS NULL OR p_paid<0 THEN
    RAISE EXCEPTION 'invalid Mini4WD reserve closing request' USING errcode='22023';
  END IF;
  IF p_action='void' AND p_paid<>p_stakes THEN
    RAISE EXCEPTION 'organizer void must fully refund accepted stakes' USING errcode='23514';
  END IF;
  -- All acceptance/settlement/void paths lock the same single row for update.
  SELECT * INTO reserve FROM pp.p0_operator_reserve
   WHERE scope='mini4wd' FOR UPDATE;
  IF NOT FOUND OR reserve.enabled IS DISTINCT FROM true OR reserve.tier<>1 THEN
    RAISE EXCEPTION 'operator reserve unavailable for close' USING errcode='42501';
  END IF;
  -- stakes already debited from player wallets but not yet recognized as
  -- operator cash/profit. Recognition occurs at official settlement only.
  change:=CASE WHEN p_action='void' THEN 0 ELSE p_stakes-p_paid END;
  next_available:=reserve.settled_free_reserve+change;
  IF next_available<reserve.earmarked_other_liabilities THEN
    RAISE EXCEPTION 'operator reserve insufficient for official outcome' USING errcode='23514';
  END IF;
  INSERT INTO pp.p0_reserve_movements(
     scope,heat_id,action,accepted_stakes,actual_payouts_or_refunds,
     reserve_delta,reserve_after,actor)
   VALUES('mini4wd',p_heat,p_action,p_stakes,p_paid,
     change,next_available,auth.uid());
  UPDATE pp.p0_operator_reserve
   SET settled_free_reserve=next_available WHERE scope='mini4wd';
END;
$p0_close$;
REVOKE ALL ON FUNCTION pp._p0_close_m4_reserve(uuid,text,bigint,bigint) FROM PUBLIC;

-- Exact hosted functions with only the reservation accounting hooks added.
CREATE OR REPLACE FUNCTION pp.m4_settle(p_heat uuid, p_placements uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'pg_temp'
AS $function$
declare h pp.m4_heats; need int; winners uuid[]; payouts jsonb; total bigint; stakes bigint; res jsonb; k int;
begin
  perform pp._require_admin();
  select * into h from pp.m4_heats where id = p_heat for update;
  if not found then raise exception 'unknown heat' using errcode = '22023'; end if;
  need := case when h.mode = 'podium' then 3 else 1 end;
  if p_placements is null or coalesce(array_length(p_placements, 1), 0) <> need
     or (select count(distinct x) from unnest(p_placements) x) <> need
     or exists (select 1 from unnest(p_placements) x where not exists (select 1 from pp.m4_entries e where e.id = x and e.heat_id = p_heat)) then
    raise exception 'invalid result for this heat' using errcode = '22023';
  end if;
  res := to_jsonb(p_placements);
  if h.status = 'settled' then
    if h.result = res then return jsonb_build_object('status', 'already_settled'); end if;
    raise exception 'heat already settled with a different result' using errcode = '22023';
  end if;
  if h.status <> 'locked' then raise exception 'heat must be locked first' using errcode = '22023'; end if;
  winners := case when h.mode = 'podium' then p_placements else array[p_placements[1]] end;
  select coalesce(jsonb_agg(jsonb_build_object('player_id', b.player_id, 'amount', floor(b.stake * b.odds)::bigint, 'kind', 'game_payout') order by b.id), '[]'::jsonb),
         coalesce(sum(floor(b.stake * b.odds)::bigint), 0)
    into payouts, total from pp.m4_bets b where b.heat_id = p_heat and b.entry_id = any (winners) and b.status = 'pending';
  select coalesce(sum(stake),0) into stakes from pp.m4_bets where heat_id=p_heat and status='pending';
  -- Shared reserve closes atomically before payout ledger writes; any later
  -- exception rolls back reserve, wallet settlement and result together.
  perform pp._p0_close_m4_reserve(p_heat,'settle',stakes,total);
  perform pp.game_settle('m4_heat', p_heat::text, 1, payouts, total);
  update pp.m4_bets set status = 'won', payout = floor(stake * odds)::bigint where heat_id = p_heat and entry_id = any (winners) and status = 'pending';
  update pp.m4_bets set status = 'lost' where heat_id = p_heat and status = 'pending';
  update pp.m4_heats set status = 'settled', result = res, settled_at = now() where id = p_heat;
  insert into pp.audit(actor, action, detail) values (auth.uid(), 'm4_settle', jsonb_build_object('heat', p_heat, 'result', res, 'total_paid', total));
  return jsonb_build_object('status', 'settled', 'total_paid', total);
end $function$


CREATE OR REPLACE FUNCTION pp.m4_void(p_heat uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'pg_temp'
AS $function$
declare h pp.m4_heats; payouts jsonb; total bigint;
begin
  perform pp._require_admin();
  select * into h from pp.m4_heats where id = p_heat for update;
  if not found then raise exception 'unknown heat' using errcode = '22023'; end if;
  if h.status = 'void' then return jsonb_build_object('status', 'already_void'); end if;
  if h.status not in ('open', 'locked') then raise exception 'only an open or locked heat can be voided' using errcode = '22023'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('player_id', b.player_id, 'amount', b.stake, 'kind', 'game_refund') order by b.id), '[]'::jsonb), coalesce(sum(b.stake), 0)
    into payouts, total from pp.m4_bets b where b.heat_id = p_heat and b.status = 'pending';
  -- A cancelled heat refunds all stakes. They were never recognized as
  -- settled operator income, so reserve delta is exactly zero.
  perform pp._p0_close_m4_reserve(p_heat,'void',total,total);
  perform pp.game_settle('m4_heat_void', p_heat::text, 1, payouts, total);
  update pp.m4_bets set status = 'void', payout = stake where heat_id = p_heat and status = 'pending';
  update pp.m4_heats set status = 'void', settled_at = now() where id = p_heat;
  insert into pp.audit(actor, action, detail) values (auth.uid(), 'm4_void', jsonb_build_object('heat', p_heat, 'refunded', total));
  return jsonb_build_object('status', 'void', 'refunded', total);
end $function$


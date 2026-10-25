-- DRAFT / DISPOSABLE QA ONLY. NEVER APPLY WITHOUT QUALIFIED RESTORE REHEARSAL,
-- owner-supervised GM4WD security cutover, authorized SSO and final release QA.
-- Owner approved on 2026-10-24: 25 ticket / 100 player per heat;
-- max 1000 net loss per heat / 3000 across unresolved heats; Tier 1
-- operator reserve 30000 virtual 4W, no automatic upgrade.
-- A RESERVE POLICY VALUE IS NOT PROOF OF FUNDS. This script does not seed
-- operator money. Absence of a reviewed reserve row MUST reject every wager.
-- Live admission also requires coordinated settlement, void/refund and
-- reserve reconciliation hooks, which remain a separate P0 blocker.

CREATE TABLE IF NOT EXISTS pp.p0_operator_reserve (
  scope text PRIMARY KEY CHECK (scope='mini4wd'),
  tier integer NOT NULL CHECK (tier=1),
  settled_free_reserve bigint NOT NULL CHECK (settled_free_reserve>=0),
  earmarked_other_liabilities bigint NOT NULL DEFAULT 0 CHECK (earmarked_other_liabilities>=0),
  verified_source_ref text NOT NULL CHECK (length(verified_source_ref)>=8),
  verified_at timestamptz NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  CHECK (earmarked_other_liabilities<=settled_free_reserve)
);
ALTER TABLE pp.p0_operator_reserve ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE pp.p0_operator_reserve FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION pp._p0_check_m4_admission(
  p_player uuid, p_heat uuid, p_entry uuid, p_stake bigint, p_odds numeric
) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER
SET search_path TO 'pg_catalog','pg_temp'
AS $p0_m4_risk$
DECLARE
  reserve pp.p0_operator_reserve;
  already bigint;
  event_failure_count bigint;
  invalid_bet_count bigint;
  event_net bigint;
  combined_net bigint;
  combined_gross bigint;
BEGIN
 IF p_player IS NULL OR p_heat IS NULL OR p_entry IS NULL OR
    p_stake IS NULL OR p_stake<1 OR p_stake>25 OR
    p_odds IS NULL OR p_odds<1.01 OR p_odds<>round(p_odds,2) THEN
   RAISE EXCEPTION 'P0 Mini4WD invalid stake or immutable quote' USING errcode='23514';
 END IF;

 -- Atomic global lock serializes all Mini4WD heat admissions. An unfunded,
 -- inactive, or absent operator reserve fails CLOSED before wallet debit.
 SELECT * INTO reserve FROM pp.p0_operator_reserve
 WHERE scope='mini4wd' FOR UPDATE;
 IF NOT FOUND OR reserve.enabled IS DISTINCT FROM true OR
    reserve.tier<>1 OR reserve.verified_at IS NULL OR
    reserve.settled_free_reserve<reserve.earmarked_other_liabilities THEN
   RAISE EXCEPTION 'P0 operator reserve not verified and enabled' USING errcode='42501';
 END IF;

 SELECT COALESCE(sum(stake),0) INTO already
 FROM pp.m4_bets WHERE heat_id=p_heat AND player_id=p_player AND status='pending';
 IF already+p_stake>100 THEN
   RAISE EXCEPTION 'P0 Mini4WD player/heat limit exceeded' USING errcode='23514';
 END IF;

 -- Any invalid current obligation must stop NEW ticket acceptance rather
 -- than silently exclude older/pending exposure from the shared reserve.
 SELECT count(*) INTO invalid_bet_count FROM pp.m4_bets b
 LEFT JOIN pp.m4_heats h ON h.id=b.heat_id
 LEFT JOIN pp.m4_entries e ON e.id=b.entry_id AND e.heat_id=b.heat_id
 WHERE b.status='pending' AND (
   h.id IS NULL OR h.status NOT IN ('open','locked','under_review')
   OR h.mode NOT IN ('win','podium') OR e.id IS NULL
   OR b.stake IS NULL OR b.stake<=0 OR b.odds IS NULL OR b.odds<1.01
   OR b.odds<>round(b.odds,2)
 );
 IF invalid_bet_count<>0 THEN
   RAISE EXCEPTION 'P0 inconsistent unresolved Mini4WD liabilities' USING errcode='23514';
 END IF;
 SELECT count(*) INTO event_failure_count
 FROM pp.m4_heats h
 WHERE h.id=p_heat AND
   (h.status<>'open' OR h.mode NOT IN ('win','podium') OR
    (h.mode='podium' AND
      (SELECT count(*) FROM pp.m4_entries e WHERE e.heat_id=h.id)<4));
 IF event_failure_count<>0 THEN
   RAISE EXCEPTION 'P0 heat is not ready for admission' USING errcode='23514';
 END IF;

 -- Compute every possible winning entry's *gross* promised payout
 -- using accepted, immutable quote, floor to whole 4W per ticket.
 -- Winner = highest one entry; Podium = highest three entries together;
 -- organizer void = refund ALL accepted pending stakes.
 -- Reserve cover uses MAX(gross winning liability, full void refund).
 WITH pending AS (
   SELECT b.heat_id,b.entry_id,b.stake,b.odds FROM pp.m4_bets b WHERE b.status='pending'
   UNION ALL SELECT p_heat,p_entry,p_stake,p_odds
 ), stakes AS (
   SELECT heat_id,sum(stake)::bigint AS accepted
   FROM pending GROUP BY heat_id
 ), by_entry AS (
   SELECT heat_id,entry_id,sum(floor(stake*odds))::bigint AS gross
   FROM pending GROUP BY heat_id,entry_id
 ), ranks AS (
   SELECT e.heat_id,e.gross,h.mode,
    row_number() OVER(PARTITION BY e.heat_id ORDER BY e.gross DESC,e.entry_id) AS place
   FROM by_entry e JOIN pp.m4_heats h ON h.id=e.heat_id
 ), maximums AS (
   SELECT heat_id,sum(gross) FILTER
    (WHERE place <= CASE WHEN mode='podium' THEN 3 ELSE 1 END)::bigint AS max_win
   FROM ranks GROUP BY heat_id
 ), exposures AS (
   SELECT s.heat_id,
     greatest(s.accepted,coalesce(w.max_win,0)) AS gross_guaranteed,
     greatest(0,greatest(s.accepted,coalesce(w.max_win,0))-s.accepted) AS downside
   FROM stakes s JOIN pp.m4_heats h ON h.id=s.heat_id
   LEFT JOIN maximums w ON w.heat_id=s.heat_id
   WHERE h.status NOT IN ('settled','void')
 )
 SELECT
   coalesce(max(downside) FILTER(WHERE heat_id=p_heat),0)::bigint,
   coalesce(sum(downside),0)::bigint,
   coalesce(sum(gross_guaranteed),0)::bigint
 INTO event_net,combined_net,combined_gross FROM exposures;
 IF event_net>1000 THEN
   RAISE EXCEPTION 'P0 Mini4WD event downside limit exceeded' USING errcode='23514';
 END IF;
 IF combined_net>3000 THEN
   RAISE EXCEPTION 'P0 Mini4WD combined downside limit exceeded' USING errcode='23514';
 END IF;
 IF combined_gross>reserve.settled_free_reserve-reserve.earmarked_other_liabilities THEN
   RAISE EXCEPTION 'P0 Mini4WD gross reserve capacity exceeded' USING errcode='23514';
 END IF;
END;
$p0_m4_risk$;
REVOKE ALL ON FUNCTION pp._p0_check_m4_admission(uuid,uuid,uuid,bigint,numeric) FROM PUBLIC;

-- ONLY existing function change: add the pre-debit guard after quote check.
CREATE OR REPLACE FUNCTION pp.m4_place_bet(p_heat uuid, p_entry uuid, p_stake bigint, p_expected_odds numeric, p_idem text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'pg_temp'
AS $function$
declare pid uuid; h pp.m4_heats; q numeric; l pp.ledger; b pp.m4_bets;
begin
  perform pp._require_allowed(); perform pp._require_game('mini4wd'); pid := pp._player_of(auth.uid());
  if pid is null then raise exception 'No player profile' using errcode = '42501'; end if;
  if p_idem is null or char_length(p_idem) < 8 then raise exception 'idempotency key required' using errcode = '22023'; end if;
  select * into b from pp.m4_bets where player_id = pid and idem = p_idem;
  if found then
    if b.heat_id <> p_heat or b.entry_id <> p_entry or b.stake <> p_stake then raise exception 'idempotency key reused with a different request' using errcode = '22023'; end if;
    return jsonb_build_object('bet_id', b.id, 'odds', b.odds, 'stake', b.stake, 'replay', true);
  end if;
  if p_stake is null or p_stake < 1 or p_stake > 1000000 then raise exception 'invalid amount' using errcode = '22023'; end if;
  select * into h from pp.m4_heats where id = p_heat for share;
  if not found or h.status <> 'open' then raise exception 'predictions are not open' using errcode = '22023'; end if;
  if not exists (select 1 from pp.m4_entries e where e.id = p_entry and e.heat_id = p_heat) then raise exception 'unknown entry' using errcode = '22023'; end if;
  if exists (select 1 from pp.m4_bets x where x.player_id = pid and x.entry_id = p_entry) then raise exception 'you already predicted this entry' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('pp.m4.quote:' || p_heat::text, 0));
  select qq.odds into q from pp._m4_quotes(p_heat) qq where qq.entry_id = p_entry;
  if p_expected_odds is null or p_expected_odds <> q then raise exception 'odds changed' using errcode = '22023'; end if;
  -- Owner-approved P0 gate runs after locked quotes and before any wallet debit.
  perform pp._p0_check_m4_admission(pid, p_heat, p_entry, p_stake, q);
  l := pp.game_stake('m4_heat', p_heat::text, p_stake, p_idem);
  insert into pp.m4_bets(heat_id, entry_id, player_id, stake, odds, idem, stake_ledger_id) values (p_heat, p_entry, pid, p_stake, q, p_idem, l.id) returning * into b;
  return jsonb_build_object('bet_id', b.id, 'odds', q, 'stake', p_stake, 'balance_after', l.balance_after, 'replay', false);
end $function$;


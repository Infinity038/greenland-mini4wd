-- STAGING-ONLY PROPOSAL: DO NOT APPLY TO LIVE GM4WD OR PREDICTION PIT.
-- Current hosted pp.mcl_settle_champion permits season completion without proof of the
-- 40 regular + 2 playoff + 1 final results. This isolated draft adds that gate only.
-- It does NOT fix caller-supplied settlement distribution, unclaimed prize policy,
-- tier-1 reserve limits, GM4WD SSO or historical season data. A qualified verified
-- backup, disposable-database tests and explicit rollout approval are required.
-- P0 format here is exactly 24 competitors/43 races. Preserve already-complete
-- seasons on the unchanged idempotent path rather than repairing old records.
CREATE OR REPLACE FUNCTION pp.mcl_settle_champion(
  p_season uuid, p_marble text, p_payouts jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog', 'pg_temp'
AS $p0_champion_guard$
DECLARE
  s pp.mcl_seasons;
  cm uuid;
  final_race pp.mcl_races;
  summary jsonb;
  n_regular int;
  n_playoff int;
  n_final int;
  n_invalid int;
  playoff_top3 text[];
  final_six text[];
BEGIN
  PERFORM pp._require_admin();
  SELECT * INTO s FROM pp.mcl_seasons WHERE id=p_season FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'unknown season' USING errcode='22023'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pp.mcl_marbles WHERE season_id=p_season AND marble_id=p_marble) THEN
    RAISE EXCEPTION 'unknown contender' USING errcode='22023';
  END IF;
  IF s.status='complete' THEN
    IF s.champion=p_marble THEN RETURN jsonb_build_object('status','already_settled'); END IF;
    RAISE EXCEPTION 'season already settled with a different champion' USING errcode='22023';
  END IF;
  IF s.status IS DISTINCT FROM 'live' THEN
    RAISE EXCEPTION 'season must be live before champion settlement' USING errcode='22023';
  END IF;
  IF (SELECT count(*) FROM pp.mcl_marbles WHERE season_id=p_season) <> 24 THEN
    RAISE EXCEPTION 'P0 requires a 24-marble roster' USING errcode='22023';
  END IF;

  SELECT count(*) FILTER(WHERE phase='regular'),
         count(*) FILTER(WHERE phase='playoff'),
         count(*) FILTER(WHERE phase='final'),
         count(*) FILTER(WHERE phase NOT IN ('regular','playoff','final') OR phase IS NULL)
  INTO n_regular,n_playoff,n_final,n_invalid
  FROM pp.mcl_races WHERE season_id=p_season;
  IF n_regular<>40 OR n_playoff<>2 OR n_final<>1 OR n_invalid<>0 THEN
    RAISE EXCEPTION '43-race regular/playoff/final schedule required' USING errcode='22023';
  END IF;
  SELECT count(*) INTO n_invalid FROM pp.mcl_races WHERE season_id=p_season
    AND (status IS DISTINCT FROM 'settled'
      OR jsonb_typeof(result) IS DISTINCT FROM 'array'
      OR jsonb_typeof(lineup) IS DISTINCT FROM 'array');
  IF n_invalid<>0 THEN
    RAISE EXCEPTION 'all race results must be settled six-place arrays' USING errcode='22023';
  END IF;
  -- Preliminary array check above means every element access below is safe.
  SELECT count(*) INTO n_invalid FROM pp.mcl_races r WHERE r.season_id=p_season
    AND (jsonb_array_length(r.result)<>6 OR jsonb_array_length(r.lineup)<>6
      OR (SELECT count(DISTINCT x.val) FROM jsonb_array_elements_text(r.result) AS x(val))<>6
      OR EXISTS(SELECT 1 FROM jsonb_array_elements_text(r.result) AS x(val)
        WHERE NOT EXISTS(SELECT 1 FROM jsonb_array_elements_text(r.lineup) AS y(val)
          WHERE y.val=x.val)));
  IF n_invalid<>0 THEN
    RAISE EXCEPTION 'results must be a permutation of each six-marble lineup' USING errcode='22023';
  END IF;

  SELECT * INTO final_race FROM pp.mcl_races WHERE season_id=p_season AND phase='final';
  IF (final_race.result ->> 0) IS DISTINCT FROM p_marble THEN
    RAISE EXCEPTION 'champion must win final race' USING errcode='22023';
  END IF;
  SELECT array_agg(q.marble ORDER BY q.marble) INTO playoff_top3 FROM (
    SELECT p.marble FROM pp.mcl_races r
    CROSS JOIN LATERAL jsonb_array_elements_text(r.result)
      WITH ORDINALITY AS p(marble,finish_position)
    WHERE r.season_id=p_season AND r.phase='playoff' AND p.finish_position<=3
  ) q;
  SELECT array_agg(f.marble ORDER BY f.marble) INTO final_six
    FROM jsonb_array_elements_text(final_race.lineup) AS f(marble);
  IF playoff_top3 IS DISTINCT FROM final_six
     OR (SELECT count(DISTINCT x.val) FROM unnest(playoff_top3) AS x(val))<>6 THEN
    RAISE EXCEPTION 'finalists must be the top three from each playoff' USING errcode='22023';
  END IF;

  SELECT id INTO cm FROM pp.mcl_markets WHERE season_id=p_season AND kind='champion';
  IF cm IS NULL
     OR (SELECT count(*) FROM pp.mcl_markets WHERE season_id=p_season)<>87
     OR (SELECT count(*) FROM pp.mcl_markets WHERE season_id=p_season AND kind='champion' AND status='locked')<>1
     OR (SELECT count(*) FROM pp.mcl_markets WHERE season_id=p_season AND kind IN ('winner','position') AND status='settled')<>86 THEN
    RAISE EXCEPTION 'all 86 race markets must settle before champion market' USING errcode='22023';
  END IF;
  -- Existing 40%-funded payout/cap routine remains unchanged; its weighted
  -- distribution must be independently verified before wallet-connected release.
  summary := pp._mcl_settle_market(cm, ARRAY[p_marble], p_payouts);
  UPDATE pp.mcl_seasons
    SET status='complete',champion=p_marble,completed_at=now() WHERE id=p_season;
  INSERT INTO pp.audit(actor,action,detail) VALUES
    (auth.uid(),'mcl_settle_champion',
      jsonb_build_object('season',p_season,'champion',p_marble,'paid',summary->'paid'));
  RETURN jsonb_build_object('status','settled','champion',summary);
END;
$p0_champion_guard$;

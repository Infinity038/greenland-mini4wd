-- Prediction Pit P0 gameplay gate. READ-ONLY; execute only on the existing prediction-pit-preview Supabase project.
-- No personal data, raw wallet values, ticket identifiers, payments or credentials are selected.
-- Results are a release readiness inventory; PASS on a structural check is not an end-to-end authorization/settlement PASS.
WITH seasons AS (
 SELECT s.id,s.status,COUNT(r.id) AS races,
 COUNT(r.id) FILTER (WHERE r.status != 'settled') AS unsettled,
 COUNT(r.id) FILTER (WHERE r.phase='playoff') AS playoffs,
 COUNT(r.id) FILTER (WHERE r.phase='final') AS finals
 FROM pp.mcl_seasons s LEFT JOIN pp.mcl_races r ON r.season_id=s.id
 GROUP BY s.id,s.status
), c AS (
 SELECT 1 AS n,'gm4wd_linked_players' AS check_name,(SELECT count(*)::text FROM pp.players WHERE member_id IS NOT NULL) AS observed,
 CASE WHEN EXISTS (SELECT 1 FROM pp.players WHERE member_id IS NOT NULL) THEN 'LINK_PRESENT_QA_REQUIRED' ELSE 'BLOCKED_NO_LINKS' END AS result
 UNION ALL SELECT 2,'inconsistent_complete_seasons',
 (SELECT count(*)::text FROM seasons WHERE status='complete' AND unsettled>0),
 CASE WHEN EXISTS(SELECT 1 FROM seasons WHERE status='complete' AND unsettled>0) THEN 'BLOCKED_PRESERVE_HISTORICAL' ELSE 'NO_CONTRADICTION_FOUND' END
 UNION ALL SELECT 3,'complete_seasons_without_43_race_lifecycle',
 (SELECT count(*)::text FROM seasons WHERE status='complete' AND (races<43 OR playoffs<2 OR finals<1)),
 CASE WHEN EXISTS(SELECT 1 FROM seasons WHERE status='complete' AND (races<43 OR playoffs<2 OR finals<1)) THEN 'BLOCKED_LIFECYCLE_QA' ELSE 'NO_CONTRADICTION_FOUND' END
 UNION ALL SELECT 4,'mcl_open_races',(SELECT count(*)::text FROM pp.mcl_races WHERE status='open'),'INVENTORY_ONLY'
 UNION ALL SELECT 5,'mcl_champion_cap_mismatch',(SELECT count(*)::text FROM pp.mcl_markets WHERE kind='champion' AND cap<>8),
 CASE WHEN EXISTS(SELECT 1 FROM pp.mcl_markets WHERE kind='champion' AND cap<>8) THEN 'BLOCKED_RULES' ELSE 'CAPS_MATCH_EXISTING_DESIGN' END
 UNION ALL SELECT 6,'mcl_winner_position_cap_mismatch',(SELECT count(*)::text FROM pp.mcl_markets WHERE (kind='winner' AND cap<>2) OR (kind='position' AND cap<>3)),
 CASE WHEN EXISTS(SELECT 1 FROM pp.mcl_markets WHERE (kind='winner' AND cap<>2) OR (kind='position' AND cap<>3)) THEN 'BLOCKED_RULES' ELSE 'CAPS_MATCH_EXISTING_DESIGN' END
 UNION ALL SELECT 7,'active_mcl_tickets',(SELECT count(*)::text FROM pp.mcl_tickets WHERE status='active'),'PRESERVE_NO_RESET'
 UNION ALL SELECT 8,'mini4wd_heats',(SELECT count(*)::text FROM pp.m4_heats),
 CASE WHEN EXISTS(SELECT 1 FROM pp.m4_heats) THEN 'HEAT_EXISTS_OPERATOR_QA_REQUIRED' ELSE 'BLOCKED_NO_HEATS' END
 UNION ALL SELECT 9,'mini4wd_stake_ceiling_in_hosted_routine',
 CASE WHEN pg_get_functiondef(to_regprocedure('pp.m4_place_bet(uuid,uuid,bigint,numeric,text)')) LIKE '%p_stake > 1000000%' THEN '1000000' ELSE 'INSPECT_MANUALLY' END,'NOT_APPROVED_TIER1_EXPOSURE_GUARD'
 UNION ALL SELECT 10,'ledger_rows',(SELECT count(*)::text FROM pp.ledger),'PRESERVE_NO_RESET'
 UNION ALL SELECT 11,'vault_switch',coalesce((SELECT enabled::text FROM pp.game_settings WHERE game_id='vault'),'absent'),
 CASE WHEN coalesce((SELECT enabled FROM pp.game_settings WHERE game_id='vault'),false) THEN 'UNRELEASED_UI_MUST_NOT_OFFER_PLAY' ELSE 'OFF' END
)
SELECT check_name,observed,result FROM c ORDER BY n;

-- Standalone Pit P0 read-only release inventory. No player or wallet IDs.
-- Counts alone do NOT prove exact UUID ownership or a restored backup.
SELECT
 (SELECT count(*) FROM pp.players) AS pit_player_count,
 (SELECT count(*) FROM pp.players
   WHERE member_id IS NOT NULL AND auth_user_id IS NOT NULL)
   AS linked_player_count_unverified,
 to_regclass('pp.p0_verified_player_links') IS NOT NULL
   AS verified_link_evidence_table,
 to_regclass('pp.p0_handoff_redemptions') IS NOT NULL
   AS one_use_nonce_table,
 to_regclass('pp.p0_operator_reserve') IS NOT NULL
   AS reserve_table_not_actual_funding_proof,
 (SELECT count(*) FROM pp.mcl_tickets) AS mcl_ticket_count,
 (SELECT count(*) FROM pp.mcl_tickets WHERE status='active')
   AS active_mcl_ticket_count,
 (SELECT count(*) FROM pp.ledger) AS wallet_ledger_row_count,
 (SELECT count(*) FROM pp.m4_heats) AS actual_mini4wd_heat_count,
 (SELECT enabled FROM pp.game_settings WHERE game_id='vault' LIMIT 1)
   AS legacy_vault_setting_requires_live_server_route_check;

/**
 * P0 private-play release gate, intentionally strict and side-effect-free.
 * Every true value must be backed by current external evidence from the
 * PRODUCTION target — staging CI and drafted SQL do NOT satisfy these gates.
 */
export function assessPrivatePlayReadiness(evidence={}) {
 const b=[];
 const need=(condition,code)=>{if(condition!==true)b.push(code)};
 const club=evidence.gm4wd??{},pit=evidence.pit??{},
  backup=evidence.backup??{},auth=evidence.auth??{},
  ops=evidence.operations??{},games=evidence.games??{};
 need(backup.freshConsistentSnapshot,'RESTORABLE_FRESH_BACKUP_MISSING');
 need(backup.restoreRehearsalPassed,'REAL_RESTORE_REHEARSAL_MISSING');
 need(backup.storageAndRoleReconciliation,'STORAGE_OR_ROLE_COVERAGE_MISSING');
 need(club.p3OwnerAndStaffFlowPassed,'GM4WD_OWNER_STAFF_P3_NOT_PROVEN');
 need(club.membersRlsEnabled,'GM4WD_MEMBERS_RLS_OFF');
 need(club.membersRlsForced,'GM4WD_MEMBERS_RLS_NOT_FORCED');
 need(club.anonMemberSelectRevoked,'GM4WD_ANON_MEMBER_READ_EXPOSED');
 need(club.anonMemberInsertRevoked,'GM4WD_ANON_MEMBER_WRITE_EXPOSED');
 need(club.ownerAuthorityPinned,'GM4WD_OWNER_AUTHORITY_UNVERIFIED');
 need(club.ownerApprovedAdultAccessLive,'GM4WD_PRIVATE_ACCESS_NOT_ACTIVE');
 need(pit.existingMemberPlayerAuthLinksVerified,'PIT_EXISTING_IDENTITY_LINK_UNVERIFIED');
 need(pit.linkEvidenceTableDeployed,'PIT_LINK_EVIDENCE_MISSING');
 need(pit.oneUseNonceAtomicInProduction,'PIT_NONCE_REDEMPTION_NOT_LIVE');
 need(auth.crossOriginPostReceiverLive,'PIT_RECEIVING_ENDPOINT_NOT_DEPLOYED');
 need(auth.pitSessionExistingUserBound,'PIT_AUTH_USER_SESSION_UNVERIFIED');
 need(auth.loginLogoutRevocationE2EPassed,'PRIVATE_LOGIN_LOGOUT_REVOKE_QA_MISSING');
 need(games.mcl43RaceLifecycleServerEnforced,'MCL_43_RACE_LIFECYCLE_NOT_LIVE');
 need(games.mclWeightedPayoutServerEnforced,'MCL_EXACT_PAYOUT_NOT_LIVE');
 need(games.mini4wdAtomicRiskLive,'MINI4WD_LIMITS_NOT_LIVE');
 need(games.mini4wdSettlementVoidE2E,'MINI4WD_SETTLEMENT_VOID_NOT_PROVEN');
 need(games.historicalSeasonExceptionResolvedWithoutRewrite,'HISTORICAL_MCL_SEASON_UNRECONCILED');
 need(games.historicalTicketsAndLedgerPreserved,'HISTORICAL_RECORD_PRESERVATION_NOT_VERIFIED');
 need(games.vaultAndArcadeNotPlayable,'UNRELEASED_GAMES_NOT_DISABLED');
 need(ops.tier1ReserveReallyFundedAndAudited,'OPERATOR_RESERVE_UNVERIFIED');
 need(ops.eventAndUnsettledLimitsAtomic,'COMBINED_RISK_NOT_LIVE');
 need(ops.authorizedPhysicalOperatorFlowTested,'PHYSICAL_RACE_OPERATOR_QA_MISSING');
 need(ops.virtualOnlyComplianceReviewed,'VIRTUAL_GAME_POLICY_REVIEW_MISSING');
 return Object.freeze({go:b.length===0,remaining:b.length,blockers:Object.freeze(b),
  scope:'P0-private-MCL-and-Mini4WD-only',
  evidenceKind:'VERIFIED_PRODUCTION_NOT_STAGING'});
}
/** Staging-success markers deliberately NEVER count as production evidence. */
export function evidenceFromReadOnlyInventories({club={},pit={}}={}) {
 return {
  gm4wd:{
    membersRlsEnabled:club.members_rls===true,
    membersRlsForced:club.members_force_rls===true,
    anonMemberSelectRevoked:club.anon_member_select===false,
    anonMemberInsertRevoked:club.anon_member_insert===false,
    ownerAuthorityPinned:club.owner_pinned===true,
    ownerApprovedAdultAccessLive:club.approved_eligible_member_count>0,
  },
  pit:{
    existingMemberPlayerAuthLinksVerified:pit.verified_linked_players>0,
    linkEvidenceTableDeployed:pit.link_evidence_table===true,
    oneUseNonceAtomicInProduction:pit.nonce_table===true,
  },
  games:{
    historicalTicketsAndLedgerPreserved:
      pit.historical_tickets_preserved===true&&
      pit.historical_ledger_preserved===true,
    vaultAndArcadeNotPlayable:pit.unreleased_games_server_blocked===true,
  },
 };
}

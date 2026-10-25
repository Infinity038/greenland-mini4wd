import test from 'node:test';
import assert from 'node:assert/strict';
import {assessPrivatePlayReadiness,evidenceFromReadOnlyInventories}
 from './production-readiness-gates.mjs';
test('isolated CI passing with no production proof means NO-GO',()=>{
 const r=assessPrivatePlayReadiness({staging:{allGithubActionsPassed:true}});
 assert.equal(r.go,false);
 assert.ok(r.remaining>=20);
 assert.ok(r.blockers.includes('REAL_RESTORE_REHEARSAL_MISSING'));
 assert.ok(r.blockers.includes('PIT_AUTH_USER_SESSION_UNVERIFIED'));
});
test('live exposed GM4WD state can never be bypassed by authored green flags',()=>{
 const observed=evidenceFromReadOnlyInventories({
  club:{members_rls:false,members_force_rls:false,
    anon_member_select:true,anon_member_insert:true,owner_pinned:false,
    approved_eligible_member_count:0},
  pit:{verified_linked_players:0,link_evidence_table:false,nonce_table:false,
    historical_tickets_preserved:true,historical_ledger_preserved:true,
    unreleased_games_server_blocked:false},
 });
 const r=assessPrivatePlayReadiness({
  ...observed,
  backup:{freshConsistentSnapshot:true,restoreRehearsalPassed:true,
   storageAndRoleReconciliation:true},
 });
 assert.equal(r.go,false);
 for(const x of ['GM4WD_MEMBERS_RLS_OFF','GM4WD_ANON_MEMBER_READ_EXPOSED',
  'GM4WD_ANON_MEMBER_WRITE_EXPOSED','PIT_EXISTING_IDENTITY_LINK_UNVERIFIED',
  'UNRELEASED_GAMES_NOT_DISABLED'])assert.ok(r.blockers.includes(x),x);
});
test('only separately supported actual production evidence can pass',()=>{
 const b={freshConsistentSnapshot:true,restoreRehearsalPassed:true,
  storageAndRoleReconciliation:true};
 const club={p3OwnerAndStaffFlowPassed:true,membersRlsEnabled:true,
  membersRlsForced:true,anonMemberSelectRevoked:true,
  anonMemberInsertRevoked:true,ownerAuthorityPinned:true,
  ownerApprovedAdultAccessLive:true};
 const pit={existingMemberPlayerAuthLinksVerified:true,
  linkEvidenceTableDeployed:true,oneUseNonceAtomicInProduction:true};
 const auth={crossOriginPostReceiverLive:true,
  pitSessionExistingUserBound:true,loginLogoutRevocationE2EPassed:true};
 const games={mcl43RaceLifecycleServerEnforced:true,
  mclWeightedPayoutServerEnforced:true,mini4wdAtomicRiskLive:true,
  mini4wdSettlementVoidE2E:true,
  historicalSeasonExceptionResolvedWithoutRewrite:true,
  historicalTicketsAndLedgerPreserved:true,vaultAndArcadeNotPlayable:true};
 const operations={tier1ReserveReallyFundedAndAudited:true,
  eventAndUnsettledLimitsAtomic:true,authorizedPhysicalOperatorFlowTested:true,
  virtualOnlyComplianceReviewed:true};
 const complete={backup:b,gm4wd:club,pit,auth,games,operations};
 assert.equal(assessPrivatePlayReadiness(complete).go,true);
 for(const key of Object.keys(complete)){
  for(const prop of Object.keys(complete[key])){
   const copy=structuredClone(complete);copy[key][prop]=false;
   const result=assessPrivatePlayReadiness(copy);
   assert.equal(result.go,false,key+'.'+prop);
   assert.equal(result.remaining,1,key+'.'+prop);
  }
 }
});
test('readonly inventory mapping never turns unknown into approval',()=>{
 const r=evidenceFromReadOnlyInventories({});
 assert.equal(r.gm4wd.membersRlsEnabled,false);
 assert.equal(r.pit.linkEvidenceTableDeployed,false);
 assert.equal(r.games.vaultAndArcadeNotPlayable,false);
});
test('test-only feature flags cannot substitute for real server blocking',()=>{
 const r=assessPrivatePlayReadiness({games:{
  vaultAndArcadeNotPlayable:false,unreleasedGamesHiddenInUI:true
 }});
 assert.ok(r.blockers.includes('UNRELEASED_GAMES_NOT_DISABLED'));
});

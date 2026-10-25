import test from 'node:test';
import assert from 'node:assert/strict';
import { P0_POLICY as P } from './p0-policy.mjs';
import { evaluateMCLStakePolicy as assess } from './mcl-stake-policy.mjs';
const ticket=(kind,stake,raceId='race1',status='active',playerId='player1',seasonId='season1')=>({kind,stake,raceId,playerId,seasonId,status});
const attempt=(proposed,tickets=[])=>assess({proposed,tickets});
test('P0 limits exactly match the 2026-10-24 owner approval',()=>{
  assert.equal(P.tier,1);
  assert.equal(P.initialOperatorReserve,30000);
  assert.equal(P.automaticTierUpgrade,false);
  assert.equal(P.mcl.winnerTicketMax,50);
  assert.equal(P.mcl.positionTicketMax,50);
  assert.equal(P.mcl.racePlayerCombinedMax,100);
  assert.equal(P.mcl.championTicketMax,25);
  assert.equal(P.mcl.championSeasonPlayerMax,100);
  assert.equal(P.mini4wd.winnerTicketMax,25);
  assert.equal(P.mini4wd.podiumTicketMax,25);
  assert.equal(P.mini4wd.playerHeatCombinedMax,100);
  assert.equal(P.risk.eventNetDownsideMax,1000);
  assert.equal(P.risk.combinedUnsettledNetDownsideMax,3000);
  assert.equal(P.settlement.organizerVoidRefundPercent,100);
  assert.equal(P.settlement.unclaimedChampionDisposition,'operator-after-official-settlement-no-rollover');
  assert.equal(P.settlement.postSettlementCorrections,'owner-controlled-compensating-ledger-only');
  assert.deepEqual([P.mcl.fundedPrizeNumerator,P.mcl.fundedPrizeDenominator],[40,100]);
  assert.deepEqual([P.mcl.championReturnCap,P.mcl.winnerReturnCap,P.mcl.positionReturnCap],[8,2,3]);
});
test('race winner at owner-approved 50 accepted only as a model',()=>{
  const r=attempt(ticket('winner',50));
  assert.equal(r.accepted,true);assert.equal(r.reason,'MODEL_ONLY_NOT_TRANSACTIONAL');
});
test('race winner ticket exceeding 50 is rejected',()=>{
  assert.equal(attempt(ticket('winner',51)).reason,'RACE_TICKET_CAP');
});
test('exact-position ticket exceeding 50 is rejected',()=>{
  assert.equal(attempt(ticket('position',51)).reason,'RACE_TICKET_CAP');
});
test('combined winner/exact 100 accepted but 101 rejected within same race',()=>{
  const existing=[ticket('winner',50),ticket('position',50)];
  assert.equal(attempt(ticket('position',1),existing).reason,'COMBINED_RACE_CAP');
  assert.equal(attempt(ticket('winner',50),[ticket('position',50)]).accepted,true);
});
test('other races and other players do not consume this player/race limit',()=>{
  const existing=[ticket('winner',50,'race2'),ticket('position',50,'race1','active','otherPlayer')];
  assert.equal(attempt(ticket('winner',50),existing).accepted,true);
});
test('MCL champion ticket 25 accepted, 26 rejected',()=>{
  assert.equal(attempt(ticket('champion',25)).accepted,true);
  assert.equal(attempt(ticket('champion',26)).reason,'CHAMPION_TICKET_CAP');
});
test('MCL champion season max 100 aggregates across champion tickets',()=>{
  const existing=Array.from({length:4},()=>ticket('champion',25));
  assert.equal(attempt(ticket('champion',1),existing).reason,'CHAMPION_SEASON_CAP');
  assert.equal(attempt(ticket('champion',25),existing.slice(0,3)).accepted,true);
});
test('historic cancelled and organizer-voided tickets retained but not active exposure',()=>{
  const existing=[ticket('champion',25,'race1','cancelled'),ticket('champion',25,'race1','void')];
  assert.equal(attempt(ticket('champion',25),existing).accepted,true);
});
test('all active outcomes count towards same race cap regardless of market',()=>{
  assert.equal(attempt(ticket('winner',50),[ticket('position',50)]).accepted,true);
  assert.equal(attempt(ticket('position',50),[ticket('winner',50)]).accepted,true);
});
test('incomplete or unknown status inventory fails closed',()=>{
  const bad=[{...ticket('winner',50),status:'unknown'}];
  assert.equal(attempt(ticket('winner',5),bad).reason,'INCOMPLETE_INVENTORY');
});
test('missing race, player, season or zero stake fails closed',()=>{
  for(const wrong of [{...ticket('winner',10),raceId:''},{...ticket('winner',10),playerId:''},
    {...ticket('winner',10),seasonId:''},ticket('winner',0)])
    assert.equal(attempt(wrong).reason,'INVALID_REQUEST');
});

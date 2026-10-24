import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyMCLFundedMarket as classify} from './mcl-funding-audit.mjs';
const champ=(contributed,payoutsPaid,officiallySettled)=>classify({contributed,payoutsPaid,officiallySettled,marketKind:'champion'});
test('unsettled 1,000 4W pool reserves 400; recognizes no operator revenue',()=>{
  const r=champ(1000,0,false);
  assert.deepEqual([r.fundedPrizeBudget,r.pendingOperatorShare,r.unsettledPrizeRemainder,r.operatorRecognized,r.rollover],[400,600,400,0,0]);
});
test('winning weighted allocations paid 400 leave no unclaimed after official settlement',()=>{
  const r=champ(1000,400,true);
  assert.equal(r.valid,true);
  assert.deepEqual([r.baseOperatorShare,r.operatorUnclaimedRecognized,r.playerPayoutRecognized,r.operatorRecognized],[600,0,400,600]);
});
test('champion with nobody choosing winner: all 40 percent unclaimed transfers only on official settlement',()=>{
  const pending=champ(1000,0,false);
  assert.equal(pending.operatorUnclaimedRecognized,0);
  const official=champ(1000,0,true);
  assert.deepEqual([official.operatorUnclaimedRecognized,official.operatorRecognized,official.rollover],[400,1000,0]);
});
test('partial unclaimed 400 prize - 320 paid transfers 80 after official settlement',()=>{
  const r=champ(1000,320,true);
  assert.deepEqual([r.unclaimedSeparatelyAudited,r.operatorUnclaimedRecognized,r.operatorRecognized,r.playerPayoutRecognized],[80,80,680,320]);
});
test('whole 4W funding allocation floor applied without hypothetical cash',()=>{
  const r=champ(7,2,true);
  assert.deepEqual([r.fundedPrizeBudget,r.baseOperatorShare,r.playerPayoutRecognized,r.unclaimedSeparatelyAudited],[2,5,2,0]);
});
test('payout above 40 percent pool fails closed',()=>{
  assert.equal(champ(1000,401,true).reason,'OVERFUNDED_PAYOUT');
});
test('non-champion market unclaimed disposition is NOT falsely treated as approved',()=>{
  const r=classify({contributed:1000,payoutsPaid:200,officiallySettled:true,marketKind:'winner'});
  assert.equal(r.reason,'NON_CHAMPION_UNCLAIMED_POLICY_UNCONFIRMED');
});
test('non-champion pool may reconcile fully claimed funding but does not expand prize pot',()=>{
  const r=classify({contributed:1000,payoutsPaid:400,officiallySettled:true,marketKind:'position'});
  assert.equal(r.valid,true);assert.equal(r.operatorRecognized,600);
});
test('unsupported market kind or invalid whole-coin input fails closed',()=>{
  assert.equal(classify({contributed:1000,payoutsPaid:400,officiallySettled:true,marketKind:'unknown'}).reason,'INVALID_ACCOUNTING');
  assert.equal(champ(1.5,0,true).reason,'INVALID_ACCOUNTING');
});

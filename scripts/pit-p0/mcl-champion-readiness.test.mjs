import test from 'node:test';
import assert from 'node:assert/strict';
import {assessChampionReadiness as assess} from './mcl-champion-readiness.mjs';
const marbles=Array.from({length:24},(_,i)=>`M${i+1}`);
function fixture(){
  const races=[];
  for(let i=0;i<40;i++){
    const lineup=marbles.slice((i%4)*6,(i%4)*6+6);
    races.push({phase:'regular',status:'settled',lineup,result:[...lineup]});
  }
  const p1=marbles.slice(0,6),p2=marbles.slice(6,12);
  races.push({phase:'playoff',status:'settled',lineup:p1,result:[...p1]});
  races.push({phase:'playoff',status:'settled',lineup:p2,result:[...p2]});
  const finalists=[...p1.slice(0,3),...p2.slice(0,3)];
  races.push({phase:'final',status:'settled',lineup:finalists,result:[...finalists]});
  const markets=[{kind:'champion',status:'locked'},
    ...Array.from({length:86},()=>({kind:'race',status:'settled'}))];
  return {season:{status:'live'},marbles,races,markets,declaredChampion:finalists[0]};
}
test('valid 43-race season passes fixture check',()=>assert.equal(assess(fixture()).ok,true));
test('a prematurely completed season must not re-settle',()=>{
  const x=fixture();x.season.status='complete';
  assert.equal(assess(x).code,'SEASON_NOT_LIVE');
});
test('40 regular races without playoffs/final fail',()=>{
  const x=fixture();x.races=x.races.slice(0,40);
  assert.equal(assess(x).code,'RACE_COUNTS_INVALID');
});
test('unsettled race fails',()=>{
  const x=fixture();x.races[10].status='open';
  assert.equal(assess(x).code,'RACE_NOT_SETTLED');
});
test('duplicate finish position fails',()=>{
  const x=fixture();x.races[0].result=['M1','M1','M3','M4','M5','M6'];
  assert.equal(assess(x).code,'RESULT_NOT_PERMUTATION_OF_LINEUP');
});
test('incorrect final champion fails',()=>{
  const x=fixture();x.declaredChampion='M8';
  assert.equal(assess(x).code,'CHAMPION_NOT_FINAL_WINNER');
});
test('final lineup not derived from playoff winners fails',()=>{
  const x=fixture();x.races[42].lineup[0]='M10';
  x.races[42].result[0]='M10';x.declaredChampion='M10';
  assert.equal(assess(x).code,'FINAL_BRACKET_MISMATCH');
});
test('unsettled race market fails',()=>{
  const x=fixture();x.markets[12].status='open';
  assert.equal(assess(x).code,'MARKETS_NOT_SETTLED');
});
test('unlocked champion market fails',()=>{
  const x=fixture();x.markets[0].status='open';
  assert.equal(assess(x).code,'MARKETS_NOT_SETTLED');
});
test('missing market fails',()=>{
  const x=fixture();x.markets.pop();
  assert.equal(assess(x).code,'MARKET_COUNTS_INVALID');
});

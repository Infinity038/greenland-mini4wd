import test from 'node:test';
import assert from 'node:assert/strict';
import {riskSnapshot,evaluateMini4WDAdmission as evaluate} from './mini4wd-exposure.mjs';
const limits={ticketMax:25,playerEventMax:100,eventNetMax:1000,combinedNetMax:3000,settledFreeReserve:30000,earmarkedLiabilities:0};
const heat=(id='h1',mode='win',status='open')=>({id,mode,status,entryIds:['a','b','c','d','e','f']});
const ticket=(heatId='h1',entryId='a',playerId='p1',stake=20,oddsCents=536)=>({heatId,entryId,playerId,stake,oddsCents});
const evaluateWith=(arg={})=>evaluate({
  events:[heat()],tickets:[],proposed:ticket(),limits,...arg
});
test('source total return is floor(stake × locked quote): 20 × 5.36 → 107',()=>{
  const x=riskSnapshot([heat()],[ticket()]);
  assert.equal(x.events[0].worstGrossSettlement,107);
  assert.equal(x.events[0].fullVoidRefund,20);
  assert.equal(x.totalGuaranteed,107);
});
test('all bets on same Winner entry may pay simultaneously',()=>{
  const x=riskSnapshot([heat()],[ticket(),ticket('h1','a','p2',10,200)]);
  assert.equal(x.events[0].worstGrossSettlement,127);
});
test('only the largest one Winner outcome is a possible winner',()=>{
  const x=riskSnapshot([heat()],[ticket(),ticket('h1','b','p2',10,500)]);
  assert.equal(x.events[0].worstGrossSettlement,107);
});
test('podium maximum pays three winning entries concurrently',()=>{
  const x=riskSnapshot([heat('h1','podium')],
    [ticket('h1','a','p1',10,1000),ticket('h1','b','p2',10,800),
      ticket('h1','c','p3',10,600),ticket('h1','d','p4',10,150)]);
  assert.equal(x.events[0].worstGrossSettlement,240);
});
test('void liability is full stake refunds where larger than winning returns',()=>{
  const x=riskSnapshot([heat()],[
    ticket('h1','a','p1',20,101),ticket('h1','b','p2',20,101)
  ]);
  assert.equal(x.events[0].fullVoidRefund,40);
  assert.equal(x.events[0].grossGuaranteed,40);
});
test('happy-path admission remains explicitly model-only',()=>{
  const x=evaluateWith();assert.equal(x.accepted,true);
  assert.equal(x.reason,'MODEL_ONLY_NOT_TRANSACTIONAL');
});
test('missing reserve numbers fail closed',()=>{
  const x=evaluateWith({limits:{...limits,settledFreeReserve:undefined}});
  assert.equal(x.reason,'POLICY_NOT_CONFIGURED');
});
test('closed heat cannot accept',()=>{
  const x=evaluateWith({events:[heat('h1','win','locked')]});
  assert.equal(x.reason,'HEAT_OR_ENTRY_NOT_OPEN');
});
test('ticket cap rejected before any balance mutation',()=>{
  const x=evaluateWith({proposed:ticket('h1','a','p1',26,536)});
  assert.equal(x.reason,'TICKET_CAP');
});
test('same player/heat cap includes all prior accepted stakes',()=>{
  const tickets=Array.from({length:4},(_,i)=>ticket('h1',['b','c','d','e'][i],'p1',25,120));
  const x=evaluateWith({tickets,proposed:ticket('h1','a','p1',25,500)});
  assert.equal(x.reason,'PLAYER_EVENT_CAP');
});
test('one player cannot duplicate a car selection in same heat',()=>{
  const x=evaluateWith({tickets:[ticket('h1','a','p1',20,150)]});
  assert.equal(x.reason,'DUPLICATE_SELECTION');
});
test('event downside cap is not silently ignored',()=>{
  const x=evaluateWith({proposed:ticket('h1','a','p1',25,5000)});
  assert.equal(x.reason,'EVENT_DOWNSIDE_CAP');
});
test('unsettled independent events share combined downside capacity',()=>{
  const events=Array.from({length:6},(_,i)=>heat('h'+(i+1)));
  const tickets=events.slice(0,5).map((h,i)=>ticket(h.id,'a','p'+(i+1),25,2500));
  const proposed=ticket('h6','a','p6',25,2500);
  const x=evaluateWith({events,tickets,proposed});
  assert.equal(x.reason,'COMBINED_DOWNSIDE_CAP');
});
test('gross payout funding is reserved separately from net downside',()=>{
  const x=evaluateWith({limits:{...limits,settledFreeReserve:70}});
  assert.equal(x.reason,'GROSS_PAYOUT_CAPACITY');
});
test('operator reserve ear-marks reduce available gross funding',()=>{
  const x=evaluateWith({limits:{...limits,settledFreeReserve:150,earmarkedLiabilities:50}});
  assert.equal(x.reason,'GROSS_PAYOUT_CAPACITY');
});
test('podium under four entries fails as invalid market',()=>{
  const x=evaluateWith({events:[{...heat('h1','podium'),entryIds:['a','b','c']}]});
  assert.equal(x.reason,'INVALID_OR_INCOMPLETE_INVENTORY');
});
test('cannot omit a pending heat from combined exposure inventory',()=>{
  const x=evaluateWith({tickets:[ticket('unlisted','a','p2',25,150)]});
  assert.equal(x.reason,'INVALID_OR_INCOMPLETE_INVENTORY');
});
test('invalid odds or stake cannot be interpreted as an accepted quote',()=>{
  assert.equal(evaluateWith({proposed:ticket('h1','a','p1',20,99)}).reason,'INVALID_QUOTE');
  assert.equal(evaluateWith({proposed:ticket('h1','a','p1',0,536)}).reason,'INVALID_QUOTE');
});

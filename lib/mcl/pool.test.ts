import { describe, expect, it } from 'vitest';
import { indicativePoolMultiplier, settleFundedPool, type PoolTicket } from './pool';

describe('MCL virtual-only funded pool', () => {
  it('protects operator allocation even if all 50 participants select the winning marble', () => {
    const tickets: PoolTicket[] = Array.from({length:50},(_,i)=>({
      id:`p${i}`, outcome:'RED', stake:100+i, weight:1,
    }));
    const result = settleFundedPool(tickets, 'RED', 2);
    expect(result.operatorAllocation).toBeGreaterThanOrEqual(result.contributed*0.6);
    expect(result.winnerPayments.reduce((s,p)=>s+p.amount,0)).toBeLessThanOrEqual(result.initialPrizeAllocation);
    expect(result.winnerPayments.every((p,i)=>p.amount <= tickets[i].stake*2)).toBe(true);
  });
  it('weights early champion entries fourfold when both outcomes are correct', () => {
    const r = settleFundedPool([
      {id:'early',outcome:'RED',stake:100,weight:4},
      {id:'late',outcome:'RED',stake:100,weight:1},
      {id:'other',outcome:'BLUE',stake:800,weight:1},
    ],'RED',8);
    expect(r.initialPrizeAllocation).toBe(400);
    expect(r.winnerPayments).toEqual([{ticketId:'early',amount:320},{ticketId:'late',amount:80}]);
  });
  it('never pays above the individual cap; unclaimed allocation does not automatically roll over',()=>{
    const r=settleFundedPool([
      {id:'one',outcome:'RED',stake:100,weight:4},
      {id:'others',outcome:'BLUE',stake:4900,weight:1},
    ],'RED',8);
    expect(r.initialPrizeAllocation).toBe(2000);
    expect(r.winnerPayments).toEqual([{ticketId:'one',amount:800}]);
    expect(r.unclaimedAllocation).toBe(1200);
    expect(settleFundedPool([{id:'only',outcome:'BLUE',stake:1000,weight:1}],'RED',8).unclaimedAllocation).toBe(400);
  });
  it('reserves accepted cashouts from the same 40% prize allocation and rejects underfunded cashout',()=>{
    const t=[{id:'a',outcome:'RED',stake:1000,weight:1}];
    const r=settleFundedPool(t,'RED',8,100);
    expect(r.alreadyPaidCashouts+r.winnerPayments[0].amount+r.unclaimedAllocation).toBe(400);
    expect(()=>settleFundedPool(t,'RED',8,401)).toThrow(/Cash-out/);
  });
  it('has no fictitious opening x8 guarantee on an empty pool',()=>{
    expect(indicativePoolMultiplier([], 'RED', 100, 4, 8)).toBe(0.4);
    const t: PoolTicket[]=[{id:'blue',outcome:'BLUE',stake:4900,weight:1}];
    expect(indicativePoolMultiplier(t,'RED',100,4,8)).toBe(8);
    const withRed=[...t,{id:'red',outcome:'RED',stake:100,weight:4}];
    expect(indicativePoolMultiplier(withRed,'RED',100,4,8)).toBeLessThan(8);
  });
  it('rejects duplicate ticket IDs and invalid stakes',()=>{
    const ticket={id:'a',outcome:'RED',stake:100,weight:1};
    expect(()=>settleFundedPool([ticket,ticket],'RED',8)).toThrow();
    expect(()=>settleFundedPool([{...ticket,stake:-1}],'RED',8)).toThrow();
  });
});

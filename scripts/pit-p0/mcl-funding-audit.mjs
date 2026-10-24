import { P0_POLICY } from './p0-policy.mjs';

/**
 * P0 accounting-only verification, NOT a payout allocator or wallet writer.
 * The actual weighted payout amount must first be computed and independently
 * verified against immutable tickets and individual 8x/2x/3x caps.
 * This step only classifies the 40%-funded prize pot and unclaimed disposition.
 */
export function classifyMCLFundedMarket({contributed,payoutsPaid,officiallySettled,marketKind}) {
  const valid=x=>Number.isSafeInteger(x)&&x>=0;
  if (!valid(contributed)||!valid(payoutsPaid)||
      typeof officiallySettled!=='boolean'||
      !['champion','winner','position'].includes(marketKind)) {
    return {valid:false,reason:'INVALID_ACCOUNTING'};
  }
  const prize=Math.floor(contributed*P0_POLICY.mcl.fundedPrizeNumerator/P0_POLICY.mcl.fundedPrizeDenominator);
  if (!valid(prize)||payoutsPaid>prize) return {valid:false,reason:'OVERFUNDED_PAYOUT'};
  const baseOperator=contributed-prize;
  const unclaimed=prize-payoutsPaid;
  if (!officiallySettled) {
    // Neither deposited stakes nor any "unclaimed" portion can be recognized
    // as settled operator revenue while the market is still open.
    return {valid:true,state:'PENDING',fundedPrizeBudget:prize,
      pendingOperatorShare:baseOperator,unsettledPrizeRemainder:unclaimed,
      operatorRecognized:0,operatorUnclaimedRecognized:0,
      playerPayoutRecognized:0,rollover:0};
  }
  // The owner approved AFTER-official-settlement operator recognition of
  // UNCLAIMED CHAMPION funds specifically. Other market dispositions are
  // not authorized by this policy contract, so fail closed for their
  // unclaimed allocations pending separate confirmation.
  if (marketKind!=='champion'&&unclaimed>0)
    return {valid:false,reason:'NON_CHAMPION_UNCLAIMED_POLICY_UNCONFIRMED'};
  const recognizedUnclaimed=marketKind==='champion'?unclaimed:0;
  const recognizedOperator=baseOperator+recognizedUnclaimed;
  if (!valid(recognizedOperator)||recognizedOperator+payoutsPaid!==contributed) {
    return {valid:false,reason:'RECONCILIATION_FAILURE'};
  }
  return {valid:true,state:'SETTLED',fundedPrizeBudget:prize,
    baseOperatorShare:baseOperator,unclaimedSeparatelyAudited:unclaimed,
    operatorRecognized:recognizedOperator,
    operatorUnclaimedRecognized:recognizedUnclaimed,
    playerPayoutRecognized:payoutsPaid,rollover:0};
}

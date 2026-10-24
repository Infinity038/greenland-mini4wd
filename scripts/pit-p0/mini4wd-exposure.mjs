/**
 * Prediction Pit Mini4WD - isolated deterministic risk model for P0 review.
 * No database, wallet, server clock or authorization integration.
 * The numeric caps are INPUTS and require explicit owner approval before use.
 *
 * Each accepted ticket has an immutable integer-cent odds quote. Payouts
 * include the initial stake: floor(stake * oddsCents / 100).
 *
 * For a Winner heat, exactly one entry wins. For a Podium heat, any three
 * distinct eligible entries may win. The worst legal outcome is therefore the
 * largest one, or three, *entry-aggregated* total payout(s), respectively.
 *
 * A void could refund every pending ticket; the maximum liability of each
 * event is max(worst settlement, all-stake refund). Sum these maxima across
 * independent unsettled events. No unsettled stakes are credited to the
 * settled operator reserve when checking gross funding capacity.
 */
const int = x => Number.isSafeInteger(x) && x >= 0;
const positive = x => int(x) && x > 0;
const fail = (reason) => ({accepted:false,reason});
const safeSum = values => {
  let n=0;
  for (const x of values){n+=x;if(!int(n))throw Error('integer overflow');}
  return n;
};
export function riskSnapshot(events, tickets) {
  if(!Array.isArray(events)||!Array.isArray(tickets))throw Error('missing event inventory');
  const ids=new Set(), rows=[];
  for(const e of events){
    if(typeof e.id!=='string'||!e.id||ids.has(e.id))throw Error('invalid/duplicate event');
    ids.add(e.id);
    if(!['win','podium'].includes(e.mode)||!['open','locked'].includes(e.status))throw Error('invalid event mode/status');
    const entries=e.entryIds;
    if(!Array.isArray(entries)||entries.length<2||entries.length>12||new Set(entries).size!==entries.length||entries.some(x=>typeof x!=='string'||!x))throw Error('invalid entry roster');
    if(e.mode==='podium'&&entries.length<4)throw Error('podium needs at least four entries');
    const sums=new Map(entries.map(x=>[x,0]));
    const bets=tickets.filter(x=>x.heatId===e.id);
    for(const bet of bets){
      if(!sums.has(bet.entryId)||typeof bet.playerId!=='string'||!bet.playerId||
        !positive(bet.stake)||!int(bet.oddsCents)||bet.oddsCents<101)throw Error('invalid accepted ticket');
      // Approved quotes are stored to cents, not recomputed from changed market demand.
      const gross=Math.floor(bet.stake*bet.oddsCents/100);
      if(!int(gross)||!int(sums.get(bet.entryId)+gross))throw Error('payout overflow');
      sums.set(bet.entryId,sums.get(bet.entryId)+gross);
    }
    const totals=[...sums.values()].sort((a,b)=>b-a);
    const grossSettle=safeSum(totals.slice(0,e.mode==='win'?1:3));
    const refund=safeSum(bets.map(b=>b.stake));
    const grossGuaranteed=Math.max(grossSettle,refund);
    // This metric is for proposed per-event downside; it NEVER funds payout
    // promises. Gross guaranteed liability is protected separately.
    const netDownside=Math.max(0,grossGuaranteed-refund);
    rows.push({id:e.id,mode:e.mode,stakeTotal:refund,worstGrossSettlement:grossSettle,fullVoidRefund:refund,grossGuaranteed,netDownside});
  }
  if(tickets.some(b=>!ids.has(b.heatId)))throw Error('unresolved event omitted from inventory');
  return {
    events:rows,
    totalGuaranteed:safeSum(rows.map(x=>x.grossGuaranteed)),
    combinedNetDownside:safeSum(rows.map(x=>x.netDownside))
  };
}
export function evaluateMini4WDAdmission({events,tickets,proposed,limits}){
  try{
    if(!proposed||!limits)return fail('MISSING_REQUEST_OR_POLICY');
    const fields=['ticketMax','playerEventMax','eventNetMax','combinedNetMax','settledFreeReserve','earmarkedLiabilities'];
    if(fields.some(k=>!int(limits[k])))return fail('POLICY_NOT_CONFIGURED');
    if(fields.slice(0,4).some(k=>!positive(limits[k]))||limits.settledFreeReserve<=0)return fail('POLICY_NOT_CONFIGURED');
    const e=events?.find(x=>x.id===proposed.heatId);
    if(!e||e.status!=='open'||!e.entryIds?.includes(proposed.entryId))return fail('HEAT_OR_ENTRY_NOT_OPEN');
    if(!positive(proposed.stake)||!int(proposed.oddsCents)||proposed.oddsCents<101||typeof proposed.playerId!=='string'||!proposed.playerId)return fail('INVALID_QUOTE');
    if(proposed.stake>limits.ticketMax)return fail('TICKET_CAP');
    const existing=tickets?.filter(x=>x.heatId===proposed.heatId&&x.playerId===proposed.playerId)??[];
    if(existing.some(x=>x.entryId===proposed.entryId))return fail('DUPLICATE_SELECTION');
    if(safeSum([...existing.map(x=>x.stake),proposed.stake])>limits.playerEventMax)return fail('PLAYER_EVENT_CAP');
    const inventory=riskSnapshot(events,[...tickets,proposed]);
    const row=inventory.events.find(x=>x.id===proposed.heatId);
    if(row.netDownside>limits.eventNetMax)return fail('EVENT_DOWNSIDE_CAP');
    if(inventory.combinedNetDownside>limits.combinedNetMax)return fail('COMBINED_DOWNSIDE_CAP');
    // The unsettled player stakes are NOT added to settledFreeReserve.
    if(inventory.totalGuaranteed>limits.settledFreeReserve-limits.earmarkedLiabilities)
      return fail('GROSS_PAYOUT_CAPACITY');
    return {accepted:true,reason:'MODEL_ONLY_NOT_TRANSACTIONAL',exposure:inventory};
  }catch{return fail('INVALID_OR_INCOMPLETE_INVENTORY')}
}

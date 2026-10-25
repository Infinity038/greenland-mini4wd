import { P0_POLICY } from './p0-policy.mjs';

/**
 * Check a proposed MCL ticket against the owner-approved stake ceilings.
 * READ-ONLY pure model. Inputs MUST ultimately come from one authenticated,
 * locked database transaction; this function alone cannot authorize play.
 *
 * tickets are the COMPLETE server-provided inventory of tickets for the
 * relevant participant. Excludes cancelled and organizer-voided tickets from
 * active exposure. Existing historical/settled rows are never deleted.
 * MCL payout remains funded-pool 60/40; this module DOES NOT quote odds.
 */
export function evaluateMCLStakePolicy({ tickets, proposed }) {
  const deny = reason => ({accepted:false,reason});
  if (!Array.isArray(tickets)||!proposed||typeof proposed!=='object') return deny('INCOMPLETE_INVENTORY');
  const validInt=x=>Number.isSafeInteger(x)&&x>0;
  const validId=x=>typeof x==='string'&&x.trim().length>0;
  if (!validId(proposed.playerId)||!validId(proposed.seasonId)||
    !['winner','position','champion'].includes(proposed.kind)||
    !validInt(proposed.stake)) return deny('INVALID_REQUEST');
  if (proposed.kind!=='champion'&&!validId(proposed.raceId)) return deny('INVALID_REQUEST');
  let subtotal=proposed.stake;
  for (const t of tickets) {
    if (!t || !validId(t.playerId)||!validId(t.seasonId)||
        !['winner','position','champion'].includes(t.kind)||
        !validInt(t.stake)||!['active','won','lost','cancelled','void'].includes(t.status)||
        (t.kind!=='champion'&&!validId(t.raceId))) return deny('INCOMPLETE_INVENTORY');
    if (t.playerId!==proposed.playerId||t.seasonId!==proposed.seasonId||t.status!=='active') continue;
    if (proposed.kind==='champion'&&t.kind==='champion') subtotal+=t.stake;
    if (proposed.kind!=='champion'&&t.kind!=='champion'&&t.raceId===proposed.raceId) subtotal+=t.stake;
    if (!Number.isSafeInteger(subtotal)) return deny('UNSAFE_INTEGER');
  }
  const p=P0_POLICY.mcl;
  if (proposed.kind==='champion') {
    if (proposed.stake>p.championTicketMax) return deny('CHAMPION_TICKET_CAP');
    if (subtotal>p.championSeasonPlayerMax) return deny('CHAMPION_SEASON_CAP');
  } else {
    if (proposed.stake>(proposed.kind==='winner'?p.winnerTicketMax:p.positionTicketMax))
      return deny('RACE_TICKET_CAP');
    if (subtotal>p.racePlayerCombinedMax) return deny('COMBINED_RACE_CAP');
  }
  return {accepted:true,reason:'MODEL_ONLY_NOT_TRANSACTIONAL',aggregatePlayerStake:subtotal};
}

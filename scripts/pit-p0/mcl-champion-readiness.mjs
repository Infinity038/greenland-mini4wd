/** Pure P0 championship gate model for review-only fixtures; no DB/wallet writes.
 *  Do not confuse this fixture model with authenticated Postgres rehearsal. */
export function assessChampionReadiness({season,marbles,races,markets,declaredChampion}) {
  if(season?.status!=='live') return {ok:false,code:'SEASON_NOT_LIVE'};
  if(!Array.isArray(marbles)||marbles.length!==24||new Set(marbles).size!==24)
    return {ok:false,code:'ROSTER_NOT_24_UNIQUE'};
  if(!Array.isArray(races)) return {ok:false,code:'RACES_MISSING'};
  const counts={regular:0,playoff:0,final:0};
  for(const r of races) {
    if(!(r.phase in counts)) return {ok:false,code:'UNKNOWN_PHASE'};
    counts[r.phase]++;
  }
  if(races.length!==43||counts.regular!==40||counts.playoff!==2||counts.final!==1)
    return {ok:false,code:'RACE_COUNTS_INVALID'};
  const roster=new Set(marbles);
  for(const r of races) {
    if(r.status!=='settled') return {ok:false,code:'RACE_NOT_SETTLED'};
    if(!Array.isArray(r.lineup)||!Array.isArray(r.result)||r.lineup.length!==6||r.result.length!==6)
      return {ok:false,code:'RESULT_MISSING_OR_INVALID'};
    if(new Set(r.result).size!==6||new Set(r.lineup).size!==6||
       r.result.some(x=>!r.lineup.includes(x))||r.lineup.some(x=>!roster.has(x)))
      return {ok:false,code:'RESULT_NOT_PERMUTATION_OF_LINEUP'};
  }
  const qualified=races.filter(r=>r.phase==='playoff').flatMap(r=>r.result.slice(0,3));
  const final=races.find(r=>r.phase==='final');
  if(new Set(qualified).size!==6||[...qualified].sort().join('|')!==[...final.lineup].sort().join('|'))
    return {ok:false,code:'FINAL_BRACKET_MISMATCH'};
  if(final.result[0]!==declaredChampion)
    return {ok:false,code:'CHAMPION_NOT_FINAL_WINNER'};
  if(!Array.isArray(markets)||markets.length!==87)
    return {ok:false,code:'MARKET_COUNTS_INVALID'};
  if(markets.filter(m=>m.kind==='champion'&&m.status==='locked').length!==1||
     markets.filter(m=>m.kind!=='champion'&&m.status==='settled').length!==86)
    return {ok:false,code:'MARKETS_NOT_SETTLED'};
  return {ok:true,code:'READY_FOR_OPERATOR_PAYOUT_QA'};
}

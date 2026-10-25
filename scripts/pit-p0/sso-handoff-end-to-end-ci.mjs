/**
 * End-to-end SYNTHETIC GM4WD -> Pit rehearsal, disposable CI DBs only.
 * Does not create real member/wallet links or issue real sessions.
 */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {issueHandoffTicket,redeemHandoffTicket,verifyHandoffTicket}
  from './sso-handoff-contract.mjs';
const member='11111111-1111-4111-8111-111111111111';
const linkedPlayer='22222222-2222-4222-8222-222222222222';
const legacyPlayer='11111111-1111-4111-8111-111111111111';
const owner='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const gm4wd='gm4wd_pit_approvals_ci',pit='pit_sso_disposable';
const secret=Buffer.alloc(32,42); // exclusively synthetic
const t=Math.floor(Date.now()/1000);
function pg(db,sql){
 return execFileSync('psql',['-X','-qAt','-v','ON_ERROR_STOP=1',
   '-h','127.0.0.1','-U','pit_test','-d',db,'-c',sql],
   {encoding:'utf8',env:process.env}).trim();
}
const esc=str=>str.replaceAll("'","''");
const ownerSQL=(allow)=>
  "BEGIN; SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claim.sub='"+owner+"';"+
  " SELECT public.pit_owner_set_member_access('"+member+"',"+
  (allow?'true':'false')+",true); COMMIT;";
assert.equal(pg(gm4wd,ownerSQL(true)),'t');

// This explicit manual link is for the two synthetic fixtures ONLY.
// Production must NEVER link valuable existing player by email or guessing.
const linked=pg(pit,"UPDATE pp.players SET member_id='"+member+"'"+
 " WHERE id='"+linkedPlayer+"' AND member_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';"+
 " SELECT count(*) FROM pp.players WHERE member_id='"+member+"';");
assert.equal(linked,'1');
assert.equal(pg(gm4wd,"SET ROLE anon; SELECT "+
 "public.pit_member_handoff_authorized(repeat('b',64))->>'member_id'; RESET ROLE;"),member);

const lookupLinkedPlayer=async mid=>{
 const row=pg(pit,"SELECT id::text||':'||member_id::text"+
   " FROM pp.players WHERE member_id='"+esc(mid)+"';");
 const pair=row.split(':');
 return pair.length===2?{id:pair[0],memberId:pair[1]}:null;
};
const isCurrentlyApproved=async mid=>
  pg(gm4wd,"SELECT exists(SELECT 1 FROM public.prediction_pit_access"+
  " WHERE member_id='"+esc(mid)+"' AND approved AND age_verified"+
  " AND revoked_at IS NULL);")==='t';
const atomicConsume=async ({memberId,playerId,nonceHash,expiresAt})=>{
 try {
  const sql="SET ROLE service_role; SELECT pp.p0_redeem_verified_handoff('"+
     esc(memberId)+"','"+esc(nonceHash)+"',to_timestamp("+
     Number(expiresAt)+"))::text; RESET ROLE;";
  return pg(pit,sql)===playerId;
 }catch{return false}
};
const ticket=()=>issueHandoffTicket({
 memberId:member,authorized:true,secret,nowSeconds:t,nonce:randomUUID()
});
const signed=ticket();
assert.equal(verifyHandoffTicket(signed,{secret,nowSeconds:t+1}).accepted,true);
const deps={secret,nowSeconds:t+1,isCurrentlyApproved,lookupLinkedPlayer,atomicConsume};
const accepted=await redeemHandoffTicket({token:signed,...deps});
assert.equal(accepted.accepted,true);
assert.equal(accepted.playerId,linkedPlayer);
assert.equal((await redeemHandoffTicket({token:signed,...deps})).code,'REPLAY_OR_EXPIRED');

// Revoke permission between issuance and exchange: signed ticket remains
// cryptographically valid, but authorization must fail before nonce is spent.
const prior=ticket();
assert.equal(pg(gm4wd,ownerSQL(false)),'t');
assert.equal((await redeemHandoffTicket({token:prior,...deps})).code,'APPROVAL_REQUIRED');

const baseline=pg(pit,
 "SELECT (SELECT count(*) FROM pp.players)::text||':'||"+
 "(SELECT count(*) FROM pp.wallet_accounts)::text||':'||"+
 "(SELECT sum(balance) FROM pp.wallet_accounts)::text||':'||"+
 "(SELECT count(*) FROM pp.players WHERE id='"+legacyPlayer+"'"+
 " AND member_id IS NULL)::text||':'||"+
 "(SELECT count(*) FROM pp.p0_handoff_redemptions)::text;");
assert.equal(baseline,'2:2:8100:1:2'); // one prior fixture and one redeemed
assert.equal(pg(gm4wd,'SELECT count(*) FROM public.club_member_sessions'),'3');
console.log('PASS: synthetic two-project signed SSO, one-use replay and owner revocation; historical wallet untouched.');

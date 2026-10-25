import test from 'node:test';
import assert from 'node:assert/strict';
import { issueHandoffTicket } from './sso-handoff-contract.mjs';
import {
 parsePitHandoffPost,completePitHandoff,pitHandoffResponse,
} from './pit-handoff-receiver.mjs';

const memberId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const playerId='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const authUserId='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const secret=Buffer.alloc(32,11), t=2000000000, tokens=new Set();
const clubOrigin='https://greenland-mini4wd.example.invalid';
const token=()=>issueHandoffTicket({memberId,authorized:true,secret,nowSeconds:t});
function deps(override={}) {
 let calls=[];
 const handlers={
  ticket:token(),secret,nowSeconds:t+1,
  isCurrentlyApproved:async()=>{calls.push('approval');return true},
  lookupLinkedPlayer:async()=>{calls.push('link');return {
   id:playerId,memberId,authUserId,verified:true,
  }},
  atomicConsume:async ({nonceHash})=>{
   calls.push('consume');if(tokens.has(nonceHash))return false;
   tokens.add(nonceHash);return true;
  },
  obtainUncommittedSession:async ({existingAuthUserId})=>{
   calls.push('auth');assert.equal(existingAuthUserId,authUserId);
   return {authUserId,accessToken:'synthetic_access',refreshToken:'synthetic_refresh'};
  },
  commitSession:async ({expectedAuthUserId,accessToken,refreshToken})=>{
   calls.push('commit');assert.equal(expectedAuthUserId,authUserId);
   assert.equal(accessToken,'synthetic_access');
   assert.equal(refreshToken,'synthetic_refresh');return true;
  },
  ...override,
 };
 return {args:handlers,calls};
}

test('only exact POST with one body ticket from correct club origin accepted',()=>{
 const ticket=token(),body=new URLSearchParams({ticket}).toString();
 const good={method:'POST',origin:clubOrigin,contentType:'application/x-www-form-urlencoded',
  body,expectedClubOrigin:clubOrigin,enabled:true};
 assert.deepEqual(parsePitHandoffPost(good),{ok:true,ticket});
 for(const [key,value] of [
   ['enabled',false],['method','GET'],['origin','https://attacker.invalid'],
   ['contentType','application/json'],['body','ticket='+ticket+'&ticket='+ticket],
   ['body','ticket='+ticket+'&wallet=overwrite'],['body','playerId='+playerId],
   ['body','ticket='+ticket+'&token=123'],['body','ticket='+('A'.repeat(2700))]]) {
   assert.equal(parsePitHandoffPost({...good,[key]:value}).ok,false,key);
 }
 assert.equal(parsePitHandoffPost({...good,expectedClubOrigin:'http://club.invalid'}).ok,false);
});
test('verified link then nonce then auth then SSR cookie commit ordering',async()=>{
 tokens.clear();const a=deps();
 const result=await completePitHandoff(a.args);
 assert.deepEqual(result,{ok:true,code:'AUTHENTICATED',redirectTo:'/'});
 assert.deepEqual(a.calls,['approval','link','consume','approval','auth','approval','commit']);
 assert.equal(result.playerId,undefined);
 assert.equal(result.authUserId,undefined);
});
test('replay fails before creating any second auth session',async()=>{
 tokens.clear();const first=deps();await completePitHandoff(first.args);
 const second=deps();const r=await completePitHandoff(second.args);
 assert.equal(r.code,'REPLAY_OR_EXPIRED');
 assert.deepEqual(second.calls,['approval','link','consume']);
});
test('expired token is denied before lookup or DB interactions',async()=>{
 const a=deps({nowSeconds:t+90});
 const r=await completePitHandoff(a.args);
 assert.equal(r.code,'INVALID_TICKET');assert.deepEqual(a.calls,[]);
});
test('current owner approval denied before any link or nonce writes',async()=>{
 const a=deps({isCurrentlyApproved:async()=>false});
 assert.equal((await completePitHandoff(a.args)).code,'NOT_APPROVED');
 assert.deepEqual(a.calls,[]);
});
test('absence of verified link or auth user cannot auto-create/link wallets',async()=>{
 for(const p of [null,
   {id:playerId,memberId,authUserId,verified:false},
   {id:playerId,memberId,authUserId:null,verified:true},
   {id:playerId,memberId:'dddddddd-dddd-4ddd-8ddd-dddddddddddd',authUserId,verified:true},
   {id:'malformed',memberId,authUserId,verified:true}]) {
  const a=deps({lookupLinkedPlayer:async()=>p});
  assert.equal((await completePitHandoff(a.args)).code,'VERIFIED_EXISTING_LINK_REQUIRED');
  assert.deepEqual(a.calls,['approval']);
 }
});
test('forged body cannot bypass verified cryptographic signature',async()=>{
 const bad=token().slice(0,-2)+'ZZ',a=deps({ticket:bad});
 assert.equal((await completePitHandoff(a.args)).code,'INVALID_TICKET');
 assert.equal(a.calls.length,0);
});
test('revocation between initial approval and consuming ticket denies new session',async()=>{
 let n=0;const a=deps({
  isCurrentlyApproved:async()=>++n===1,
 });
 assert.equal((await completePitHandoff(a.args)).code,'REVOKED');
 assert.equal(a.calls.includes('auth'),false);
 assert.equal(a.calls.includes('commit'),false);
});
test('revocation during auth acquisition prevents cookie session commit',async()=>{
 let n=0;const a=deps({
  isCurrentlyApproved:async()=>++n<3,
 });
 assert.equal((await completePitHandoff(a.args)).code,'REVOKED');
 assert.equal(a.calls.includes('commit'),false);
});
test('auth broker wrong user ID denied even if signed ticket and link valid',async()=>{
 const a=deps({
  obtainUncommittedSession:async()=>({
   authUserId:'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
   accessToken:'leaked',refreshToken:'bad',
  }),
 });
 assert.equal((await completePitHandoff(a.args)).code,'AUTH_SESSION_MISMATCH');
 assert.equal(a.calls.includes('commit'),false);
});
test('auth broker may never return empty credentials or create a session',async()=>{
 const a=deps({obtainUncommittedSession:async()=>null});
 assert.equal((await completePitHandoff(a.args)).code,'AUTH_SESSION_MISMATCH');
 assert.equal(a.calls.includes('commit'),false);
});
test('failed SSR session commit blocks redirect and hides credentials',async()=>{
 const a=deps({commitSession:async()=>false});
 const r=await completePitHandoff(a.args);
 assert.equal(r.code,'SESSION_COMMIT_DENIED');
 assert.equal(pitHandoffResponse(r).status,403);
 assert.equal(JSON.stringify(pitHandoffResponse(r)).includes('synthetic_'),false);
});
test('missing required adapter fails closed',async()=>{
 const a=deps({atomicConsume:null});
 assert.equal((await completePitHandoff(a.args)).code,'SERVER_DEPENDENCY_MISSING');
});
test('successful browser response is no-store, no referrer, same-origin relative redirect',()=>{
 const a=pitHandoffResponse({ok:true});
 assert.equal(a.status,303);assert.equal(a.headers.location,'/');
 assert.equal(a.headers['referrer-policy'],'no-referrer');
 assert.equal(a.headers['cache-control'],'no-store, private');
 assert.equal(a.body,'');
});
test('default-failed requests never echo ticket or identity',()=>{
 const response=pitHandoffResponse({ok:false,code:'INVALID_TICKET'});
 assert.equal(response.status,403);
 assert.equal(response.headers.location,'/access-denied');
 assert.equal(JSON.stringify(response).includes(memberId),false);
});

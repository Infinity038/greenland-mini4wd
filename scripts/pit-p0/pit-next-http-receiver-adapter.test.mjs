import test from 'node:test';
import assert from 'node:assert/strict';
import {issueHandoffTicket} from './sso-handoff-contract.mjs';
import {handlePitHandoffHttpRequest} from './pit-next-http-receiver-adapter.mjs';
const club='https://club.example.invalid';
const uid='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const mid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const secret=Buffer.alloc(32,72);
const issued=()=>issueHandoffTicket({memberId:mid,authorized:true,secret,nowSeconds:2000000000});
const makeReq=(ticket,origin=club)=>new Request('https://pit.example.invalid/api/sso/handoff',{
 method:'POST',headers:{origin},body:new URLSearchParams({ticket}),
});
function gates(){
 const used=new Set();let sessions=0;
 return {config:{enabled:true,clubOrigin:club,secret,nowSeconds:2000000001,
  isCurrentlyApproved:async()=>true,
  lookupLinkedPlayer:async()=>({id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    memberId:mid,authUserId:uid,verified:true}),
  atomicConsume:async ({nonceHash})=>{
   if(used.has(nonceHash))return false;
   used.add(nonceHash);return true;
  },
  obtainUncommittedSession:async()=>({authUserId:uid,
    accessToken:'test_access',refreshToken:'test_refresh'}),
  commitSession:async()=>{sessions++;return true},
 },getCount:()=>sessions};
}
test('approved cross-origin POST uses a relative 303 with no payload',async()=>{
 const g=gates(),response=await handlePitHandoffHttpRequest(makeReq(issued()),g.config);
 assert.equal(response.status,303);
 assert.equal(response.headers.get('location'),'/');
 assert.equal(response.headers.get('cache-control'),'no-store, private');
 assert.equal(await response.text(),'');
 assert.equal(g.getCount(),1);
});
test('one-time replay cannot create another session',async()=>{
 const g=gates(),signed=issued();
 const a=await handlePitHandoffHttpRequest(makeReq(signed),g.config);
 const b=await handlePitHandoffHttpRequest(makeReq(signed),g.config);
 assert.equal(a.status,303);assert.equal(b.status,403);assert.equal(g.getCount(),1);
});
test('unapproved requests and wrong origin are denied',async()=>{
 const g=gates();
 assert.equal((await handlePitHandoffHttpRequest(makeReq(issued(),'https://other.example.invalid'),g.config)).status,403);
 assert.equal((await handlePitHandoffHttpRequest(makeReq(issued()),{...g.config,enabled:false})).status,403);
 assert.equal(g.getCount(),0);
});

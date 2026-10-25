import test from 'node:test';
import assert from 'node:assert/strict';
import {signApprovalProbe,verifyApprovalProbe,
 decideApprovalProbe,checkCurrentOwnerApproval,APPROVAL_PATH}
from './cross-project-owner-approval.mjs';
const key=Buffer.alloc(32,87),wrongKey=Buffer.alloc(32,91);
const memberId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const at=2000000000;
const nonce='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const probe=()=>signApprovalProbe({memberId,key,nowSeconds:at,nonce});
test('exact current signed member-ID check verifies server-only',()=>{
 const p=probe();
 const r=verifyApprovalProbe({body:p.body,signature:p.signature,nowSeconds:at+5,key});
 assert.deepEqual(r,{ok:true,allowed:false,memberId});
 assert.equal(p.body.includes('@'),false);
});
test('wrong signing key and tampered UUID cannot be accepted',()=>{
 const p=probe();
 assert.equal(verifyApprovalProbe({...p,nowSeconds:at,key:wrongKey}).ok,false);
 const body=p.body.replace(memberId,'cccccccc-cccc-4ccc-8ccc-cccccccccccc');
 assert.equal(verifyApprovalProbe({body,signature:p.signature,nowSeconds:at,key}).ok,false);
});
test('request older or newer than 15 sec denied',()=>{
 const p=probe();
 for(const v of [at-16,at+16])
  assert.equal(verifyApprovalProbe({...p,nowSeconds:v,key}).ok,false);
 assert.equal(verifyApprovalProbe({...p,nowSeconds:at+15,key}).ok,true);
});
test('extra request fields, overlong body and malformed signature denied',()=>{
 const p=probe();
 for(const entry of [
  {body:p.body.replace('}',',"email":"danger@example.invalid"}')},
  {body:'x'.repeat(221)},
  {signature:'some-token'},
  {signature:''},
  {body:'{"memberId":"random"}'},
 ])assert.equal(verifyApprovalProbe({...p,nowSeconds:at,key,...entry}).ok,false);
});
test('current DB approval is checked every time and revoked members denied',async()=>{
 const p=probe();let count=0,approved=true;
 const ask=async()=>decideApprovalProbe({...p,key,nowSeconds:at,
  queryCurrentApproval:async m=>{count++;assert.equal(m,memberId);return approved},
 });
 assert.deepEqual(await ask(),{ok:true,allowed:true});
 approved=false;
 assert.deepEqual(await ask(),{ok:true,allowed:false});
 assert.equal(count,2);
});
test('database error and missing callback deny all access',async()=>{
 const p=probe();
 assert.equal((await decideApprovalProbe({...p,key,nowSeconds:at,
  queryCurrentApproval:async()=>{throw Error('DB OFFLINE')}})).allowed,false);
 assert.equal((await decideApprovalProbe({...p,key,nowSeconds:at})).allowed,false);
});
test('Pit bridge client invokes exact HTTPS endpoint, no redirect, no stored cache',async()=>{
 let calls=0;
 const result=await checkCurrentOwnerApproval({memberId,key,
  origin:'https://club.example.invalid',nowSeconds:at,nonce,
  fetchImpl:async(url,opts)=>{
   calls++;assert.equal(url,'https://club.example.invalid'+APPROVAL_PATH);
   assert.equal(opts.method,'POST');
   assert.equal(opts.redirect,'manual');
   assert.equal(opts.cache,'no-store');
   const p=verifyApprovalProbe({body:opts.body,
    signature:opts.headers['x-pit-approval-signature'],key,nowSeconds:at});
   assert.equal(p.ok,true);
   return {ok:true,status:200,json:async()=>({ok:true,allowed:true})};
  }});
 assert.equal(result,true);assert.equal(calls,1);
});
test('Pit bridge client fails closed on no HTTPS, wrong response, timeout',async()=>{
 const base={memberId,key,nowSeconds:at,nonce};
 assert.equal(await checkCurrentOwnerApproval({...base,
  origin:'http://club.example.invalid',fetchImpl:async()=>({ok:true,status:200,
  json:async()=>({ok:true,allowed:true})})}),false);
 for(const fn of [
  async()=>({ok:false,status:500,json:async()=>({ok:true,allowed:true})}),
  async()=>({ok:true,status:302,json:async()=>({ok:true,allowed:true})}),
  async()=>({ok:true,status:200,json:async()=>({ok:false,allowed:true})}),
  async()=>({ok:true,status:200,json:async()=>({ok:true,allowed:true,identity:'leak'})}),
  async()=>{throw Error('NETWORK OFFLINE')},
 ])assert.equal(await checkCurrentOwnerApproval({...base,
   origin:'https://club.example.invalid',fetchImpl:fn}),false);
});

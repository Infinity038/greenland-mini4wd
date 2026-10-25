import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import {
 issueHandoffTicket,verifyHandoffTicket,redeemHandoffTicket,
 HANDOFF_ISSUER,HANDOFF_AUDIENCE,
} from './sso-handoff-contract.mjs';

const secret=Buffer.alloc(32,90);
const wrongSecret=Buffer.alloc(32,24);
const t=2_000_000_000;
const memberId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const otherMember='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const playerId='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const nonce='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const ticket=()=>issueHandoffTicket({memberId,authorized:true,secret,nowSeconds:t,nonce});
const makeSig=(header,claims)=>{
  const input=Buffer.from(JSON.stringify(header)).toString('base64url') + '.' +
    Buffer.from(JSON.stringify(claims)).toString('base64url');
  return input+'.'+createHmac('sha256',secret).update(input).digest('base64url');
};
const claims=(override={})=>({
 iss:HANDOFF_ISSUER,aud:HANDOFF_AUDIENCE,sub:memberId,iat:t,exp:t+60,jti:nonce,...override,
});
const header=(override={})=>({alg:'HS256',typ:'JWT',...override});
const store=new Set();
const inputs=(overrides={})=>({
 token:ticket(),secret,nowSeconds:t+1,
 isCurrentlyApproved:async id=>id===memberId,
 lookupLinkedPlayer:async id=>id===memberId?{id:playerId,memberId}:null,
 atomicConsume:async ({nonceHash,expiresAt})=>{
   if(expiresAt<=t+1||store.has(nonceHash))return false;
   store.add(nonceHash);return true;
 }, ...overrides,
});

test('authorized member receives signed 60-second subject-only ticket',()=>{
 const raw=ticket(), parts=raw.split('.');
 assert.equal(parts.length,3);
 const data=JSON.parse(Buffer.from(parts[1],'base64url').toString());
 assert.deepEqual(Object.keys(data).sort(),['aud','exp','iat','iss','jti','sub']);
 assert.equal(data.sub,memberId);
 assert.equal(verifyHandoffTicket(raw,{secret,nowSeconds:t+1}).accepted,true);
});
test('unauthorized or invalid member never receives a ticket',()=>{
 assert.throws(()=>issueHandoffTicket({memberId,authorized:false,secret,nowSeconds:t}),/ISSUANCE_DENIED/);
 assert.throws(()=>issueHandoffTicket({memberId:'email@sample.test',authorized:true,secret,nowSeconds:t}),/ISSUANCE_DENIED/);
});
test('server key must be high-entropy length, not frontend config',()=>{
 assert.throws(()=>issueHandoffTicket({memberId,authorized:true,secret:Buffer.alloc(12),nowSeconds:t}),/SERVER_KEY_REQUIRED/);
});
test('tampering with any signature byte is rejected',()=>{
 const x=ticket().split('.');x[2]=x[2].replace(/^./,x[2][0]==='a'?'b':'a');
 assert.equal(verifyHandoffTicket(x.join('.'),{secret,nowSeconds:t}).code,'INVALID_TICKET');
});
test('wrong secret, truncated or malformed token fails closed',()=>{
 assert.equal(verifyHandoffTicket(ticket(),{secret:wrongSecret,nowSeconds:t}).accepted,false);
 assert.equal(verifyHandoffTicket('foo.bar.baz',{secret,nowSeconds:t}).accepted,false);
 assert.equal(verifyHandoffTicket(ticket().split('.').slice(0,2).join('.'),{secret,nowSeconds:t}).accepted,false);
});
test('expiry at 60 seconds is exclusive; expired ticket cannot redeem',()=>{
 assert.equal(verifyHandoffTicket(ticket(),{secret,nowSeconds:t+59}).accepted,true);
 assert.equal(verifyHandoffTicket(ticket(),{secret,nowSeconds:t+60}).accepted,false);
});
test('future-issued timestamps beyond five seconds are rejected',()=>{
 assert.equal(verifyHandoffTicket(ticket(),{secret,nowSeconds:t-6}).accepted,false);
 assert.equal(verifyHandoffTicket(ticket(),{secret,nowSeconds:t-5}).accepted,true);
});
test('custom long TTL cannot be issued',()=>{
 assert.throws(()=>issueHandoffTicket({memberId,authorized:true,secret,nowSeconds:t,ttlSeconds:61}),/ISSUANCE_DENIED/);
 assert.equal(verifyHandoffTicket(makeSig(header(),claims({exp:t+600})),{secret,nowSeconds:t}).accepted,false);
});
test('cross-site audience/issuer substitution rejected even with valid signature',()=>{
 assert.equal(verifyHandoffTicket(makeSig(header(),claims({aud:'unrelated'})),{secret,nowSeconds:t}).accepted,false);
 assert.equal(verifyHandoffTicket(makeSig(header(),claims({iss:'unrelated'})),{secret,nowSeconds:t}).accepted,false);
});
test('alg none and extra header fields rejected even with valid signature',()=>{
 assert.equal(verifyHandoffTicket(makeSig(header({alg:'none'}),claims()),{secret,nowSeconds:t}).accepted,false);
 assert.equal(verifyHandoffTicket(makeSig(header({kid:'external'}),claims()),{secret,nowSeconds:t}).accepted,false);
});
test('extra identity/email claims rejected instead of linked implicitly',()=>{
 assert.equal(verifyHandoffTicket(makeSig(header(),claims({email:'owner@example.test'})),{secret,nowSeconds:t}).accepted,false);
});
test('missing current owner approval denies even valid previously signed ticket',async()=>{
 const r=await redeemHandoffTicket(inputs({isCurrentlyApproved:async()=>false}));
 assert.equal(r.code,'APPROVAL_REQUIRED');
});
test('missing or mismatched preverified player-member link denies wallet takeover',async()=>{
 const a=await redeemHandoffTicket(inputs({lookupLinkedPlayer:async()=>null}));
 const b=await redeemHandoffTicket(inputs({lookupLinkedPlayer:async()=>({id:playerId,memberId:otherMember})}));
 assert.equal(a.code,'EXISTING_IDENTITY_LINK_REQUIRED');
 assert.equal(b.code,'EXISTING_IDENTITY_LINK_REQUIRED');
});
test('valid linked user consumes once; second identical ticket is denied',async()=>{
 store.clear();
 const x=await redeemHandoffTicket(inputs());
 const y=await redeemHandoffTicket(inputs());
 assert.equal(x.code,'ONE_USE_REDEEMED_SESSION_STILL_REQUIRED');
 assert.equal(x.playerId,playerId);
 assert.equal(y.code,'REPLAY_OR_EXPIRED');
});
test('two simultaneous one-use redemptions yield only one accepted claim',async()=>{
 store.clear();
 const [a,b]=await Promise.all([redeemHandoffTicket(inputs()),redeemHandoffTicket(inputs())]);
 assert.equal([a,b].filter(x=>x.accepted).length,1);
});
test('missing DB consume adapter must never mint an application session',async()=>{
 assert.equal((await redeemHandoffTicket(inputs({atomicConsume:null}))).code,'SERVER_DEPENDENCY_MISSING');
});
test('revoked approval blocks redemption without consuming the nonce',async()=>{
 store.clear();
 const denied=await redeemHandoffTicket(inputs({isCurrentlyApproved:async()=>false}));
 assert.equal(denied.accepted,false);assert.equal(store.size,0);
});
test('signed subject is UUID only, not a linked account by email',()=>{
 const token=makeSig(header(),claims({sub:'member@example.test'}));
 assert.equal(verifyHandoffTicket(token,{secret,nowSeconds:t}).accepted,false);
});

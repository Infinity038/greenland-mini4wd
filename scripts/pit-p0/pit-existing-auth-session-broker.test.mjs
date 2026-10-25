import test from 'node:test';
import assert from 'node:assert/strict';
import {
 prepareExistingPitAuthSession,commitVerifiedPitSession,
} from './pit-existing-auth-session-broker.mjs';
const u='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const other='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
function providers(overrides={}){
 const seen=[];
 const server={
  auth:{admin:{
   getUserById:async id=>{seen.push(['getUserById',id]);return{
    data:{user:{id:u,email:'only-from-existing-auth-user@example.invalid',
      email_confirmed_at:'2026-01-01T00:00:00Z'}},error:null};},
   generateLink:async req=>{seen.push(['generateLink',req]);return{
    data:{properties:{hashed_token:'synthetic-private-tokenhash'}},error:null};},
  }},
 };
 const isolated={auth:{
   verifyOtp:async params=>{seen.push(['verifyOtp',params]);return{
     data:{session:{user:{id:u},access_token:'access_mock',refresh_token:'refresh_mock'}},
     error:null}},
   getUser:async()=>{seen.push(['getUser']);return{data:{user:{id:u}},error:null}},
 }};
 return {adminClient:server,isolatedAuthClient:isolated,seen,...overrides};
}
test('existing confirmed exact UUID user produces only isolated credentials',async()=>{
 const p=providers();const r=await prepareExistingPitAuthSession({
   existingAuthUserId:u,...p,
 });
 assert.equal(r.ok,true);assert.equal(r.authUserId,u);
 assert.deepEqual(p.seen,[
 ['getUserById',u],
 ['generateLink',{type:'magiclink',email:'only-from-existing-auth-user@example.invalid'}],
 ['verifyOtp',{type:'email',token_hash:'synthetic-private-tokenhash'}],
 ['getUser'],
 ]);
 assert.equal(JSON.stringify(r).includes('@'),false);
});
test('missing or invalid auth user ID never generates a link',async()=>{
 const p=providers();
 const r=await prepareExistingPitAuthSession({existingAuthUserId:'email@example.invalid',...p});
 assert.equal(r.ok,false);assert.equal(p.seen.length,0);
});
test('absent/unconfirmed Pit user cannot generate auth link',async()=>{
 for(const data of [{user:null},{user:{id:u,email:'one@example.invalid'}},
   {user:{id:other,email:'other@example.invalid',email_confirmed_at:'yes'}}]){
  const p=providers();
  p.adminClient.auth.admin.getUserById=async()=>({data,error:null});
  const r=await prepareExistingPitAuthSession({existingAuthUserId:u,...p});
  assert.equal(r.ok,false);assert.equal(p.seen.length,0);
 }
});
test('server generated magiclink cannot silently become a different account',async()=>{
 const p=providers();
 p.isolatedAuthClient.auth.verifyOtp=async()=>({
  data:{session:{user:{id:other},access_token:'bad',refresh_token:'bad'}},
  error:null});
 assert.equal((await prepareExistingPitAuthSession({existingAuthUserId:u,...p})).reason,'AUTH_USER_MISMATCH');
});
test('independent token getUser() must be the same linked Pit Auth user',async()=>{
 const p=providers();p.isolatedAuthClient.auth.getUser=async()=>({data:{user:{id:other}},error:null});
 assert.equal((await prepareExistingPitAuthSession({existingAuthUserId:u,...p})).reason,'AUTH_USER_MISMATCH');
});
test('invalid or insufficient token material is never returned',async()=>{
 const p=providers();p.adminClient.auth.admin.generateLink=async()=>({
  data:{properties:{hashed_token:'too_short'}},error:null});
 assert.equal((await prepareExistingPitAuthSession({existingAuthUserId:u,...p})).reason,'AUTH_LINK_FAILURE');
 const p2=providers();
 p2.isolatedAuthClient.auth.verifyOtp=async()=>({
  data:{session:{user:{id:u},access_token:'good',refresh_token:''}},error:null});
 assert.equal((await prepareExistingPitAuthSession({existingAuthUserId:u,...p2})).reason,'AUTH_TOKEN_MISSING');
});
test('commit writes SSR session only and checks exact Auth identity again',async()=>{
 const track=[];
 const ssrClient={auth:{
  setSession:async params=>{track.push(['setSession',params]);return{data:{user:{id:u}},error:null}},
  getUser:async()=>{track.push(['getUser']);return{data:{user:{id:u}},error:null}},
  signOut:async()=>{track.push(['signOut'])},
 }};
 const r=await commitVerifiedPitSession({
   existingAuthUserId:u,accessToken:'access_mock',refreshToken:'refresh_mock',ssrClient
 });
 assert.equal(r,true);
 assert.deepEqual(track,[['setSession',{access_token:'access_mock',refresh_token:'refresh_mock'}],['getUser']]);
});
test('wrong SSR session identity is signed out before a successful response',async()=>{
 let out=0;
 const ssrClient={auth:{
  setSession:async()=>({data:{user:{id:other}},error:null}),
  getUser:async()=>({data:{user:{id:other}},error:null}),
  signOut:async()=>{out++},
 }};
 const r=await commitVerifiedPitSession({
  existingAuthUserId:u,accessToken:'access_mock',refreshToken:'refresh_mock',ssrClient,
 });
 assert.equal(r,false);assert.equal(out,1);
});
test('missing server-side SSR cookie authority is denied',async()=>{
 assert.equal(await commitVerifiedPitSession({
  existingAuthUserId:u,accessToken:'access_mock',refreshToken:'refresh_mock',
  ssrClient:{auth:{}},
 }),false);
});
test('on SSR setSession failure revokes any tentative session',async()=>{
 let revoked=0;
 const ssrClient={auth:{
  setSession:async()=>{throw Error('synthetic provider failure')},
  getUser:async()=>({data:{user:{id:u}}}),
  signOut:async()=>{revoked++},
 }};
 assert.equal(await commitVerifiedPitSession({
  existingAuthUserId:u,accessToken:'access_mock',refreshToken:'refresh_mock',ssrClient
 }),false);
 assert.equal(revoked,1);
});

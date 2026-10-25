/**
 * P0 STAGING-ONLY GM4WD <-> Pit approval bridge.
 * Private backend-to-backend call to verify current owner approval.
 * It NEVER issues a Pit session and does not trust a browser-supplied member.
 * Bridge key must be separate from ticket-signing key and Supabase secrets.
 */
import {createHmac,randomUUID,timingSafeEqual} from 'node:crypto';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const BAD={ok:false,allowed:false};
export const APPROVAL_PATH='/api/pit/approve-member';
const fixedKey = key => Buffer.isBuffer(key)&&key.length>=32;
const canonical = (mid,ts,nonce)=>'PIT_APPROVAL_V1\n'+mid+'\n'+ts+'\n'+nonce;
function mac(key,text){return createHmac('sha256',key).update(text,'utf8').digest()}
export function signApprovalProbe({memberId,nowSeconds,key,nonce=randomUUID()}) {
 if(!fixedKey(key)||!UUID.test(memberId??'')||
   !UUID.test(nonce)||!Number.isSafeInteger(nowSeconds))
   throw Error('APPROVAL_PROBE_CONFIG');
 const mid=memberId.toLowerCase(),n=nonce.toLowerCase();
 const request={memberId:mid,at:nowSeconds,nonce:n};
 return {body:JSON.stringify(request),
   signature:mac(key,canonical(mid,nowSeconds,n)).toString('hex')};
}
export function verifyApprovalProbe({body,signature,nowSeconds,key}){
 if(!fixedKey(key)||typeof body!=='string'||Buffer.byteLength(body)>220||
    typeof signature!=='string'||!/^[a-f0-9]{64}$/.test(signature)||
    !Number.isSafeInteger(nowSeconds))return BAD;
 try{
   const request=JSON.parse(body);
   if(!request||Object.keys(request).sort().join(',')!=='at,memberId,nonce')return BAD;
   const {memberId,at,nonce}=request;
   if(!UUID.test(memberId??'')||!UUID.test(nonce??'')||
      memberId!==memberId.toLowerCase()||nonce!==nonce.toLowerCase()||
      !Number.isSafeInteger(at)||Math.abs(nowSeconds-at)>15)return BAD;
   const expected=mac(key,canonical(memberId,at,nonce));
   const given=Buffer.from(signature,'hex');
   if(!timingSafeEqual(expected,given))return BAD;
   return {ok:true,allowed:false,memberId};
 }catch{return BAD}
}
/** The server verifies the cryptographic request AND re-queries SQL. */
export async function decideApprovalProbe({
 body,signature,nowSeconds,key,queryCurrentApproval
}) {
 const probe=verifyApprovalProbe({body,signature,nowSeconds,key});
 if(!probe.ok||typeof queryCurrentApproval!=='function')return BAD;
 try{
   const allowed=await queryCurrentApproval(probe.memberId);
   return {ok:true,allowed:allowed===true};
 }catch{return BAD}
}
/** Pit-side helper always fails CLOSED if signature, network or reply fails. */
export async function checkCurrentOwnerApproval({
 memberId,origin,key,fetchImpl=fetch,nowSeconds=Math.floor(Date.now()/1000),
 timeoutMs=2500,nonce
}) {
 if(!/^https:\/\/[A-Za-z0-9.-]+(?::443)?$/.test(origin??'')||
    !fixedKey(key)||typeof fetchImpl!=='function')return false;
 try{
   const signed=signApprovalProbe({memberId,key,nowSeconds,nonce});
   const response=await fetchImpl(origin+APPROVAL_PATH,{
     method:'POST',redirect:'manual',cache:'no-store',
     headers:{
       'content-type':'application/json',
       'x-pit-approval-signature':signed.signature,
     },
     body:signed.body,signal:AbortSignal.timeout(timeoutMs),
   });
   if(!response?.ok||response.status!==200)return false;
   const result=await response.json();
   return result?.ok===true&&result.allowed===true&&
      Object.keys(result).sort().join(',')==='allowed,ok';
 }catch{return false}
}

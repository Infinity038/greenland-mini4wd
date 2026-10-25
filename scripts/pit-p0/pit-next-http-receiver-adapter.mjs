/**
 * Candidate standalone Pit Next.js route adapter. No server handler is
 * deployed just by adding this module. Actual Pit App Router must import it,
 * bind the Pit Supabase clients and committed SSR-cookie adapter, and pass
 * owner-verified live approval/link/atomic nonce dependencies.
 *
 * The GM4WD Profile sends one form-urlencoded POST across HTTPS origins.
 * No GET, query-string ticket, JSON body, CORS or token-bearing redirects.
 */
import {parsePitHandoffPost,completePitHandoff,pitHandoffResponse}
 from './pit-handoff-receiver.mjs';

const MAX_BYTES=2600;
const denied=(code='INVALID_REQUEST')=>{
 const response=pitHandoffResponse({ok:false,code});
 return new Response(response.body,{status:response.status,headers:response.headers});
};
async function readSmallBody(request){
 const len=request.headers.get('content-length');
 if(len!==null&&(!/^[0-9]+$/.test(len)||Number(len)>MAX_BYTES))
   throw Error('TOO_LARGE');
 if(!request.body)return '';
 const reader=request.body.getReader(),chunks=[];
 let n=0;
 try{
  for(;;){
   const {value,done}=await reader.read();
   if(done)break;
   n+=value.byteLength;
   if(n>MAX_BYTES)throw Error('TOO_LARGE');
   chunks.push(value);
  }
 }finally{try{await reader.cancel()}catch{}}
 const bytes=new Uint8Array(n);let pos=0;
 for(const c of chunks){bytes.set(c,pos);pos+=c.byteLength}
 return new TextDecoder('utf-8',{fatal:true}).decode(bytes);
}
/** Server-only endpoint wrapper. Fail closed if any release gate is missing. */
export async function handlePitHandoffHttpRequest(request,{
 enabled=false,clubOrigin,secret,nowSeconds,
 isCurrentlyApproved,lookupLinkedPlayer,atomicConsume,
 obtainUncommittedSession,commitSession
}={}) {
 if(enabled!==true)return denied('FEATURE_DISABLED');
 if(request?.method!=='POST')return denied();
 const origin=request.headers?.get('origin')??'';
 const type=request.headers?.get('content-type')??'';
 if(origin!==clubOrigin||!/^https:\/\/[^/?#]+$/i.test(clubOrigin??'')||
    !/^application\/x-www-form-urlencoded(?:\s*;\s*charset=utf-8)?$/i.test(type))
    return denied();
 let body;
 try{body=await readSmallBody(request)}catch{return denied()}
 const parsed=parsePitHandoffPost({
  method:request.method,origin,contentType:type,
  body,expectedClubOrigin:clubOrigin,enabled,
 });
 if(!parsed.ok)return denied();
 const result=await completePitHandoff({
  ticket:parsed.ticket,secret,nowSeconds,
  isCurrentlyApproved,lookupLinkedPlayer,atomicConsume,
  obtainUncommittedSession,commitSession,
 });
 const spec=pitHandoffResponse(result);
 return new Response(spec.body,{status:spec.status,headers:spec.headers});
}

import 'server-only';
import {createClient} from '@supabase/supabase-js';
import {decideApprovalProbe} from '@/scripts/pit-p0/cross-project-owner-approval.mjs';

export const dynamic='force-dynamic';
export const runtime='nodejs';

/** Not exposed until fresh backup/restore/P3/P4 owner security is verified. */
const unavailable=()=>{
  return new Response(JSON.stringify({ok:false,allowed:false}),{
    status:403,headers:{
      'content-type':'application/json',
      'cache-control':'no-store, private',
      'referrer-policy':'no-referrer',
      'x-content-type-options':'nosniff',
    },
  });
};
async function smallBody(req:Request){
  const h=req.headers.get('content-length');
  if(h&&(!/^[0-9]+$/.test(h)||Number(h)>220))throw Error('SIZE');
  if(!req.body)return '';
  const reader=req.body.getReader();
  const chunks:Uint8Array[]=[];let size=0;
  try{
    for(;;){
      const {done,value}=await reader.read();
      if(done)break;
      size+=value.byteLength;
      if(size>220)throw Error('SIZE');
      chunks.push(value);
    }
  }finally{try{await reader.cancel()}catch{}}
  return new TextDecoder('utf-8',{fatal:true}).decode(
    Buffer.concat(chunks.map(x=>Buffer.from(x))));
}
export async function POST(req:Request):Promise<Response>{
  if(process.env.PIT_HANDOFF_ENABLED!=='true' ||
     process.env.PIT_APPROVAL_BRIDGE_ENABLED!=='true')return unavailable();
  const origin=process.env.GM4WD_PUBLIC_ORIGIN;
  if(!origin||!origin.startsWith('https://')||
     new URL(req.url).origin!==origin||
     req.headers.get('content-type')!=='application/json')return unavailable();
  const encoded=process.env.PIT_APPROVAL_BRIDGE_KEY_BASE64??'';
  if(!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded))return unavailable();
  const key=Buffer.from(encoded,'base64');
  if(key.length<32)return unavailable();
  const dbUrl=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey=process.env.GM4WD_SUPABASE_SECRET_KEY;
  if(!dbUrl||!serviceKey)return unavailable();
  try{
    const body=await smallBody(req);
    const decided=await decideApprovalProbe({
      body,signature:req.headers.get('x-pit-approval-signature'),
      key,nowSeconds:Math.floor(Date.now()/1000),
      queryCurrentApproval:async (memberId:string)=>{
        const client=createClient(dbUrl,serviceKey,{
          auth:{persistSession:false,autoRefreshToken:false},
        });
        const {data,error}=await client.rpc('pit_p0_current_member_approved',{
          p_member:memberId,
        });
        return !error&&data===true;
      },
    });
    return new Response(JSON.stringify({
      ok:decided.ok===true,allowed:decided.allowed===true,
    }),{
      status:decided.ok?200:403,
      headers:{
        'content-type':'application/json',
        'cache-control':'no-store, private',
        'referrer-policy':'no-referrer',
        'x-content-type-options':'nosniff',
      },
    });
  }catch{return unavailable()}
}

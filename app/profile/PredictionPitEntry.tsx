'use client';

import { useEffect, useState } from 'react';

/**
 * Owner-approved members only. The server eligibility endpoint, NOT the
 * cached client profile, determines whether this appears. Real issuance
 * repeats the approval check before returning a one-use 60-second ticket.
 */
export default function PredictionPitEntry() {
  const [eligible,setEligible]=useState(false);
  const [opening,setOpening]=useState(false);
  const [message,setMessage]=useState('');

  useEffect(()=>{
    let alive=true;
    fetch('/api/pit/availability',{credentials:'same-origin',cache:'no-store'})
      .then(r=>r.ok?r.json():null)
      .then(data=>{ if(alive) setEligible(data?.allowed===true); })
      .catch(()=>{ if(alive) setEligible(false); });
    return ()=>{alive=false};
  },[]);

  async function openPit(){
    if(opening)return;
    setOpening(true);setMessage('');
    const target=window.open('about:blank','_blank');
    if(!target){setMessage('Allow a new tab to open Prediction Pit.');setOpening(false);return;}
    try {
      const destination=process.env.NEXT_PUBLIC_PIT_ORIGIN;
      if(!destination) throw new Error('not ready');
      const endpoint=new URL('/api/sso/handoff',destination);
      if(endpoint.protocol!=='https:'||new URL(destination).origin!==destination)
        throw new Error('not ready');
      const response=await fetch('/api/pit/handoff',{
        method:'POST',credentials:'same-origin',
        headers:{'content-type':'application/json'},body:'{}',
        cache:'no-store',
      });
      const result=await response.json();
      if(!response.ok||typeof result.ticket!=='string'||result.transport!=='POST_ONLY')
        throw new Error('not ready');
      const name='prediction-pit-'+Date.now();
      target.name=name;
      target.opener=null;
      const form=document.createElement('form');
      form.method='POST';
      form.action=endpoint.toString();
      form.target=name;
      form.style.display='none';
      const token=document.createElement('input');
      token.type='hidden';token.name='ticket';token.value=result.ticket;
      form.appendChild(token);
      document.body.appendChild(form);
      try{form.submit();}finally{form.remove();}
    }catch{
      target.close();
      setMessage('Prediction Pit access is not available. Try again after the launch.');
    }finally{setOpening(false);}
  }

  if(!eligible)return null;
  return <div style={{marginTop:12,maxWidth:320}}>
    <button type="button" onClick={openPit} disabled={opening}
      style={{
        width:'100%',padding:'12px 16px',cursor:opening?'wait':'pointer',
        borderRadius:10,border:'1px solid #A3E635',
        background:'#16211A',color:'#D9F99D',fontWeight:800,
        letterSpacing:'.04em'
      }}>🏁 {opening?'Opening private Pit…':'OPEN PREDICTION PIT'}</button>
    {message&&<div role="alert" style={{marginTop:8,color:'#FACC15',fontSize:12}}>
      {message}</div>}
  </div>;
}

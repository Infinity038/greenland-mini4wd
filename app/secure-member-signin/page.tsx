'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabaseAuth/browserClient';

// Staged-only secure migration flow. This route is not the live registration
// replacement until email redirect URLs, legacy member matching and RLS are tested.
export default function SecureMemberSignin() {
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setMessage('');
    setSent(false);
    try {
      const client = createSupabaseBrowserClient();
      const url = new URL('/auth/callback', window.location.origin);
      url.searchParams.set('next', '/secure-member-signin/complete');
      const { error } = await client.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: { emailRedirectTo: url.toString(), shouldCreateUser: true },
      });
      if (error) {
        setMessage('Unable to send a sign-in email right now. Please retry or contact the organizer.');
        return;
      }
      setSent(true);
      setMessage('If the address can receive mail, use the verification link sent to it. Existing club records are not changed until email verification succeeds.');
    } catch {
      setMessage('Sign-in is temporarily unavailable. Please retry later.');
    } finally {
      setPending(false);
    }
  }

  return <main style={{minHeight:'100vh',display:'grid',placeItems:'center',background:'#050505',color:'#f5f5f5',padding:20,fontFamily:'DM Sans, sans-serif'}}>
    <section style={{background:'#071426',border:'1px solid #2a3b4d',borderRadius:16,maxWidth:480,width:'100%',padding:26}}>
      <p style={{color:'#facc15',fontSize:12,letterSpacing:2}}>4W · STAGED MEMBER AUTH</p>
      <h1 style={{fontSize:30,fontFamily:'Barlow Condensed, sans-serif'}}>Verify your member email</h1>
      <p style={{color:'#b8c1cc',lineHeight:1.65}}>A secure email sign-in is required for future invitation-only features. This preview does not change any virtual coins, tickets or official racing results.</p>
      <form onSubmit={submit}>
        <label htmlFor="secure-member-email" style={{display:'block',marginBottom:8}}>Email address</label>
        <input id="secure-member-email" type="email" required autoComplete="email" maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} disabled={pending || sent} style={{boxSizing:'border-box',width:'100%',padding:12,background:'#102033',color:'#fff',border:'1px solid #62748b',borderRadius:8}}/>
        <button type="submit" disabled={pending || sent} style={{marginTop:14,width:'100%',padding:14,border:0,borderRadius:8,background:'#facc15',color:'#050505',fontWeight:800,cursor:'pointer',opacity:pending||sent?0.6:1}}>{pending?'Sending…':sent?'Check your email':'Send verification link'}</button>
      </form>
      {message && <p role="status" style={{color:'#facc15',fontSize:13,lineHeight:1.6}}>{message}</p>}
      <p><Link href="/" style={{color:'#b8c1cc'}}>← Return to club website</Link></p>
    </section>
  </main>;
}

'use client';

import { Suspense, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabaseAuth/browserClient';
import TurnstileWidget, { turnstileConfigured } from '@/components/public/TurnstileWidget';
import { resolveSafeMemberNextPath, resolveSafeStaffNextPath } from '@/lib/supabaseAuth/safeNextPath';

// Verified-email sign-in for club members and invited players. This is the ONLY identity the Prediction Pit trusts.
// A 6-digit code works on any device; the link in the same email works on the device that requested it.
// Existing club records are not changed until the email is verified, and a hosted Turnstile check must be added before
// public launch (docs/phase1/PORTAL_ARCHITECTURE.md, security gates).
function SignIn() {
  const params = useSearchParams();
  const next = resolveSafeMemberNextPath(params.get('next')) ?? resolveSafeStaffNextPath(params.get('next'));   // null = let the verified-session page choose (Prediction Pit for invited players)
  const completePath = '/secure-member-signin/complete' + (next ? '?next=' + encodeURIComponent(next) : '');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState('');
  const [captcha, setCaptcha] = useState<string | null>(null);   // verified by Supabase Auth's captcha setting, not by this page
  const [captchaTry, setCaptchaTry] = useState(0);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true); setMessage('');
    try {
      const client = createSupabaseBrowserClient();
      const url = new URL('/auth/callback', window.location.origin);
      url.searchParams.set('next', completePath);
      const { error } = await client.auth.signInWithOtp({ email: email.trim().toLowerCase(), options: { emailRedirectTo: url.toString(), shouldCreateUser: true, captchaToken: captcha || undefined } });
      if (error) {
        setCaptcha(null); setCaptchaTry(n => n + 1);
        const limited = (error as { status?: number; code?: string }).status === 429 || (error as { code?: string }).code === 'over_email_send_rate_limit';
        setMessage(limited
          ? 'Too many sign-in emails were requested recently. Please wait up to an hour, then try once more (the newest email is the one that works).'
          : 'Unable to send a sign-in email right now. Please retry or contact the organizer.');
        return;
      }
      setSent(true);
      setMessage('If the address can receive mail, we sent a sign-in email. Open the LINK in it using this same browser. If your email shows a 6-digit code instead, enter it below. Existing club records are not changed until your email is verified.');
    } catch { setCaptcha(null); setCaptchaTry(n => n + 1); setMessage('Sign-in is temporarily unavailable. Please retry later.'); }
    finally { setPending(false); }
  }

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true); setMessage('');
    try {
      const client = createSupabaseBrowserClient();
      const { error } = await client.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: 'email' });
      if (error) { setMessage('That code is not valid or has expired. Request a new one.'); setPending(false); return; }
      window.location.assign(completePath);
    } catch { setMessage('Verification is temporarily unavailable. Please retry later.'); setPending(false); }
  }

  const box = { boxSizing: 'border-box', width: '100%', padding: 12, background: '#102033', color: '#fff', border: '1px solid #62748b', borderRadius: 8 } as const;
  return <main style={{minHeight:'100vh',display:'grid',placeItems:'center',background:'#050505',color:'#f5f5f5',padding:20,fontFamily:'DM Sans, sans-serif'}}>
    <section style={{background:'#071426',border:'1px solid #2a3b4d',borderRadius:16,maxWidth:480,width:'100%',padding:26}}>
      <p style={{color:'#facc15',fontSize:12,letterSpacing:2}}>GREENLAND MINI4WD · SECURE SIGN-IN</p>
      <h1 style={{fontSize:30,fontFamily:'Barlow Condensed, sans-serif'}}>Verify your email</h1>
      <p style={{color:'#b8c1cc',lineHeight:1.65}}>We email you a one-time code. No password is needed and none is stored in your browser.</p>
      {!sent ? (
        <form onSubmit={send}>
          <label htmlFor="secure-member-email" style={{display:'block',marginBottom:8}}>Email address</label>
          <input id="secure-member-email" data-testid="signin-email" type="email" required autoComplete="email" maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} disabled={pending} style={box}/>
          <TurnstileWidget onToken={setCaptcha} resetKey={captchaTry} />
          <button type="submit" data-testid="signin-send" disabled={pending || (turnstileConfigured() && !captcha)} style={{marginTop:14,width:'100%',padding:14,border:0,borderRadius:8,background:'#facc15',color:'#050505',fontWeight:800,cursor:'pointer',opacity:pending?0.6:1}}>{pending?'Sending…':'Email me a code'}</button>
        </form>
      ) : (
        <form onSubmit={verify}>
          <label htmlFor="secure-member-code" style={{display:'block',marginBottom:8}}>6-digit code</label>
          <input id="secure-member-code" data-testid="signin-code" inputMode="numeric" pattern="[0-9]{6}" required autoComplete="one-time-code" maxLength={6} value={code} onChange={e=>setCode(e.target.value.replace(/[^0-9]/g,''))} disabled={pending} style={{...box,letterSpacing:6,fontSize:22,textAlign:'center'}}/>
          <button type="submit" data-testid="signin-verify" disabled={pending||code.length!==6} style={{marginTop:14,width:'100%',padding:14,border:0,borderRadius:8,background:'#facc15',color:'#050505',fontWeight:800,cursor:'pointer',opacity:pending||code.length!==6?0.6:1}}>{pending?'Checking…':'Verify and continue'}</button>
        </form>
      )}
      {sent && <p><button type="button" data-testid="signin-resend" onClick={() => { setSent(false); setCode(''); setMessage(''); setCaptcha(null); setCaptchaTry(n => n + 1); }} style={{background:'none',border:0,color:'#facc15',cursor:'pointer',padding:0,textDecoration:'underline'}}>Send a new code (a fresh human check is required)</button></p>}
      {message && <p role="status" style={{color:'#facc15',fontSize:13,lineHeight:1.6}}>{message}</p>}
      <p><Link href="/" style={{color:'#b8c1cc'}}>← Return to club website</Link></p>
    </section>
  </main>;
}

export default function SecureMemberSignin() {
  return <Suspense fallback={null}><SignIn /></Suspense>;
}

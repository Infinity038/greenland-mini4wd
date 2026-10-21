'use client';

import { useEffect, useRef } from 'react';

/**
 * Cloudflare Turnstile widget. It only PRODUCES a token; the token is verified on the SERVER (our public routes, or Supabase Auth's
 * captcha setting for sign-in). With no site key configured (local development) it renders nothing and reports an empty token.
 * Public site key: NEXT_PUBLIC_TURNSTILE_SITE_KEY. Cloudflare publishes always-pass test keys for development.
 */
declare global { interface Window { turnstile?: { render: (el: HTMLElement, o: Record<string, unknown>) => string; remove: (id: string) => void; reset: (id: string) => void } } }

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let loading: Promise<void> | null = null;
function loadScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (!loading) loading = new Promise((resolve, reject) => {
    const s = document.createElement('script'); s.src = SCRIPT_SRC; s.async = true; s.defer = true;
    s.onload = () => resolve(); s.onerror = () => { loading = null; reject(new Error('turnstile script failed')); };
    document.head.appendChild(s);
  });
  return loading;
}

export const turnstileConfigured = () => !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export default function TurnstileWidget({ onToken, resetKey = 0 }: { onToken: (token: string | null) => void; resetKey?: number }) {
  const box = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!siteKey) { onToken(''); return; }               // not configured (local development): nothing to solve
    let cancelled = false;
    loadScript().then(() => {
      if (cancelled || !box.current || !window.turnstile) return;
      widget.current = window.turnstile.render(box.current, {
        sitekey: siteKey, theme: 'dark',
        callback: (t: string) => onToken(t), 'expired-callback': () => onToken(null), 'error-callback': () => onToken(null),
      });
    }).catch(() => onToken(null));
    return () => { cancelled = true; if (widget.current && window.turnstile) { try { window.turnstile.remove(widget.current); } catch { /* ignore */ } widget.current = null; } };
  }, [siteKey, resetKey]);                                // eslint-disable-line react-hooks/exhaustive-deps

  if (!siteKey) return null;
  return <div ref={box} data-testid="turnstile" style={{ margin: '12px 0', minHeight: 65 }} />;
}

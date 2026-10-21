import type { SupabaseClient } from '@supabase/supabase-js';
import { clientKey, type RateLimiter } from './rateLimit';
import type { TurnstileResult } from './turnstile';

/**
 * Server handlers for the PUBLIC (unauthenticated) submissions that are legitimate on a club website:
 * product inquiries and member registration. Protections: same-origin only, JSON only, small bodies, strict schema
 * (unknown fields rejected), honeypot, per-IP rate limits (and per-email for registration), generic error text,
 * server-side password hashing, and responses that never contain secrets (no password_hash, ever).
 *
 * They still reach the database as the anonymous role, exactly as before. They do NOT yet make the tables safe:
 * that needs the RLS cutover (insert-only policies or definer RPCs for these two tables). See docs/phase1/CUSTOMER_WRITE_PATHS.md.
 */
export interface PublicDeps {
  getClient: () => Promise<SupabaseClient>;
  limiter: RateLimiter;
  /** per-email limiter for registration */
  emailLimiter?: RateLimiter;
  hashPassword?: (plain: string) => Promise<string>;
  now?: () => number;
  /** Cloudflare Turnstile verification (lib/public/turnstile.ts). When provided, every submission needs a valid `turnstileToken`. */
  turnstile?: (token: unknown, remoteIp: string) => Promise<TurnstileResult>;
}

const json = (status: number, body: unknown, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...extra } });

function sameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return false;
  try { return new URL(origin).host === new URL(req.url).host; } catch { return false; }
}

async function readBody(req: Request, max = 8_000): Promise<Record<string, unknown> | Response> {
  if (req.method !== 'POST') return json(405, { error: 'method not allowed' });
  if (!sameOrigin(req)) return json(403, { error: 'forbidden' });
  if (!(req.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) return json(415, { error: 'unsupported' });
  const text = await req.text();
  if (text.length > max) return json(413, { error: 'too large' });
  let b: unknown;
  try { b = JSON.parse(text); } catch { return json(400, { error: 'invalid request' }); }
  if (typeof b !== 'object' || b === null || Array.isArray(b) || Object.getPrototypeOf(b) !== Object.prototype) return json(400, { error: 'invalid request' });
  return b as Record<string, unknown>;
}

const str = (v: unknown, min: number, max: number): string | null => (typeof v === 'string' && v.trim().length >= min && v.trim().length <= max ? v.trim() : null);
const onlyKeys = (o: Record<string, unknown>, keys: readonly string[]) => Object.keys(o).every(k => keys.includes(k));
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

async function limited(deps: PublicDeps, req: Request, extraKey?: string): Promise<Response | null> {
  const now = deps.now?.();
  const a = await deps.limiter.check(clientKey(req), now);
  if (!a.ok) return json(429, { error: 'too many requests' }, { 'retry-after': String(a.retryAfterSeconds) });
  if (extraKey && deps.emailLimiter) {
    const b = await deps.emailLimiter.check(extraKey, now);
    if (!b.ok) return json(429, { error: 'too many requests' }, { 'retry-after': String(b.retryAfterSeconds) });
  }
  return null;
}

/** Server-side Turnstile check (when configured). Unverifiable = refused; a failed challenge is a plain 400 with no detail. */
async function challenged(deps: PublicDeps, req: Request, token: unknown): Promise<Response | null> {
  if (!deps.turnstile) return null;
  const r = await deps.turnstile(token, clientKey(req));
  if (r.ok) return null;
  return r.reason === 'unavailable' ? json(503, { error: 'unavailable' }) : json(400, { error: 'verification failed' });
}

// ---------------------------------------------------------------- product inquiry
const INQUIRY_KEYS = ['productId', 'customerName', 'customerContact', 'message', 'website', 'turnstileToken'] as const;

/** POST /api/public/inquiry. Product name and item number are read from the catalogue, never from the request. */
export async function handleInquiry(req: Request, deps: PublicDeps): Promise<Response> {
  const body = await readBody(req); if (body instanceof Response) return body;
  const blocked = await limited(deps, req); if (blocked) return blocked;
  if (!onlyKeys(body, INQUIRY_KEYS)) return json(400, { error: 'invalid request' });
  if (body.website !== undefined && body.website !== '') return json(200, { ok: true });          // honeypot: pretend success, store nothing
  const notHuman = await challenged(deps, req, body.turnstileToken); if (notHuman) return notHuman;
  const productId = typeof body.productId === 'string' || typeof body.productId === 'number' ? String(body.productId) : '';
  const name = str(body.customerName, 1, 80), contact = str(body.customerContact, 3, 160);
  const message = body.message === undefined || body.message === null || body.message === '' ? null : str(body.message, 1, 1000);
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(productId) || !name || !contact || (body.message && message === null)) return json(400, { error: 'invalid request' });
  if ([name, contact, message ?? ''].some(s => CONTROL.test(s))) return json(400, { error: 'invalid request' });

  const client = await deps.getClient();
  const { data: product, error: pe } = await client.from('products').select('id,name,item_no').eq('id', productId).maybeSingle();
  if (pe) return json(503, { error: 'unavailable' });
  if (!product) return json(404, { error: 'unknown product' });
  const { error } = await client.from('product_inquiries').insert({
    product_id: product.id, item_no: product.item_no || null, product_name: product.name,
    customer_name: name, customer_contact: contact, message, status: 'new',
  });
  if (error) return json(503, { error: 'unavailable' });
  return json(200, { ok: true });
}

// ---------------------------------------------------------------- member registration
const REGISTER_KEYS = ['name', 'phone', 'email', 'nationality', 'city', 'password', 'refCode', 'website', 'turnstileToken'] as const;
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;

/** POST /api/public/register. Hashes the password on the server; returns the member WITHOUT any credential field. */
export async function handleRegister(req: Request, deps: PublicDeps): Promise<Response> {
  const body = await readBody(req); if (body instanceof Response) return body;
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const blocked = await limited(deps, req, EMAIL.test(email) ? `reg:${email}` : undefined); if (blocked) return blocked;
  if (!onlyKeys(body, REGISTER_KEYS)) return json(400, { error: 'invalid request' });
  if (body.website !== undefined && body.website !== '') return json(200, { ok: true });
  const notHuman = await challenged(deps, req, body.turnstileToken); if (notHuman) return notHuman;
  const name = str(body.name, 1, 80);
  const phone = body.phone ? str(body.phone, 3, 30) : null, nationality = body.nationality ? str(body.nationality, 1, 60) : null, city = body.city ? str(body.city, 1, 80) : null;
  const ref = body.refCode ? str(body.refCode, 1, 40) : null;
  const password = typeof body.password === 'string' && body.password.length >= 8 && body.password.length <= 200 ? body.password : null;
  if (!name || !EMAIL.test(email) || email.length > 254 || !password
    || (body.phone && !phone) || (body.nationality && !nationality) || (body.city && !city) || (body.refCode && (!ref || !/^[A-Za-z0-9-]{1,40}$/.test(ref)))
    || (phone && !/^[0-9+() .-]{3,30}$/.test(phone)) || [name, nationality ?? '', city ?? ''].some(s => CONTROL.test(s))) return json(400, { error: 'invalid request' });

  // Hash first, ALWAYS (same work whether or not the address is already registered), then let the database function decide.
  const hash = await (deps.hashPassword ?? (async (p: string) => (await import('bcryptjs')).default.hash(p, 10)))(password);
  const client = await deps.getClient();
  const { data, error } = await client.rpc('club_register_member', {
    p_name: name, p_email: email, p_phone: phone, p_nationality: nationality, p_city: city,
    p_password_hash: hash, p_referred_by: ref ? ref.toUpperCase() : null,
  });
  const status = (data as { status?: string } | null)?.status;
  if (error || (status !== 'accepted' && status !== 'created' && status !== 'exists')) return json(503, { error: 'unavailable' });   // v2 answers 'accepted'; older database versions answered created/exists
  // Identical answer for a new and an already-registered address: the response never says whether the email was known and never
  // carries a member record or credential. The client signs in explicitly afterwards (POST /api/public/member-login).
  return json(200, { ok: true });
}

// ---------------------------------------------------------------- legacy member login (password checked inside the database)
const LOGIN_KEYS = ['email', 'password', 'turnstileToken'] as const;

/** POST /api/public/member-login. The bcrypt comparison runs in public.club_member_login; the browser never receives a hash.
 *  Unknown address and wrong password produce the SAME 401 so the response cannot be used to find registered emails. */
export async function handleMemberLogin(req: Request, deps: PublicDeps): Promise<Response> {
  const body = await readBody(req, 2_000); if (body instanceof Response) return body;
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const blocked = await limited(deps, req, EMAIL.test(email) ? `login:${email}` : undefined); if (blocked) return blocked;
  if (!onlyKeys(body, LOGIN_KEYS)) return json(400, { error: 'invalid request' });
  const notHuman = await challenged(deps, req, body.turnstileToken); if (notHuman) return notHuman;
  const password = typeof body.password === 'string' && body.password.length >= 1 && body.password.length <= 200 ? body.password : null;
  if (!EMAIL.test(email) || email.length > 254 || !password) return json(401, { error: 'invalid credentials' });
  const client = await deps.getClient();
  const { data, error } = await client.rpc('club_member_login', { p_email: email, p_password: password });
  if (error || typeof data !== 'object' || data === null) return json(503, { error: 'unavailable' });
  const r = data as { ok?: boolean; limited?: boolean; retry_after?: number; session_token?: string; member?: Record<string, unknown> };
  if (r.limited) return json(429, { error: 'too many requests' }, { 'retry-after': String(Math.max(1, Math.floor(Number(r.retry_after) || 60))) });
  if (r.ok !== true || !r.member || typeof r.session_token !== 'string') return json(401, { error: 'invalid credentials' });
  const { password_hash: _omit, ...safe } = r.member as Record<string, unknown>;      // defence in depth: strip even if the database ever returned it
  void _omit;
  // The session token travels ONLY in an HttpOnly cookie: page scripts (and anything injected into the page) can never read it.
  return json(200, { ok: true, member: safe }, { 'set-cookie': sessionCookie(req, r.session_token, 12 * 60 * 60) });
}

// ---------------------------------------------------------------- legacy member session (HttpOnly cookie) and scoped self-view
export const MEMBER_SESSION_COOKIE = 'gm4wd_member_session';

function sessionCookie(req: Request, token: string, maxAgeSeconds: number): string {
  const secure = new URL(req.url).protocol === 'https:' ? '; Secure' : '';
  return `${MEMBER_SESSION_COOKIE}=${token}; Path=/; Max-Age=${maxAgeSeconds}; HttpOnly; SameSite=Lax${secure}`;
}

/** The session token from the Cookie header, or null. Only the 64-hex shape is accepted. */
export function readSessionToken(req: Request): string | null {
  const raw = req.headers.get('cookie') ?? '';
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === MEMBER_SESSION_COOKIE) {
      const v = part.slice(i + 1).trim();
      return /^[0-9a-f]{64}$/.test(v) ? v : null;
    }
  }
  return null;
}

const VIEW_SCOPES = ['tier', 'ticket_progress', 'membership', 'profile'] as const;

/** POST /api/public/member-view {scope}. Identity is the session cookie ONLY: no email, member id or role is read from the request.
 *  Returns just the fields of the requested scope (decided inside public.club_member_view). */
export async function handleMemberView(req: Request, deps: PublicDeps): Promise<Response> {
  const body = await readBody(req, 500); if (body instanceof Response) return body;
  const blocked = await limited(deps, req); if (blocked) return blocked;
  if (!onlyKeys(body, ['scope']) || typeof body.scope !== 'string' || !(VIEW_SCOPES as readonly string[]).includes(body.scope)) return json(400, { error: 'invalid request' });
  const token = readSessionToken(req);
  if (!token) return json(401, { error: 'not signed in' });
  const client = await deps.getClient();
  const { data, error } = await client.rpc('club_member_view', { p_token: token, p_scope: body.scope });
  if (error || typeof data !== 'object' || data === null) return json(503, { error: 'unavailable' });
  const r = data as { ok?: boolean; data?: Record<string, unknown> };
  if (r.ok !== true || !r.data) return json(401, { error: 'not signed in' }, { 'set-cookie': sessionCookie(req, '', 0) });   // expired or unknown: clear it
  return json(200, { ok: true, data: r.data });
}

/** POST /api/public/member-logout: ends the database session and clears the cookie. Always 200. */
export async function handleMemberLogout(req: Request, deps: PublicDeps): Promise<Response> {
  const body = await readBody(req, 200); if (body instanceof Response) return body;
  const token = readSessionToken(req);
  if (token) { try { await (await deps.getClient()).rpc('club_member_logout', { p_token: token }); } catch { /* the cookie is cleared regardless */ } }
  return json(200, { ok: true }, { 'set-cookie': sessionCookie(req, '', 0) });
}

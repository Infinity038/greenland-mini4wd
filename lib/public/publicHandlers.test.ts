import { describe, expect, it } from 'vitest';
import { FakeDb } from '@/lib/admin/fakeSupabase';
import { createRateLimiter } from './rateLimit';
import { handleInquiry, handleMemberLogin, handleMemberLogout, handleMemberView, handleRegister, readSessionToken, type PublicDeps } from './publicHandlers';

// Test doubles for the two database functions (their real behaviour is proved by tests/pp/rehearse_members.sh and the live Gate A checks).
const fakeHash = (p: string) => '$2b$10$' + Buffer.from(p).toString('hex').padEnd(53, '0').slice(0, 53);
function installMemberRpcs(db: FakeDb) {
  const attempts = new Map<string, number>(); let n = 0; const sessions = new Map<string, string>();
  const tokenOf = (email: string) => Buffer.from(email).toString('hex').padEnd(64, '0').slice(0, 64);
  db.rpcs.club_register_member = async a => {
    if (!/^\$2[aby]\$[0-9]{2}\$[./A-Za-z0-9]{53}$/.test(String(a.p_password_hash))) return { data: null, error: { message: 'invalid registration' } };
    const email = String(a.p_email).toLowerCase();
    if (db.rows('members').some(m => m.email === email)) return { data: { status: 'accepted' }, error: null };
    const row = { id: `m${++n}`, name: a.p_name, email, phone: a.p_phone, nationality: a.p_nationality, city: a.p_city, password_hash: a.p_password_hash, referred_by: a.p_referred_by, member_status: 'registered', loyalty_tier: 'non_member' };
    const { error } = await db.client().from('members').insert(row);
    if (error) return { data: null, error };
    const { password_hash: _h, ...safe } = row; void _h;
    void safe; return { data: { status: 'accepted' }, error: null };
  };
  db.rpcs.club_member_login = async a => {
    const email = String(a.p_email).toLowerCase(); const k = (attempts.get(email) ?? 0) + 1; attempts.set(email, k);
    if (k > 10) return { data: { ok: false, limited: true, retry_after: 600 }, error: null };
    const m = db.rows('members').find(r => r.email === email);
    if (!m || fakeHash(String(a.p_password)) !== m.password_hash) return { data: { ok: false }, error: null };
    const { password_hash: _h, ...safe } = m; void _h;
    const tok = tokenOf(email); sessions.set(tok, email);
    return { data: { ok: true, session_token: tok, member: safe }, error: null };
  };
  db.rpcs.club_member_view = async a => {
    const email = sessions.get(String(a.p_token)); const m = email ? db.rows('members').find(r => r.email === email) : undefined;
    if (!m) return { data: { ok: false }, error: null };
    const pick = (keys: string[]) => Object.fromEntries(keys.map(k => [k, m[k] ?? null]));
    const scopes: Record<string, string[]> = { tier: ['loyalty_tier'], ticket_progress: ['weekly_loyalty_progress', 'season_loyalty_progress'], membership: ['membership_expires_at'], profile: ['id', 'name', 'email', 'phone', 'city', 'loyalty_tier'] };
    return { data: { ok: true, data: pick(scopes[String(a.p_scope)] ?? []) }, error: null };
  };
  db.rpcs.club_member_logout = async a => ({ data: sessions.delete(String(a.p_token)), error: null });
}

function setup(over: Partial<PublicDeps> = {}) {
  const db = new FakeDb();
  db.seed('products', [{ id: 'p1', name: 'Real Product Name', item_no: 'AR-01' }]);
  db.seed('product_inquiries', []); db.seed('members', []); installMemberRpcs(db);
  let t = 1_000_000;
  const deps: PublicDeps = {
    getClient: async () => db.client(), limiter: createRateLimiter({ windowMs: 60_000, max: 3 }), emailLimiter: createRateLimiter({ windowMs: 60_000, max: 2 }),
    hashPassword: async p => fakeHash(p), now: () => t, ...over,
  };
  return { db, deps, tick: (ms: number) => { t += ms; } };
}
const post = (path: string, body: unknown, headers: Record<string, string> = {}, ip = '203.0.113.7') =>
  new Request(`https://club.example${path}`, { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://club.example', 'x-forwarded-for': ip, ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) });

const big = () => createRateLimiter({ windowMs: 60_000, max: 1000 });   // validation tests must not trip the limiter
const inq = { productId: 'p1', customerName: 'Kaya', customerContact: 'kaya@example.invalid', message: 'Is it in stock?' };

describe('POST /api/public/inquiry', () => {
  it('stores a valid inquiry and takes the product name and item number from the catalogue, not the browser', async () => {
    const { db, deps } = setup();
    const res = await handleInquiry(post('/api/public/inquiry', { ...inq, productName: 'FAKE NAME', item_no: 'HACK' }), deps);
    expect(res.status).toBe(400);                                  // client-supplied product fields are not even accepted
    const ok = await handleInquiry(post('/api/public/inquiry', inq), deps);
    expect(ok.status).toBe(200);
    expect(db.rows('product_inquiries')).toEqual([expect.objectContaining({ product_id: 'p1', product_name: 'Real Product Name', item_no: 'AR-01', customer_name: 'Kaya', status: 'new' })]);
  });
  it('unknown product -> 404; bad shapes -> 400; nothing stored', async () => {
    const { db, deps } = setup({ limiter: big() });
    expect((await handleInquiry(post('/api/public/inquiry', { ...inq, productId: 'nope' }), deps)).status).toBe(404);
    for (const bad of [{ ...inq, customerName: '' }, { ...inq, customerContact: 'x' }, { ...inq, productId: '../../etc' }, { ...inq, message: 'x'.repeat(1001) }, { ...inq, customerName: 'a\u0000b' }, { ...inq, extra: 1 }, { ...inq, status: 'closed' }, []]) {
      expect((await handleInquiry(post('/api/public/inquiry', bad), deps)).status, JSON.stringify(bad)).toBe(400);
    }
    expect(db.rows('product_inquiries')).toHaveLength(0);
  });
  it('honeypot: a filled hidden field looks successful but stores nothing', async () => {
    const { db, deps } = setup();
    const res = await handleInquiry(post('/api/public/inquiry', { ...inq, website: 'http://spam.example' }), deps);
    expect(res.status).toBe(200); expect(db.rows('product_inquiries')).toHaveLength(0);
  });
  it('rate limit: 4th request from one address in the window -> 429 with Retry-After; another address is unaffected; the window expires', async () => {
    const { db, deps, tick } = setup();
    for (let i = 0; i < 3; i++) expect((await handleInquiry(post('/api/public/inquiry', inq), deps)).status).toBe(200);
    const blocked = await handleInquiry(post('/api/public/inquiry', inq), deps);
    expect(blocked.status).toBe(429); expect(Number(blocked.headers.get('retry-after'))).toBeGreaterThan(0);
    expect((await handleInquiry(post('/api/public/inquiry', inq, {}, '198.51.100.9'), deps)).status).toBe(200);
    tick(61_000);
    expect((await handleInquiry(post('/api/public/inquiry', inq), deps)).status).toBe(200);
    expect(db.rows('product_inquiries')).toHaveLength(5);
  });
  it('cross-origin, missing Origin, wrong content type, bad JSON, oversize and GET are refused', async () => {
    const { db, deps } = setup();
    expect((await handleInquiry(post('/api/public/inquiry', inq, { origin: 'https://evil.example' }), deps)).status).toBe(403);
    expect((await handleInquiry(new Request('https://club.example/api/public/inquiry', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(inq) }), deps)).status).toBe(403);
    expect((await handleInquiry(post('/api/public/inquiry', inq, { 'content-type': 'text/plain' }), deps)).status).toBe(415);
    expect((await handleInquiry(post('/api/public/inquiry', '{nope'), deps)).status).toBe(400);
    expect((await handleInquiry(post('/api/public/inquiry', JSON.stringify({ ...inq, message: 'x'.repeat(9000) })), deps)).status).toBe(413);
    expect((await handleInquiry(new Request('https://club.example/api/public/inquiry', { method: 'GET' }), deps)).status).toBe(405);
    expect(db.rows('product_inquiries')).toHaveLength(0);
  });
  it('database failure -> 503 with no detail', async () => {
    const { db, deps } = setup(); db.failOn = (t, op) => (t === 'product_inquiries' && op === 'insert' ? 'connection to 10.0.0.5 refused' : null);
    const res = await handleInquiry(post('/api/public/inquiry', inq), deps);
    expect(res.status).toBe(503); expect(await res.text()).not.toMatch(/10\.0/);
  });
});

const reg = { name: 'Kaya Nielsen', email: 'Kaya@Example.invalid', phone: '+299 12 34 56', nationality: 'Greenland', city: 'Nuuk', password: 'correct horse battery' };

describe('Turnstile and the persistent limiter on the public routes', () => {
  const pass = async () => ({ ok: true as const }), refuse = async () => ({ ok: false as const, reason: 'invalid' as const }), down = async () => ({ ok: false as const, reason: 'unavailable' as const });
  it('a failed challenge is a plain 400 and nothing is stored; an unavailable verifier is a 503; success proceeds', async () => {
    const a = setup({ turnstile: refuse }); expect((await handleInquiry(post('/api/public/inquiry', { ...inq, turnstileToken: 'x'.repeat(40) }), a.deps)).status).toBe(400); expect(a.db.rows('product_inquiries')).toHaveLength(0);
    const b = setup({ turnstile: down }); expect((await handleRegister(post('/api/public/register', reg), b.deps)).status).toBe(503); expect(b.db.rows('members')).toHaveLength(0);
    const c = setup({ turnstile: pass }); expect((await handleInquiry(post('/api/public/inquiry', { ...inq, turnstileToken: 'x'.repeat(40) }), c.deps)).status).toBe(200);
  });
  it('the token is passed to the verifier together with the caller address, and the honeypot still short-circuits first', async () => {
    const seen: unknown[][] = [];
    const s = setup({ turnstile: async (t, ip) => { seen.push([t, ip]); return { ok: true as const }; } });
    await handleInquiry(post('/api/public/inquiry', { ...inq, turnstileToken: 'tok-' + 'y'.repeat(30) }, {}, '203.0.113.77'), s.deps);
    expect(seen).toEqual([['tok-' + 'y'.repeat(30), '203.0.113.77']]);
    const bot = setup({ turnstile: async () => { throw new Error('must not be called for a honeypot hit'); } });
    expect((await handleInquiry(post('/api/public/inquiry', { ...inq, website: 'spam' }), bot.deps)).status).toBe(200);
  });
  it('an asynchronous (database-style) limiter is awaited and its 429 is honoured', async () => {
    let n = 0;
    const dbLike = { check: async () => (++n > 2 ? { ok: false as const, retryAfterSeconds: 17 } : { ok: true as const }) };
    const s = setup({ limiter: dbLike });
    expect((await handleInquiry(post('/api/public/inquiry', inq), s.deps)).status).toBe(200);
    expect((await handleInquiry(post('/api/public/inquiry', inq), s.deps)).status).toBe(200);
    const blocked = await handleInquiry(post('/api/public/inquiry', inq), s.deps);
    expect(blocked.status).toBe(429); expect(blocked.headers.get('retry-after')).toBe('17');
  });
});

describe('POST /api/public/register', () => {
  it('creates the member with a lower-cased email and a SERVER-side hash, and never returns the hash', async () => {
    const { db, deps } = setup({ hashPassword: undefined });                       // use the real bcryptjs
    const res = await handleRegister(post('/api/public/register', reg), deps);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).not.toMatch(/password_hash|\$2[aby]\$/);
    const row = db.rows('members')[0];
    expect(row).toMatchObject({ email: 'kaya@example.invalid', name: 'Kaya Nielsen', phone: '+299 12 34 56' });
    expect(row.password_hash).toMatch(/^\$2[aby]\$10\$/);
    expect(row.password_hash).not.toContain('correct horse');
    expect(JSON.parse(text)).toEqual({ ok: true });                                  // no member record and no credential in the response
  });
  it('duplicate email (any letter case) gets the IDENTICAL answer as a new one and nothing new is stored', async () => {
    const { db, deps } = setup();
    const first = await handleRegister(post('/api/public/register', reg), deps);
    const second = await handleRegister(post('/api/public/register', { ...reg, email: 'KAYA@EXAMPLE.INVALID' }, {}, '198.51.100.1'), deps);
    expect(first.status).toBe(200); expect(second.status).toBe(200);
    expect(await second.text()).toBe(await first.text());                              // the response cannot reveal whether the address was already registered
    expect(db.rows('members')).toHaveLength(1);
  });
  it('validates every field; rejects unknown or privileged fields (member_status, loyalty_tier, id, is_admin, password_hash)', async () => {
    const { db, deps } = setup({ limiter: big(), emailLimiter: big() });
    const bad: unknown[] = [
      { ...reg, password: 'short' }, { ...reg, password: 'x'.repeat(201) }, { ...reg, email: 'not-an-email' }, { ...reg, email: 'a@b' }, { ...reg, name: '' },
      { ...reg, phone: 'call me' }, { ...reg, refCode: 'bad code!' },
      { ...reg, member_status: 'official' }, { ...reg, loyalty_tier: 'hall_of_fame' }, { ...reg, id: 'x' }, { ...reg, is_admin: true }, { ...reg, password_hash: '$2a$10$x' },
    ];
    let ip = 1;
    for (const b of bad) expect((await handleRegister(post('/api/public/register', b, {}, `198.51.100.${ip++}`), deps)).status, JSON.stringify(b)).toBe(400);
    expect(db.rows('members')).toHaveLength(0);
  });
  it('honeypot stores nothing; referral code is normalised', async () => {
    const { db, deps } = setup();
    expect((await handleRegister(post('/api/public/register', { ...reg, website: 'x' }), deps)).status).toBe(200);
    expect(db.rows('members')).toHaveLength(0);
    expect((await handleRegister(post('/api/public/register', { ...reg, refCode: 'abc-12' }), deps)).status).toBe(200);
    expect(db.rows('members')[0].referred_by).toBe('ABC-12');
  });
  it('per-address and per-email rate limits both apply', async () => {
    const { deps } = setup();
    expect((await handleRegister(post('/api/public/register', { ...reg, email: 'one@example.invalid' }), deps)).status).toBe(200);
    expect((await handleRegister(post('/api/public/register', { ...reg, email: 'one@example.invalid' }, {}, '198.51.100.2'), deps)).status).toBe(200);
    expect((await handleRegister(post('/api/public/register', { ...reg, email: 'one@example.invalid' }, {}, '198.51.100.3'), deps)).status).toBe(429);   // third attempt on that email
    const s2 = setup();
    for (let i = 0; i < 3; i++) await handleRegister(post('/api/public/register', { ...reg, email: `u${i}@example.invalid` }), s2.deps);
    expect((await handleRegister(post('/api/public/register', { ...reg, email: 'u9@example.invalid' }), s2.deps)).status).toBe(429);               // address limit
  });
  it('cross-origin and non-JSON are refused before anything is read or stored', async () => {
    const { db, deps } = setup();
    expect((await handleRegister(post('/api/public/register', reg, { origin: 'https://evil.example' }), deps)).status).toBe(403);
    expect((await handleRegister(post('/api/public/register', reg, { 'content-type': 'application/x-www-form-urlencoded' }), deps)).status).toBe(415);
    expect(db.rows('members')).toHaveLength(0);
  });
  it('a database error yields 503 and no detail', async () => {
    const { db, deps } = setup(); db.failOn = (t, op) => (t === 'members' && op === 'insert' ? 'duplicate key at 10.1.1.1' : null);
    const res = await handleRegister(post('/api/public/register', reg), deps);
    expect(res.status).toBe(503); expect(await res.text()).not.toMatch(/10\.1|duplicate/);
  });
});

describe('POST /api/public/member-login (password checked inside the database)', () => {
  const memberLogin = (b: unknown, ip = '203.0.113.7', headers: Record<string, string> = {}) => post('/api/public/member-login', b, headers, ip);
  async function withMember() {
    const s = setup({ limiter: big(), emailLimiter: big() });
    await handleRegister(post('/api/public/register', reg, {}, '198.51.100.50'), s.deps);
    return s;
  }
  it('correct password -> 200 with a member (no hash) and a session token', async () => {
    const { deps } = await withMember();
    const res = await handleMemberLogin(memberLogin({ email: 'KAYA@example.invalid', password: reg.password }), deps);
    expect(res.status).toBe(200);
    const text = await res.text(); const body = JSON.parse(text);
    expect(body.ok).toBe(true); expect(body.sessionToken).toBeUndefined();                       // the token is never in the body
    const cookie = res.headers.get('set-cookie') ?? '';
    expect(cookie).toMatch(/^gm4wd_member_session=[0-9a-f]{64};/); expect(cookie).toMatch(/HttpOnly/); expect(cookie).toMatch(/SameSite=Lax/); expect(cookie).toMatch(/Secure/); expect(cookie).toMatch(/Max-Age=43200/);
    expect(body.member).toMatchObject({ email: 'kaya@example.invalid' });
    expect(text).not.toMatch(/password_hash|\$2[aby]\$/);
  });
  it('wrong password and unknown email return the SAME 401 body (no account enumeration)', async () => {
    const { deps } = await withMember();
    const wrong = await handleMemberLogin(memberLogin({ email: 'kaya@example.invalid', password: 'nope-nope-nope' }), deps);
    const unknown = await handleMemberLogin(memberLogin({ email: 'nobody@example.invalid', password: 'nope-nope-nope' }), deps);
    expect(wrong.status).toBe(401); expect(unknown.status).toBe(401);
    expect(await wrong.text()).toBe(await unknown.text());
  });
  it('malformed input is a 401 without a database call; unknown or privileged fields are rejected with 400', async () => {
    const { deps } = await withMember();
    expect((await handleMemberLogin(memberLogin({ email: 'bad', password: 'x' }), deps)).status).toBe(401);
    expect((await handleMemberLogin(memberLogin({ email: 'kaya@example.invalid', password: '' }), deps)).status).toBe(401);
    expect((await handleMemberLogin(memberLogin({ email: 'kaya@example.invalid', password: reg.password, member_status: 'official' }), deps)).status).toBe(400);
  });
  it('the database throttle is surfaced as 429 with retry-after', async () => {
    const { deps } = await withMember();
    let last: Response | null = null;
    for (let i = 0; i < 11; i++) last = await handleMemberLogin(memberLogin({ email: 'kaya@example.invalid', password: 'wrong-' + i }), deps);
    expect(last!.status).toBe(429); expect(last!.headers.get('retry-after')).toBe('600');
  });
  it('route limiter, cross-origin, non-JSON and Turnstile are enforced before the database is asked', async () => {
    const refuse = async () => ({ ok: false as const, reason: 'invalid' as const });
    const a = setup({ turnstile: refuse }); let called = 0; const orig = a.db.rpcs.club_member_login; a.db.rpcs.club_member_login = async x => { called++; return orig(x); };
    expect((await handleMemberLogin(memberLogin({ email: 'kaya@example.invalid', password: 'x' }), a.deps)).status).toBe(400);
    const b = setup();
    expect((await handleMemberLogin(memberLogin({ email: 'kaya@example.invalid', password: 'x' }, '203.0.113.9', { origin: 'https://evil.example' }), b.deps)).status).toBe(403);
    expect((await handleMemberLogin(memberLogin({ email: 'kaya@example.invalid', password: 'x' }, '203.0.113.9', { 'content-type': 'text/plain' }), b.deps)).status).toBe(415);
    const c = setup({ limiter: createRateLimiter({ windowMs: 60_000, max: 1 }) });
    await handleMemberLogin(memberLogin({ email: 'kaya@example.invalid', password: 'x' }), c.deps);
    expect((await handleMemberLogin(memberLogin({ email: 'kaya@example.invalid', password: 'x' }), c.deps)).status).toBe(429);
    expect(called).toBe(0);
  });
  it('a database error is a plain 503 with no detail', async () => {
    const { deps, db } = setup(); db.rpcs.club_member_login = async () => ({ data: null, error: { message: 'boom 10.0.0.1' } });
    const res = await handleMemberLogin(memberLogin({ email: 'kaya@example.invalid', password: 'x' }), deps);
    expect(res.status).toBe(503); expect(await res.text()).not.toMatch(/boom|10\.0/);
  });
});

describe('member session cookie, scoped self-view and logout', () => {
  const postTo = (path: string, body: unknown, cookie?: string, ip = '203.0.113.7') => post(path, body, cookie ? { cookie } : {}, ip);
  async function signedIn(email = 'kaya@example.invalid') {
    const s = setup({ limiter: big(), emailLimiter: big() });
    await handleRegister(post('/api/public/register', { ...reg, email }, {}, '198.51.100.50'), s.deps);
    const res = await handleMemberLogin(post('/api/public/member-login', { email, password: reg.password }), s.deps);
    const cookie = (res.headers.get('set-cookie') ?? '').split(';')[0];
    return { ...s, cookie };
  }
  it('readSessionToken accepts only a 64-hex value of the right cookie', () => {
    const t = 'ab'.repeat(32);
    const mk = (c: string) => new Request('https://club.example/x', { headers: { cookie: c } });
    expect(readSessionToken(mk('a=1; gm4wd_member_session=' + t + '; b=2'))).toBe(t);
    expect(readSessionToken(mk('gm4wd_member_session=short'))).toBeNull();
    expect(readSessionToken(mk('other=' + t))).toBeNull();
    expect(readSessionToken(new Request('https://club.example/x'))).toBeNull();
  });
  it('anonymous (no cookie) is a 401 and the database is never asked', async () => {
    const { deps, db } = setup({ limiter: big() }); let called = 0; const o = db.rpcs.club_member_view; db.rpcs.club_member_view = async x => { called++; return o(x); };
    const res = await handleMemberView(postTo('/api/public/member-view', { scope: 'tier' }), deps);
    expect(res.status).toBe(401); expect(called).toBe(0);
  });
  it('a signed-in member gets ONLY the requested scope', async () => {
    const { deps, cookie } = await signedIn();
    const tier = await (await handleMemberView(postTo('/api/public/member-view', { scope: 'tier' }, cookie), deps)).json();
    expect(tier).toEqual({ ok: true, data: { loyalty_tier: 'non_member' } });
    const prog = await (await handleMemberView(postTo('/api/public/member-view', { scope: 'ticket_progress' }, cookie), deps)).json();
    expect(Object.keys(prog.data).sort()).toEqual(['season_loyalty_progress', 'weekly_loyalty_progress']);
    const text = JSON.stringify(await (await handleMemberView(postTo('/api/public/member-view', { scope: 'profile' }, cookie), deps)).json());
    expect(text).not.toMatch(/password_hash|auth_user_id|\$2[aby]\$/);
  });
  it('two members each see only their own data; identity cannot be supplied in the request', async () => {
    const a = await signedIn('one@example.invalid');
    await handleRegister(post('/api/public/register', { ...reg, email: 'two@example.invalid' }, {}, '198.51.100.51'), a.deps);
    a.db.rows('members').find(m => m.email === 'two@example.invalid')!.loyalty_tier = 'gold';
    const resB = await handleMemberLogin(post('/api/public/member-login', { email: 'two@example.invalid', password: reg.password }, {}, '203.0.113.8'), a.deps);
    const cookieB = (resB.headers.get('set-cookie') ?? '').split(';')[0];
    expect((await (await handleMemberView(postTo('/api/public/member-view', { scope: 'tier' }, a.cookie), a.deps)).json()).data.loyalty_tier).toBe('non_member');
    expect((await (await handleMemberView(postTo('/api/public/member-view', { scope: 'tier' }, cookieB), a.deps)).json()).data.loyalty_tier).toBe('gold');
    for (const extra of [{ email: 'two@example.invalid' }, { memberId: 'x' }, { role: 'admin' }]) {
      expect((await handleMemberView(postTo('/api/public/member-view', { scope: 'tier', ...extra }, a.cookie), a.deps)).status).toBe(400);
    }
  });
  it('unknown scope, cross-origin and non-JSON are refused; an unknown cookie is a 401 that clears the cookie', async () => {
    const { deps, cookie } = await signedIn();
    expect((await handleMemberView(postTo('/api/public/member-view', { scope: 'everything' }, cookie), deps)).status).toBe(400);
    expect((await handleMemberView(post('/api/public/member-view', { scope: 'tier' }, { cookie, origin: 'https://evil.example' }), deps)).status).toBe(403);
    expect((await handleMemberView(post('/api/public/member-view', { scope: 'tier' }, { cookie, 'content-type': 'text/plain' }), deps)).status).toBe(415);
    const bad = await handleMemberView(postTo('/api/public/member-view', { scope: 'tier' }, 'gm4wd_member_session=' + 'f'.repeat(64)), deps);
    expect(bad.status).toBe(401); expect(bad.headers.get('set-cookie')).toMatch(/Max-Age=0/);
  });
  it('logout ends the session (the same cookie no longer works) and clears the cookie', async () => {
    const { deps, cookie } = await signedIn();
    const out = await handleMemberLogout(postTo('/api/public/member-logout', {}, cookie), deps);
    expect(out.status).toBe(200); expect(out.headers.get('set-cookie')).toMatch(/Max-Age=0/);
    expect((await handleMemberView(postTo('/api/public/member-view', { scope: 'tier' }, cookie), deps)).status).toBe(401);
  });
  it('a database error on view is a plain 503', async () => {
    const { deps, db, cookie } = await signedIn(); db.rpcs.club_member_view = async () => ({ data: null, error: { message: 'boom 10.0.0.9' } });
    const res = await handleMemberView(postTo('/api/public/member-view', { scope: 'tier' }, cookie), deps);
    expect(res.status).toBe(503); expect(await res.text()).not.toMatch(/boom|10\.0/);
  });
});

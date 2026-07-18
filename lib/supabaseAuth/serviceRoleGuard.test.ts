// Static-source proof that this milestone's Auth scaffolding never
// references a service-role key or environment variable, and that the
// server-only client cannot be pulled into a client component. No live
// Supabase project is touched by any check in this file.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Matches the actual env var / identifier shape a real introduction would
// use (e.g. SUPABASE_SERVICE_ROLE_KEY, service_role_key) — deliberately NOT
// a bare "service role" prose match, since this milestone's own comments
// legitimately explain, in hyphenated prose, that no service-role key is
// used anywhere (see e.g. serverClient.ts's header comment); a prose match
// would flag that explanatory sentence as if it were a real reference.
const SERVICE_ROLE_PATTERN = /SUPABASE_SERVICE_ROLE|service_role_key|service[_-]?role\s*[:=]/i;

const NEW_AUTH_FILES = [
  ['lib', 'supabaseAuth', 'browserClient.ts'],
  ['lib', 'supabaseAuth', 'serverClient.ts'],
  ['lib', 'supabaseAuth', 'middlewareClient.ts'],
  ['lib', 'supabaseAuth', 'roles.ts'],
  ['lib', 'supabaseAuth', 'resolveStaffSession.ts'],
  ['app', 'admin', 'login', 'page.tsx'],
  ['app', 'admin', 'login', 'SupabaseAuthLoginScreen.tsx'],
];

function readSrc(parts: string[]): string {
  return readFileSync(join(process.cwd(), ...parts), 'utf-8');
}

describe('no service-role key/env var anywhere in this milestone\'s new code', () => {
  for (const parts of NEW_AUTH_FILES) {
    it(`${parts.join('/')} contains no "service role"/"service_role" reference`, () => {
      expect(readSrc(parts)).not.toMatch(SERVICE_ROLE_PATTERN);
    });
  }

  it('package.json was not given a service-role-key dependency or script', () => {
    const pkg = readSrc(['package.json']);
    expect(pkg).not.toMatch(SERVICE_ROLE_PATTERN);
  });
});

describe('client code only ever reads the public anon key, never a privileged key', () => {
  it('browserClient.ts reads exactly NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY', () => {
    const src = readSrc(['lib', 'supabaseAuth', 'browserClient.ts']);
    expect(src).toMatch(/NEXT_PUBLIC_SUPABASE_URL/);
    expect(src).toMatch(/NEXT_PUBLIC_SUPABASE_ANON_KEY/);
    expect(src).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
  });

  it('SupabaseAuthLoginScreen.tsx never constructs a Supabase client directly — only via the shared browser client module', () => {
    const src = readSrc(['app', 'admin', 'login', 'SupabaseAuthLoginScreen.tsx']);
    expect(src).not.toMatch(/createClient\s*\(/);
    expect(src).toMatch(/createSupabaseBrowserClient/);
  });
});

describe('server-only module cannot be silently pulled into client code', () => {
  it('serverClient.ts imports the server-only guard', () => {
    const src = readSrc(['lib', 'supabaseAuth', 'serverClient.ts']);
    expect(src).toMatch(/import\s+['"]server-only['"]/);
  });

  it('the client-facing login screen never imports serverClient.ts', () => {
    const src = readSrc(['app', 'admin', 'login', 'SupabaseAuthLoginScreen.tsx']);
    expect(src).not.toMatch(/serverClient/);
  });

  it('browserClient.ts itself never imports the server-only guard (it is a client module)', () => {
    const src = readSrc(['lib', 'supabaseAuth', 'browserClient.ts']);
    expect(src).not.toMatch(/import\s+['"]server-only['"]/);
    expect(src).toMatch(/^'use client';/);
  });
});

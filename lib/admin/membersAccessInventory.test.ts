import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Guard for the members lockdown (R4/R5): once `public.members` is sealed, only signed-in roles with a policy can read it.
 *  - nothing may read or write members through the ANONYMOUS client (`@/lib/supabase`), because after R4/R5 that returns nothing;
 *  - nothing may select every column or the password hash;
 * Admin pages use the cookie-session client (role `authenticated`, staff policy); the public site uses the club_* database functions.
 */
function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.next' || name.startsWith('.')) continue;
    const p = join(dir, name); const st = statSync(p);
    if (st.isDirectory()) sourceFiles(p, out);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}
const files = ['app', 'lib', 'components'].flatMap(d => sourceFiles(join(process.cwd(), d)));
const read = (f: string) => readFileSync(f, 'utf8');

describe('members table access inventory', () => {
  it('no source file reads or writes members through the anonymous client', () => {
    const bad = files.filter(f => /(^|[^A-Za-z_])supabase\s*\.from\(\s*['"]members['"]/.test(read(f)) || /(^|[^A-Za-z_])supabase\s*\n\s*\.from\(\s*['"]members['"]/.test(read(f)));
    expect(bad.map(f => f.replace(process.cwd(), ''))).toEqual([]);
  });
  it('no query selects every column or password_hash from members', () => {
    const bad = files.filter(f => /\.from\(\s*['"]members['"]\s*\)\s*\.select\(\s*['"][^'"]*(\*|password_hash)/.test(read(f)));
    expect(bad.map(f => f.replace(process.cwd(), ''))).toEqual([]);
  });
  it('the admin member reads use the cookie-session (staff) client', () => {
    const adminFiles = files.filter(f => f.replace(/\\/g, '/').includes('/app/admin/') && /\.from\(\s*['"]members['"]/.test(read(f)) && !/adminWrite\(\{ table: 'members'/.test(read(f).split('\n').filter(l => /\.from\(\s*['"]members['"]/.test(l)).join('\n')));
    for (const f of adminFiles) expect(read(f), f).toMatch(/createSupabaseBrowserClient\(\)\s*\n?\s*\.from\(\s*['"]members['"]/);
  });
});

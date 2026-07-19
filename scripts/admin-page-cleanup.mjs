#!/usr/bin/env node
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = path.join(process.cwd(), 'app', 'admin');
const walk = dir => readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);

function cutFunction(src, name) {
  const start = src.search(new RegExp(`function\\s+${name}\\s*\\(`));
  if (start < 0) return src;
  const brace = src.indexOf('{', start);
  let depth = 0;
  for (let i = brace; i < src.length; i++) {
    if (src[i] === '{') depth++;
    if (src[i] === '}' && --depth === 0) return src.slice(0, start) + src.slice(i + 1);
  }
  throw new Error(`Unbalanced ${name}`);
}

function cleanEffect(src) {
  const marker = src.indexOf('checkAuth()');
  if (marker < 0) return src;
  const start = src.lastIndexOf('useEffect(', marker);
  const end = src.indexOf('}, []);', marker);
  if (start < 0 || end < 0) throw new Error('Unsupported auth effect');
  const effect = src.slice(start, end + 7);
  const bodyMatch = effect.match(/if \(ok\) \{([\s\S]*?)\}\s*\}, \[\]\);/) || effect.match(/if \(ok\) ([\s\S]*?;)\s*\}, \[\]\);/);
  const replacement = bodyMatch ? `useEffect(() => { ${bodyMatch[1].trim()} }, []);` : '';
  return src.slice(0, start) + replacement + src.slice(end + 7);
}

for (const file of walk(root).filter(f => f.endsWith('/page.tsx'))) {
  const rel = path.relative(root, file).replaceAll('\\', '/');
  if (rel === 'page.tsx' || rel === 'login/page.tsx') continue;
  let src = readFileSync(file, 'utf8');
  const before = src;
  src = cleanEffect(src);
  for (const name of ['checkAuth', 'saveAuth', 'LoginScreen']) src = cutFunction(src, name);
  src = src.replace(/^\s*const ADMIN_PASSWORD\s*=.*?;\s*$/gm, '');
  src = src.replace(/^\s*const \[(authed|checked), set(Authed|Checked)\] = useState\(false\);\s*$/gm, '');
  src = src.replace(/^\s*if \(!checked\) return null;\s*$/gm, '');
  src = src.replace(/\n\s*if \(!authed\) return <LoginScreen[\s\S]*?\/>;\s*\n/, '\n');
  src = src.replace(/\n{3,}/g, '\n\n');
  if (src !== before) writeFileSync(file, src);
}

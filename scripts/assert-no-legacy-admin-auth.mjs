#!/usr/bin/env node
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd(), 'app', 'admin');
const FORBIDDEN = [
  ['hardcoded password', /mini4wd2026/i],
  ['legacy admin session', /adminSession/],
  ['legacy password constant', /ADMIN_PASSWORD/],
  ['legacy checkAuth helper', /\bcheckAuth\s*\(/],
  ['legacy saveAuth helper', /\bsaveAuth\s*\(/],
  ['embedded legacy login screen', /function\s+LoginScreen\s*\(/],
];

function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? files(full) : [full];
  });
}

const failures = [];
for (const file of files(ROOT).filter(file => /\.(ts|tsx|js|jsx)$/.test(file))) {
  const source = readFileSync(file, 'utf8');
  for (const [label, pattern] of FORBIDDEN) {
    if (pattern.test(source)) failures.push(`${path.relative(process.cwd(), file)}: ${label}`);
  }
}

if (failures.length) {
  console.error('Legacy admin authentication remains:\n' + failures.map(item => `- ${item}`).join('\n'));
  process.exit(1);
}

console.log('Legacy admin password and local-session authentication: 0 occurrences.');

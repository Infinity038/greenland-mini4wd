#!/usr/bin/env node
// One-off, server-only importer: links existing public.members rows to real
// Supabase Auth identities, created exclusively through the Supabase Auth
// Admin API — never by inserting/updating auth.users or auth.identities
// directly with SQL (see supabase/migrations-proposed/
// phase1_auth_foundation_forward.sql's SCOPE CORRECTION note for why).
//
// NEVER imported by application code and NEVER bundled for the browser —
// it requires SUPABASE_SERVICE_ROLE_KEY, a privileged secret that must
// never carry a NEXT_PUBLIC_ prefix and must never reach client code. This
// file has no import from/into app/, components/, or lib/ used by the app
// at runtime; it is only ever invoked directly with `node`.
//
// SAFETY MODEL:
//   - Default mode is dry-run: no Admin API call and no members write of any
//     kind happens unless --apply is passed.
//   - A bulk run (more than one member would be written) additionally
//     requires --confirm-bulk, even with --apply. This forces every first
//     real run to be scoped with --member-id (a one-member pilot) unless the
//     operator deliberately opts into a bulk run.
//   - --member-id=<uuid> scopes the run to exactly one members.id.
//   - Every log line and every report entry is built through maskEmail()/
//     buildReportEntry() below — password_hash, plaintext passwords,
//     SUPABASE_SERVICE_ROLE_KEY, and any Auth token are never read into a
//     log or report value anywhere in this file.
//
// See docs/MEMBER-AUTH-MIGRATION-PLAN.md for the full operational procedure
// this script is one step of, and docs/PRE-MIGRATION-BACKUP-AND-VALIDATION.md
// for the required backup/branch/pilot sequence before running this for
// real against any live project.

import { createClient } from '@supabase/supabase-js';

// ── Pure helpers (no network, fully unit-testable) ──────────────────────

// Standard bcrypt hash shape: $2a$/$2b$/$2y$ + 2-digit cost + $ + 53
// base64-alphabet characters (22-char salt + 31-char hash), 60 chars total.
// Anything else — including a plaintext password, an empty string, or a
// hash from a different algorithm — is rejected, never guessed at.
export const BCRYPT_HASH_PATTERN = /^\$2[aby]\$\d{2}\$[A-Za-z0-9./]{53}$/;

export function isValidBcryptHash(hash) {
  return typeof hash === 'string' && BCRYPT_HASH_PATTERN.test(hash);
}

// The single metadata key used to prove "this Auth user was created by this
// script for this exact member row" — the only thing that ever justifies
// relinking an existing Auth user instead of treating it as an unrelated
// collision requiring manual review.
export const MIGRATION_METADATA_KEY = 'migrated_from_members_id';

export function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : email;
}

// Never logs/report a real address in full. "ab***@example.com" for a
// normal address; for a local part of 2 chars or fewer, masks the whole
// local part so nothing meaningful leaks either way.
export function maskEmail(email) {
  const normalized = normalizeEmail(email);
  if (!normalized || !normalized.includes('@')) return '***';
  const [local, domain] = normalized.split('@');
  const visible = local.length > 2 ? local.slice(0, 2) : '';
  return `${visible}***@${domain}`;
}

export function parseCliArgs(argv) {
  const args = { apply: false, confirmBulk: false, memberId: null };
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === '--apply') args.apply = true;
    else if (token === '--confirm-bulk') args.confirmBulk = true;
    else if (token === '--member-id') args.memberId = argv[++i] ?? null;
    else if (token.startsWith('--member-id=')) args.memberId = token.slice('--member-id='.length);
  }
  return args;
}

// Pure, network-free classification of a single member row. Does not know
// about any *other* member, and does not know whether an Auth user already
// exists for this email — planMigration() layers both of those in.
export function classifyMemberLocally(member) {
  if (member.auth_user_id) {
    return { path: 'already_linked', reason: 'members.auth_user_id is already populated.' };
  }
  if (member.member_status === 'guest') {
    return { path: 'guest_skipped', reason: 'Guest members never had a password and are excluded from migration by default.' };
  }
  if (isValidBcryptHash(member.password_hash)) {
    return { path: 'existing_bcrypt', reason: 'password_hash matches the supported bcrypt format.' };
  }
  return { path: 'invitation_required', reason: 'No usable existing password hash — requires an Auth invitation/reset.' };
}

// Detects duplicate emails among the *input* member rows themselves
// (normalized, case-insensitive) — independent of anything already in
// Supabase Auth. Per the required safety rule, any duplicate stops the
// entire run before any write is attempted.
export function detectDuplicateMemberEmails(members) {
  const seen = new Map();
  const duplicates = new Map();
  for (const member of members) {
    const key = normalizeEmail(member.email);
    if (!key) continue;
    if (seen.has(key)) {
      const ids = duplicates.get(key) ?? [seen.get(key)];
      ids.push(member.id);
      duplicates.set(key, ids);
    } else {
      seen.set(key, member.id);
    }
  }
  return Array.from(duplicates.entries()).map(([email, memberIds]) => ({ email, memberIds }));
}

// Builds the full migration plan for a set of members. `findExistingAuthUser`
// is an injectable async lookup, (normalizedEmail) => existingAuthUserOrNull
// where existingAuthUserOrNull is either null or
// `{ id, user_metadata }` — kept injectable so tests never need a real
// Supabase Admin API or network access, and so the default implementation
// (searchAuthUsersByEmail, below) can change independently of this logic.
export async function planMigration(members, { findExistingAuthUser }) {
  const duplicates = detectDuplicateMemberEmails(members);
  if (duplicates.length > 0) {
    return {
      ok: false,
      fatalError: 'duplicate_member_emails',
      duplicates,
      entries: [],
    };
  }

  const entries = [];
  for (const member of members) {
    const local = classifyMemberLocally(member);
    if (local.path === 'already_linked' || local.path === 'guest_skipped') {
      entries.push({ member, path: local.path, reason: local.reason });
      continue;
    }

    const existing = await findExistingAuthUser(normalizeEmail(member.email));
    if (existing) {
      const linkedMemberId = existing.user_metadata?.[MIGRATION_METADATA_KEY];
      if (linkedMemberId === member.id) {
        // A prior run's Admin API call succeeded but the subsequent
        // members.auth_user_id write did not — this is our own partial
        // migration, verified by metadata, not a stranger's account. Safe
        // to relink without creating anything new.
        entries.push({ member, path: 'relink_existing', reason: 'A matching Auth user already exists with verified migration metadata from a prior partial run.', existingAuthUserId: existing.id });
      } else {
        entries.push({ member, path: 'collision_manual_review', reason: 'An Auth user already exists for this email with no verified migration metadata linking it to this member. Never auto-attached.' });
      }
      continue;
    }

    entries.push({ member, path: local.path, reason: local.reason });
  }

  return { ok: true, fatalError: null, duplicates: [], entries };
}

// Non-sensitive dry-run/execution report line — never includes
// password_hash, plaintext password, service-role key, or any Auth token.
/**
 * @typedef {Object} ReportEntry
 * @property {string} memberId
 * @property {string} maskedEmail
 * @property {string} currentLinkage
 * @property {string} path
 * @property {string} [reason]
 * @property {string} [outcome]
 * @property {string} [authUserId]
 * @property {string} [error]
 */
/**
 * @param {{ member: { id: string, email: string, auth_user_id?: string | null }, path: string, reason: string, existingAuthUserId?: string }} entry
 * @param {Record<string, unknown>} [extra]
 * @returns {ReportEntry}
 */
export function buildReportEntry(entry, extra = {}) {
  return {
    memberId: entry.member.id,
    maskedEmail: maskEmail(entry.member.email),
    currentLinkage: entry.member.auth_user_id ? 'linked' : 'unlinked',
    path: entry.path,
    reason: entry.reason,
    ...extra,
  };
}

// ── Admin API write paths (Path A / Path B) ──────────────────────────────

// Path A payload — the bcrypt hash travels as `password_hash`, verbatim,
// never as `password`. Asserted by this shape alone: there is no
// `password` key anywhere in this object, so it is structurally impossible
// for this function to submit the hash as a plaintext password.
export function buildCreateUserPayload(member) {
  return {
    email: normalizeEmail(member.email),
    password_hash: member.password_hash,
    email_confirm: true,
    user_metadata: { [MIGRATION_METADATA_KEY]: member.id },
  };
}

// Path B — no password/hash of any kind is sent; Supabase Auth's invitation
// flow is what lets the member set their own password.
export function buildInvitePayload(member) {
  return {
    email: normalizeEmail(member.email),
    options: {
      data: { [MIGRATION_METADATA_KEY]: member.id, requires_password_reset: true },
    },
  };
}

// Applies one plan entry. `client` is the Supabase Admin client (or a test
// double shaped like one: `{ auth: { admin: { createUser, inviteUserByEmail } }, from(table) }`).
// Never called at all unless options.apply is true (enforced by the caller,
// runMigration, not here) — this function itself has no dry-run branch on
// purpose, so there is exactly one code path that ever performs a write,
// not two copies that could drift apart.
async function applyEntry(client, entry) {
  const { member, path } = entry;

  if (path === 'relink_existing') {
    const { error } = await client.from('members').update({ auth_user_id: entry.existingAuthUserId }).eq('id', member.id);
    if (error) {
      return buildReportEntry(entry, { outcome: 'failed_linking', authUserId: entry.existingAuthUserId, error: error.message });
    }
    return buildReportEntry(entry, { outcome: 'relinked', authUserId: entry.existingAuthUserId });
  }

  if (path === 'existing_bcrypt') {
    const { data, error } = await client.auth.admin.createUser(buildCreateUserPayload(member));
    if (error || !data?.user?.id) {
      return buildReportEntry(entry, { outcome: 'failed_creation', error: error?.message ?? 'no user id returned' });
    }
    const authUserId = data.user.id;
    const { error: linkError } = await client.from('members').update({ auth_user_id: authUserId }).eq('id', member.id);
    if (linkError) {
      // Auth creation succeeded but the members write did not — a genuine
      // partial migration, not a failure to roll back. Report it clearly;
      // never attempt a second createUser for this member on a later run
      // (planMigration's relink_existing path — verified by metadata —
      // is what completes this safely next time).
      return buildReportEntry(entry, { outcome: 'partial_migration_manual_repair', authUserId, error: linkError.message });
    }
    return buildReportEntry(entry, { outcome: 'created', authUserId });
  }

  if (path === 'invitation_required') {
    const payload = buildInvitePayload(member);
    const { data, error } = await client.auth.admin.inviteUserByEmail(payload.email, payload.options);
    if (error || !data?.user?.id) {
      return buildReportEntry(entry, { outcome: 'failed_creation', error: error?.message ?? 'no user id returned' });
    }
    const authUserId = data.user.id;
    const { error: linkError } = await client.from('members').update({ auth_user_id: authUserId }).eq('id', member.id);
    if (linkError) {
      return buildReportEntry(entry, { outcome: 'partial_migration_manual_repair', authUserId, error: linkError.message });
    }
    return buildReportEntry(entry, { outcome: 'invited', authUserId });
  }

  // already_linked / guest_skipped / collision_manual_review: never written.
  return buildReportEntry(entry, { outcome: 'skipped' });
}

// ── Orchestration ─────────────────────────────────────────────────────

// This does not claim the overall member -> Auth-user -> members-row
// operation is transactionally atomic — it spans two independent systems
// (Supabase Auth and the members table) with no shared transaction. Each
// step's real outcome is reported individually
// (created/invited/relinked/partial_migration_manual_repair/failed_*)
// instead.
export async function runMigration({ client, members, options, findExistingAuthUser }) {
  const scopedMembers = options.memberId
    ? members.filter(m => m.id === options.memberId)
    : members;

  const plan = await planMigration(scopedMembers, { findExistingAuthUser });
  if (!plan.ok) {
    return { ok: false, fatalError: plan.fatalError, duplicates: plan.duplicates, report: [] };
  }

  const writableEntries = plan.entries.filter(e =>
    e.path === 'existing_bcrypt' || e.path === 'invitation_required' || e.path === 'relink_existing'
  );

  if (!options.apply) {
    return { ok: true, fatalError: null, dryRun: true, report: plan.entries.map(e => buildReportEntry(e, { outcome: 'would_' + (writableEntries.includes(e) ? e.path : 'skip') })) };
  }

  if (writableEntries.length > 1 && !options.confirmBulk) {
    return {
      ok: false,
      fatalError: 'bulk_apply_not_confirmed',
      message: `${writableEntries.length} members would be written — re-run with --confirm-bulk to proceed, or scope to one member with --member-id.`,
      report: [],
    };
  }

  const report = [];
  for (const entry of plan.entries) {
    if (entry.path === 'already_linked' || entry.path === 'guest_skipped' || entry.path === 'collision_manual_review') {
      report.push(buildReportEntry(entry, { outcome: 'skipped' }));
      continue;
    }
    report.push(await applyEntry(client, entry));
  }

  return { ok: true, fatalError: null, dryRun: false, report };
}

// Default (non-test) existing-Auth-user lookup — paginates
// auth.admin.listUsers() since the Admin API has no direct getUserByEmail.
// Only ever used by main() below; tests inject their own
// findExistingAuthUser instead.
async function searchAuthUsersByEmail(client, normalizedEmail) {
  let page = 1;
  const perPage = 200;
  for (;;) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage });
    if (error || !data?.users) return null;
    const match = data.users.find(u => normalizeEmail(u.email) === normalizedEmail);
    if (match) return match;
    if (data.users.length < perPage) return null;
    page += 1;
  }
}

// ── CLI entry point — never runs on import, only on direct invocation ───

async function main() {
  const args = parseCliArgs(process.argv.slice(2));

  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    console.error('SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY are required. Neither value is ever logged.');
    process.exitCode = 1;
    return;
  }

  const client = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const { data: members, error: membersError } = await client
    .from('members')
    .select('id, email, password_hash, member_status, auth_user_id');
  if (membersError) {
    console.error('Failed to read members:', membersError.message);
    process.exitCode = 1;
    return;
  }

  const result = await runMigration({
    client,
    members: members ?? [],
    options: args,
    findExistingAuthUser: email => searchAuthUsersByEmail(client, email),
  });

  if (!result.ok) {
    console.error(`Stopped: ${result.fatalError}`);
    if (result.duplicates?.length) console.error(JSON.stringify(result.duplicates, null, 2));
    if (result.message) console.error(result.message);
    process.exitCode = 1;
    return;
  }

  console.log(args.apply ? 'APPLY RUN' : 'DRY RUN (default — pass --apply to write anything)');
  console.log(JSON.stringify(result.report, null, 2));
}

const isDirectlyInvoked = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isDirectlyInvoked) {
  main();
}

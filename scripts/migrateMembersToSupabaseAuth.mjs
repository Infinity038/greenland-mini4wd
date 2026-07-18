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
// SAFETY MODEL (Phase B.2.1 — hardened):
//   - Default mode is dry-run: no Admin API call and no members write of any
//     kind happens unless --apply is passed.
//   - Every --apply run must be explicitly scoped: either a single, valid,
//     existing --member-id=<uuid> (a pilot), or --confirm-bulk (an
//     unscoped, whole-table run). This is enforced unconditionally — never
//     inferred from how many rows happen to be writable, and never
//     defaulted to "unscoped" just because a bad --member-id was ignored.
//   - --member-id is validated as a well-formed UUID and checked against
//     the real members dataset; a missing value, malformed UUID, or
//     nonexistent id is a fatal error with zero writes — never silently
//     treated as "no --member-id was given."
//   - Duplicate-email detection runs against the FULL members dataset
//     before --member-id scoping is ever applied, so a one-member pilot can
//     never bypass a duplicate-email conflict sitting elsewhere in the
//     table.
//   - Auth-user-lookup failures (network/pagination/malformed-response
//     errors from auth.admin.listUsers()) fail the entire run closed —
//     never classified as "no existing user", never allowed to reach
//     createUser()/inviteUserByEmail()/a members write.
//   - Path B (invitation_required) rows are never invited without both
//     --apply and the separate, explicit --send-invitations consent flag —
//     --confirm-bulk alone does not authorize sending real email.
//   - Every log line and every report entry is built through maskEmail()/
//     buildReportEntry() below — password_hash, plaintext passwords,
//     SUPABASE_SERVICE_ROLE_KEY, full email addresses, and any Auth token
//     are never read into a log or report value anywhere in this file.
//   - Unknown CLI flags are rejected outright. --help prints usage without
//     ever touching an environment variable or creating a Supabase client.
//
// See docs/MEMBER-AUTH-MIGRATION-PLAN.md for the full operational procedure
// this script is one step of, and docs/PRE-MIGRATION-BACKUP-AND-VALIDATION.md
// for the required backup/branch/pilot sequence before running this for
// real against any live project. No command in either document is
// currently approved for execution.

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

// Loose but real RFC-4122-shaped UUID check — deliberately not restricted
// to a single version/variant bit pattern, since members.id is a plain
// Postgres `uuid` column (gen_random_uuid()) and this only needs to reject
// obviously-malformed input, not enforce a specific UUID version.
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(value) {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

// The single metadata key used to prove "this Auth user was created by this
// script for this exact member row" — the only thing that ever justifies
// relinking an existing Auth user instead of treating it as an unrelated
// collision requiring manual review.
export const MIGRATION_METADATA_KEY = 'migrated_from_members_id';

// Discriminated outcomes for an existing-Auth-user-by-email lookup — see
// searchAuthUsersByEmail() and planMigration() below. A lookup can find a
// user, confirm none exists, or fail; these must never be conflated into a
// single "did we find someone" boolean, because failure and "definitely no
// existing user" require opposite safe responses (fail closed vs. proceed).
export const AUTH_LOOKUP_STATUS = {
  FOUND: 'user_found',
  NOT_FOUND: 'user_not_found',
  ERROR: 'lookup_error',
};

export function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : email;
}

// Never logs/reports a real address in full. "ab***@example.com" for a
// normal address; for a local part of 2 chars or fewer, masks the whole
// local part so nothing meaningful leaks either way.
export function maskEmail(email) {
  const normalized = normalizeEmail(email);
  if (!normalized || !normalized.includes('@')) return '***';
  const [local, domain] = normalized.split('@');
  const visible = local.length > 2 ? local.slice(0, 2) : '';
  return `${visible}***@${domain}`;
}

const KNOWN_FLAGS = new Set(['--apply', '--confirm-bulk', '--send-invitations', '--help', '-h']);

/**
 * @typedef {Object} CliArgs
 * @property {boolean} apply
 * @property {boolean} confirmBulk
 * @property {boolean} sendInvitations
 * @property {boolean} help
 * @property {string | null} memberId
 * @property {boolean} memberIdProvided
 * @property {string[]} unknownArgs
 */
/**
 * @param {string[]} argv
 * @returns {CliArgs}
 */
export function parseCliArgs(argv) {
  const args = {
    apply: false,
    confirmBulk: false,
    sendInvitations: false,
    help: false,
    memberId: null,
    memberIdProvided: false,
    unknownArgs: [],
  };
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === '--apply') args.apply = true;
    else if (token === '--confirm-bulk') args.confirmBulk = true;
    else if (token === '--send-invitations') args.sendInvitations = true;
    else if (token === '--help' || token === '-h') args.help = true;
    else if (token === '--member-id') {
      args.memberIdProvided = true;
      const next = argv[i + 1];
      // A value is only consumed if it doesn't look like another flag —
      // `--member-id --apply` must not swallow `--apply` as the id value.
      if (next !== undefined && !next.startsWith('-')) {
        args.memberId = next;
        i++;
      } else {
        args.memberId = null; // flag given, but with no usable value
      }
    } else if (token.startsWith('--member-id=')) {
      args.memberIdProvided = true;
      args.memberId = token.slice('--member-id='.length);
    } else if (!KNOWN_FLAGS.has(token)) {
      args.unknownArgs.push(token);
    }
  }
  return args;
}

export const HELP_TEXT = `migrateMembersToSupabaseAuth.mjs — one-off member-to-Supabase-Auth importer

Links existing public.members rows to real Supabase Auth identities via the
Supabase Auth Admin API (never raw SQL against auth.users/auth.identities).

USAGE
  node scripts/migrateMembersToSupabaseAuth.mjs [options]

DEFAULT BEHAVIOR
  With no flags, this is a DRY RUN: it reports what would happen and makes
  no Admin API call and no members write of any kind.

OPTIONS
  --apply                Perform real writes. Requires an explicit write
                          scope — see --member-id / --confirm-bulk below.
                          Without one of those, an --apply run is refused
                          before any write, regardless of how many rows
                          would otherwise be written.
  --member-id=<uuid>      Scope the run to exactly one members.id (a pilot).
                          Must be a well-formed UUID that exists in the
                          members table, or the run is refused.
  --confirm-bulk          Explicitly authorize an unscoped (whole-table)
                          --apply run. Required whenever --member-id is not
                          used with --apply.
  --send-invitations      Required, IN ADDITION TO --apply, before any
                          Path B (invitation_required) row is contacted.
                          THIS SENDS A REAL EMAIL to the member via
                          Supabase Auth's invitation flow. --confirm-bulk
                          does NOT imply this — it must be passed
                          explicitly. Without --apply, this flag changes
                          nothing (still a dry run).
  --help, -h              Show this help and exit. Never touches an
                          environment variable or creates a Supabase
                          client.

REQUIREMENTS
  SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY
  must be set in the environment for any run other than --help. The
  service-role key is never logged.

OUTPUT
  Every report line is built from a fixed, reviewed set of non-sensitive
  fields only. password_hash, plaintext passwords, the service-role key,
  Auth tokens, and full email addresses are never printed — email
  addresses are always masked (e.g. "ra***@example.com").
`;

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
// entire run before any write is attempted. Returns masked emails only —
// this result is safe to log/report as-is.
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
  return Array.from(duplicates.entries()).map(([email, memberIds]) => ({
    maskedEmail: maskEmail(email),
    memberIds,
  }));
}

// Builds the full migration plan for a set of members. `findExistingAuthUser`
// is an injectable async lookup, (normalizedEmail) => one of:
//   { status: 'user_found', user: { id, user_metadata } }
//   { status: 'user_not_found' }
//   { status: 'lookup_error', error: string }
// kept injectable so tests never need a real Supabase Admin API or network
// access, and so the default implementation (searchAuthUsersByEmail, below)
// can change independently of this logic. A lookup_error for ANY member
// stops planning entirely — the whole run fails closed, not just that one
// row, since a failing lookup means we can no longer trust "no collision
// exists" for anything not yet checked either.
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

    const lookup = await findExistingAuthUser(normalizeEmail(member.email));

    if (lookup.status === AUTH_LOOKUP_STATUS.ERROR) {
      // Fail the whole run closed — never classify this email as
      // "available", never proceed to createUser()/inviteUserByEmail() for
      // this or any later member in this run.
      return {
        ok: false,
        fatalError: 'auth_lookup_failed',
        duplicates: [],
        entries: [],
        failedMemberId: member.id,
        failedMaskedEmail: maskEmail(member.email),
        lookupError: lookup.error,
      };
    }

    if (lookup.status === AUTH_LOOKUP_STATUS.FOUND) {
      const linkedMemberId = lookup.user.user_metadata?.[MIGRATION_METADATA_KEY];
      if (linkedMemberId === member.id) {
        // A prior run's Admin API call succeeded but the subsequent
        // members.auth_user_id write did not — this is our own partial
        // migration, verified by metadata, not a stranger's account. Safe
        // to relink without creating anything new.
        entries.push({ member, path: 'relink_existing', reason: 'A matching Auth user already exists with verified migration metadata from a prior partial run.', existingAuthUserId: lookup.user.id });
      } else {
        entries.push({ member, path: 'collision_manual_review', reason: 'An Auth user already exists for this email with no verified migration metadata linking it to this member. Never auto-attached.' });
      }
      continue;
    }

    // AUTH_LOOKUP_STATUS.NOT_FOUND
    entries.push({ member, path: local.path, reason: local.reason });
  }

  return { ok: true, fatalError: null, duplicates: [], entries };
}

// Non-sensitive dry-run/execution report line — never includes
// password_hash, plaintext password, service-role key, full email, or any
// Auth token.
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
// flow is what lets the member set their own password. Sending this is
// gated on --send-invitations, enforced by the caller (runMigration), not
// here — this function only builds the payload.
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
// Never called at all unless the caller has already confirmed the write is
// authorized (apply + correct scope + — for invitation_required —
// --send-invitations) — this function itself has no dry-run/consent branch
// on purpose, so there is exactly one code path that ever performs a
// write, not several that could drift apart.
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

// Dry-run outcome label per path — mirrors applyEntry's real branches so
// the preview accurately reflects what --apply would do, including
// whether an invitation would actually be sent given the current
// --send-invitations setting.
function dryRunOutcome(entry, options) {
  switch (entry.path) {
    case 'existing_bcrypt':
      return 'would_create';
    case 'relink_existing':
      return 'would_relink';
    case 'invitation_required':
      return options.sendInvitations ? 'would_invite' : 'would_skip_invitation_not_authorized';
    default:
      return 'would_skip';
  }
}

// ── Orchestration ─────────────────────────────────────────────────────

// This does not claim the overall member -> Auth-user -> members-row
// operation is transactionally atomic — it spans two independent systems
// (Supabase Auth and the members table) with no shared transaction. Each
// step's real outcome is reported individually
// (created/invited/relinked/partial_migration_manual_repair/failed_*)
// instead.
export async function runMigration({ client, members, options, findExistingAuthUser }) {
  // 1. --member-id format validation — independent of any data, checked
  // first. A provided-but-invalid/missing value is a fatal error; it is
  // never silently treated as "no --member-id was given" (which would
  // otherwise make an intended pilot run into an unscoped one).
  if (options.memberIdProvided) {
    if (!options.memberId || !isValidUuid(options.memberId)) {
      return { ok: false, fatalError: 'invalid_member_id', report: [] };
    }
  }

  // 2-3. Duplicate-email detection runs against the FULL members dataset,
  // before --member-id scoping is applied — a one-member pilot must never
  // bypass a duplicate-email conflict sitting elsewhere in the table.
  const duplicates = detectDuplicateMemberEmails(members);
  if (duplicates.length > 0) {
    return { ok: false, fatalError: 'duplicate_member_emails', duplicates, report: [] };
  }

  // 4. Only now does --member-id scoping apply, including the existence
  // check against the real dataset.
  let scopeMember = null;
  if (options.memberIdProvided) {
    scopeMember = members.find(m => m.id === options.memberId) ?? null;
    if (!scopeMember) {
      return { ok: false, fatalError: 'member_id_not_found', report: [] };
    }
  }
  const scopedMembers = scopeMember ? [scopeMember] : members;

  const plan = await planMigration(scopedMembers, { findExistingAuthUser });
  if (!plan.ok) {
    return {
      ok: false,
      fatalError: plan.fatalError,
      duplicates: plan.duplicates ?? [],
      failedMemberId: plan.failedMemberId,
      failedMaskedEmail: plan.failedMaskedEmail,
      lookupError: plan.lookupError,
      report: [],
    };
  }

  if (!options.apply) {
    return {
      ok: true,
      fatalError: null,
      dryRun: true,
      report: plan.entries.map(entry => buildReportEntry(entry, { outcome: dryRunOutcome(entry, options) })),
    };
  }

  // Explicit write-scope gate — unconditional, never inferred from how
  // many rows happen to be writable. A valid single-member scope (already
  // confirmed to exist, above) is always sufficient; otherwise
  // --confirm-bulk is required, even if zero or exactly one row would
  // actually be written.
  if (!scopeMember && !options.confirmBulk) {
    return {
      ok: false,
      fatalError: 'unscoped_apply_not_confirmed',
      message: 'An --apply run must be scoped with a valid --member-id=<uuid>, or explicitly confirmed for bulk with --confirm-bulk. Refusing to guess.',
      report: [],
    };
  }

  const report = [];
  for (const entry of plan.entries) {
    if (entry.path === 'already_linked' || entry.path === 'guest_skipped' || entry.path === 'collision_manual_review') {
      report.push(buildReportEntry(entry, { outcome: 'skipped' }));
      continue;
    }
    if (entry.path === 'invitation_required' && !options.sendInvitations) {
      // --confirm-bulk (or a valid --member-id scope) authorizes a *write*
      // in general, but never implies consent to send a real email —
      // that is always a separate, explicit opt-in.
      report.push(buildReportEntry(entry, { outcome: 'invitation_not_authorized' }));
      continue;
    }
    report.push(await applyEntry(client, entry));
  }

  return { ok: true, fatalError: null, dryRun: false, report };
}

// Default (non-test) existing-Auth-user lookup — paginates
// auth.admin.listUsers() since the Admin API has no direct getUserByEmail.
// Only ever used by main() below; tests inject their own
// findExistingAuthUser instead. Every branch returns one of the three
// AUTH_LOOKUP_STATUS shapes — never a bare null, which would otherwise
// conflate "definitely no such user" with "we don't actually know."
async function searchAuthUsersByEmail(client, normalizedEmail) {
  let page = 1;
  const perPage = 200;
  for (;;) {
    let response;
    try {
      response = await client.auth.admin.listUsers({ page, perPage });
    } catch (thrown) {
      return { status: AUTH_LOOKUP_STATUS.ERROR, error: thrown instanceof Error ? thrown.message : String(thrown) };
    }
    const { data, error } = response ?? {};
    if (error) {
      return { status: AUTH_LOOKUP_STATUS.ERROR, error: error.message ?? String(error) };
    }
    if (!data || !Array.isArray(data.users)) {
      return { status: AUTH_LOOKUP_STATUS.ERROR, error: 'Malformed listUsers() response — no users array.' };
    }
    const match = data.users.find(u => normalizeEmail(u.email) === normalizedEmail);
    if (match) return { status: AUTH_LOOKUP_STATUS.FOUND, user: match };
    if (data.users.length < perPage) return { status: AUTH_LOOKUP_STATUS.NOT_FOUND };
    page += 1;
  }
}

// ── CLI entry point — never runs on import, only on direct invocation ───

// Pure dispatch over parsed argv — decides help vs. reject-unknown-args vs.
// proceed, entirely without touching process.env or creating any client.
// Kept separate from main() so both branches are directly unit-testable.
/**
 * @param {string[]} argv
 * @returns {{mode: 'help', text: string} | {mode: 'error', message: string} | {mode: 'run', args: CliArgs}}
 */
export function resolveCliInvocation(argv) {
  const args = parseCliArgs(argv);
  if (args.help) {
    return { mode: 'help', text: HELP_TEXT };
  }
  if (args.unknownArgs.length > 0) {
    return {
      mode: 'error',
      message: `Unknown argument(s): ${args.unknownArgs.join(', ')}. Run with --help for usage.`,
    };
  }
  return { mode: 'run', args };
}

async function main() {
  const invocation = resolveCliInvocation(process.argv.slice(2));

  if (invocation.mode === 'help') {
    console.log(invocation.text);
    return;
  }
  if (invocation.mode === 'error') {
    console.error(invocation.message);
    process.exitCode = 1;
    return;
  }

  const args = invocation.args;

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
    if (result.failedMaskedEmail) console.error(`Failed on member ${result.failedMemberId} (${result.failedMaskedEmail}): ${result.lookupError}`);
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

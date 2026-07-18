// Mocked-only tests for the one-off member->Supabase-Auth importer. No live
// Supabase project, network call, real service-role key, or real Admin API
// is ever touched — every Supabase-shaped dependency below is a plain
// in-memory fake.
import { describe, expect, it, vi } from 'vitest';
import {
  AUTH_LOOKUP_STATUS,
  BCRYPT_HASH_PATTERN,
  HELP_TEXT,
  MIGRATION_METADATA_KEY,
  buildCreateUserPayload,
  buildInvitePayload,
  buildReportEntry,
  classifyMemberLocally,
  detectDuplicateMemberEmails,
  isValidBcryptHash,
  isValidUuid,
  maskEmail,
  normalizeEmail,
  parseCliArgs,
  planMigration,
  resolveCliInvocation,
  runMigration,
} from './migrateMembersToSupabaseAuth.mjs';

// A bcrypt hash is always exactly 60 characters: a 7-char prefix
// ($2b$10$) + 53 characters of salt+hash. Built with .repeat() rather than
// hand-typed to guarantee the length is exactly right — a one-off manual
// count is exactly the kind of off-by-one that previously made this
// fixture invalid against the pattern it was meant to satisfy.
const BCRYPT_SUFFIX = 'A'.repeat(53);
const VALID_BCRYPT = `$2b$10$${BCRYPT_SUFFIX}`;
// A real, widely-published bcrypt example hash (bcrypt("secret"), used in
// countless public tutorials/docs — not a live credential) for one
// dedicated "this is what a genuine bcrypt hash looks like" check.
const REAL_EXAMPLE_BCRYPT_HASH = '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

const ID_A = '11111111-1111-1111-1111-111111111111';
const ID_B = '22222222-2222-2222-2222-222222222222';
const ID_C = '33333333-3333-3333-3333-333333333333';
const ID_NONEXISTENT = '99999999-9999-9999-9999-999999999999';

function member(overrides: Record<string, unknown> = {}) {
  return {
    id: ID_A,
    email: 'Racer@Example.com',
    password_hash: VALID_BCRYPT,
    member_status: 'registered',
    auth_user_id: null,
    ...overrides,
  };
}

// Fake Admin-API-shaped Supabase client. createUser/inviteUserByEmail/the
// members table update are all plain vi.fn()s the test configures per case.
function fakeClient(overrides: Record<string, unknown> = {}) {
  return {
    auth: {
      admin: {
        createUser: vi.fn(async () => ({ data: { user: { id: 'new-auth-id' } }, error: null })),
        inviteUserByEmail: vi.fn(async () => ({ data: { user: { id: 'invited-auth-id' } }, error: null })),
      },
    },
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn(async () => ({ error: null })),
      })),
    })),
    ...overrides,
  };
}

// Matches parseCliArgs()'s output shape so runMigration tests exercise the
// exact same options object the CLI would actually produce.
function baseOptions(overrides: Record<string, unknown> = {}) {
  return {
    apply: false,
    confirmBulk: false,
    sendInvitations: false,
    memberId: null,
    memberIdProvided: false,
    ...overrides,
  };
}

function notFound() {
  return { status: AUTH_LOOKUP_STATUS.NOT_FOUND };
}

describe('isValidBcryptHash / BCRYPT_HASH_PATTERN', () => {
  it('accepts a well-formed $2b$ bcrypt hash', () => {
    expect(isValidBcryptHash(VALID_BCRYPT)).toBe(true);
    expect(BCRYPT_HASH_PATTERN.test(VALID_BCRYPT)).toBe(true);
  });
  it('accepts a real, widely-published example bcrypt hash', () => {
    expect(isValidBcryptHash(REAL_EXAMPLE_BCRYPT_HASH)).toBe(true);
  });
  it('accepts $2a$ and $2y$ variants', () => {
    expect(isValidBcryptHash(`$2a$12$${BCRYPT_SUFFIX}`)).toBe(true);
    expect(isValidBcryptHash(`$2y$10$${BCRYPT_SUFFIX}`)).toBe(true);
  });
  it('rejects a plaintext password', () => {
    expect(isValidBcryptHash('hunter2')).toBe(false);
  });
  it('rejects null/undefined/empty', () => {
    expect(isValidBcryptHash(null)).toBe(false);
    expect(isValidBcryptHash(undefined)).toBe(false);
    expect(isValidBcryptHash('')).toBe(false);
  });
  it('rejects a hash from an unsupported algorithm', () => {
    expect(isValidBcryptHash('$argon2id$v=19$m=65536,t=3,p=4$abcdefgh$abcdefghijklmnop')).toBe(false);
  });
  it('rejects a truncated/malformed bcrypt-like string', () => {
    expect(isValidBcryptHash('$2b$10$tooShort')).toBe(false);
  });
});

describe('isValidUuid', () => {
  it('accepts a well-formed UUID', () => {
    expect(isValidUuid(ID_A)).toBe(true);
    expect(isValidUuid('11111111-1111-1111-1111-111111111111')).toBe(true);
  });
  it('accepts uppercase hex digits', () => {
    expect(isValidUuid('AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE')).toBe(true);
  });
  it('rejects null/undefined/empty', () => {
    expect(isValidUuid(null)).toBe(false);
    expect(isValidUuid(undefined)).toBe(false);
    expect(isValidUuid('')).toBe(false);
  });
  it('rejects a non-UUID string', () => {
    expect(isValidUuid('not-a-uuid')).toBe(false);
    expect(isValidUuid('member-1')).toBe(false);
  });
  it('rejects a UUID-shaped string with wrong segment lengths', () => {
    expect(isValidUuid('11111111-1111-1111-1111-11111111111')).toBe(false);
    expect(isValidUuid('11111111-1111-1111-1111-1111111111111')).toBe(false);
  });
});

describe('maskEmail', () => {
  it('masks the local part, keeping only the first two characters and the domain', () => {
    expect(maskEmail('racer@example.com')).toBe('ra***@example.com');
  });
  it('masks a short local part entirely', () => {
    expect(maskEmail('ab@example.com')).toBe('***@example.com');
    expect(maskEmail('a@example.com')).toBe('***@example.com');
  });
  it('normalizes case before masking', () => {
    expect(maskEmail('RACER@EXAMPLE.COM')).toBe('ra***@example.com');
  });
  it('never returns the original email unmasked', () => {
    const email = 'racer@example.com';
    expect(maskEmail(email)).not.toBe(email);
    expect(maskEmail(email)).not.toContain('racer@example.com');
  });
});

describe('parseCliArgs — default is dry-run, flags are explicit', () => {
  it('defaults to every flag off/absent with no flags', () => {
    expect(parseCliArgs([])).toEqual({
      apply: false,
      confirmBulk: false,
      sendInvitations: false,
      help: false,
      memberId: null,
      memberIdProvided: false,
      unknownArgs: [],
    });
  });
  it('recognizes --apply', () => {
    expect(parseCliArgs(['--apply']).apply).toBe(true);
  });
  it('recognizes --confirm-bulk', () => {
    expect(parseCliArgs(['--confirm-bulk']).confirmBulk).toBe(true);
  });
  it('recognizes --send-invitations', () => {
    expect(parseCliArgs(['--send-invitations']).sendInvitations).toBe(true);
  });
  it('recognizes --help and -h', () => {
    expect(parseCliArgs(['--help']).help).toBe(true);
    expect(parseCliArgs(['-h']).help).toBe(true);
  });
  it('recognizes --member-id as two tokens', () => {
    const args = parseCliArgs(['--member-id', ID_A]);
    expect(args.memberId).toBe(ID_A);
    expect(args.memberIdProvided).toBe(true);
  });
  it('recognizes --member-id=<id> as one token', () => {
    const args = parseCliArgs([`--member-id=${ID_A}`]);
    expect(args.memberId).toBe(ID_A);
    expect(args.memberIdProvided).toBe(true);
  });
  it('a trailing --member-id with no following value is provided-but-null, never silently absent', () => {
    const args = parseCliArgs(['--member-id']);
    expect(args.memberIdProvided).toBe(true);
    expect(args.memberId).toBeNull();
  });
  it('--member-id immediately followed by another flag does not swallow that flag as the value', () => {
    const args = parseCliArgs(['--member-id', '--apply']);
    expect(args.memberIdProvided).toBe(true);
    expect(args.memberId).toBeNull();
    expect(args.apply).toBe(true);
  });
  it('--member-id= with an empty value is provided-but-empty, not absent', () => {
    const args = parseCliArgs(['--member-id=']);
    expect(args.memberIdProvided).toBe(true);
    expect(args.memberId).toBe('');
  });
  it('collects unrecognized tokens into unknownArgs instead of silently ignoring them', () => {
    const args = parseCliArgs(['--bogus-flag']);
    expect(args.unknownArgs).toEqual(['--bogus-flag']);
  });
  it('known flags are never added to unknownArgs', () => {
    const args = parseCliArgs(['--apply', '--confirm-bulk', '--send-invitations', '--help', `--member-id=${ID_A}`]);
    expect(args.unknownArgs).toEqual([]);
  });
});

describe('HELP_TEXT / resolveCliInvocation', () => {
  it('HELP_TEXT documents dry-run default, all flags, the service-role requirement, and no-secrets-printed', () => {
    expect(HELP_TEXT).toMatch(/DRY RUN/);
    expect(HELP_TEXT).toMatch(/--apply/);
    expect(HELP_TEXT).toMatch(/--member-id/);
    expect(HELP_TEXT).toMatch(/--confirm-bulk/);
    expect(HELP_TEXT).toMatch(/--send-invitations/);
    expect(HELP_TEXT).toMatch(/REAL EMAIL/);
    expect(HELP_TEXT).toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
    expect(HELP_TEXT).toMatch(/never printed|never logged/i);
  });

  it('--help resolves to help mode without requiring any environment variable', () => {
    expect(resolveCliInvocation(['--help'])).toEqual({ mode: 'help', text: HELP_TEXT });
    expect(resolveCliInvocation(['-h'])).toEqual({ mode: 'help', text: HELP_TEXT });
  });

  it('an unknown flag resolves to error mode, not run mode', () => {
    const result = resolveCliInvocation(['--bogus-flag']);
    if (result.mode !== 'error') throw new Error('expected error mode');
    expect(result.message).toMatch(/Unknown argument/);
    expect(result.message).toMatch(/--bogus-flag/);
  });

  it('help takes precedence over an unknown flag present in the same invocation', () => {
    const result = resolveCliInvocation(['--bogus-flag', '--help']);
    expect(result.mode).toBe('help');
  });

  it('a valid, known invocation resolves to run mode carrying the parsed args', () => {
    const result = resolveCliInvocation(['--apply', `--member-id=${ID_A}`]);
    if (result.mode !== 'run') throw new Error('expected run mode');
    expect(result.args.apply).toBe(true);
    expect(result.args.memberId).toBe(ID_A);
  });
});

describe('classifyMemberLocally', () => {
  it('already-linked members are classified as already_linked', () => {
    expect(classifyMemberLocally(member({ auth_user_id: 'existing-uuid' })).path).toBe('already_linked');
  });
  it('guest members are classified as guest_skipped, regardless of password_hash', () => {
    expect(classifyMemberLocally(member({ member_status: 'guest' })).path).toBe('guest_skipped');
  });
  it('a valid bcrypt hash is classified as existing_bcrypt', () => {
    expect(classifyMemberLocally(member()).path).toBe('existing_bcrypt');
  });
  it('an unsupported/missing hash is classified as invitation_required, never existing_bcrypt', () => {
    expect(classifyMemberLocally(member({ password_hash: 'plaintext-not-a-hash' })).path).toBe('invitation_required');
    expect(classifyMemberLocally(member({ password_hash: null })).path).toBe('invitation_required');
  });
});

describe('detectDuplicateMemberEmails', () => {
  it('finds no duplicates among distinct emails', () => {
    expect(detectDuplicateMemberEmails([member({ id: ID_A, email: 'a@example.com' }), member({ id: ID_B, email: 'b@example.com' })])).toEqual([]);
  });
  it('detects a duplicate, case-insensitively', () => {
    const dup = detectDuplicateMemberEmails([
      member({ id: ID_A, email: 'Racer@Example.com' }),
      member({ id: ID_B, email: 'racer@example.com' }),
    ]);
    expect(dup).toHaveLength(1);
    expect(dup[0].memberIds.sort()).toEqual([ID_A, ID_B].sort());
  });
  it('reports only a masked email, never the raw email, and has no "email" key at all', () => {
    const dup = detectDuplicateMemberEmails([
      member({ id: ID_A, email: 'racer@example.com' }),
      member({ id: ID_B, email: 'racer@example.com' }),
    ]);
    expect(dup[0].maskedEmail).toBe('ra***@example.com');
    expect(dup[0]).not.toHaveProperty('email');
    expect(JSON.stringify(dup)).not.toContain('racer@example.com');
  });
});

describe('planMigration — duplicate emails stop the run before any lookup or write', () => {
  it('returns ok:false and never calls findExistingAuthUser when duplicates exist', async () => {
    const findExistingAuthUser = vi.fn(async () => notFound());
    const plan = await planMigration(
      [member({ id: ID_A, email: 'dup@example.com' }), member({ id: ID_B, email: 'dup@example.com' })],
      { findExistingAuthUser }
    );
    expect(plan.ok).toBe(false);
    expect(plan.fatalError).toBe('duplicate_member_emails');
    expect(findExistingAuthUser).not.toHaveBeenCalled();
  });
});

describe('planMigration — already-linked and guest members never trigger an Auth lookup', () => {
  it('skips findExistingAuthUser for already_linked and guest_skipped members', async () => {
    const findExistingAuthUser = vi.fn(async () => notFound());
    const plan = await planMigration(
      [
        member({ id: ID_A, email: 'a@example.com', auth_user_id: 'existing' }),
        member({ id: ID_B, email: 'b@example.com', member_status: 'guest' }),
      ],
      { findExistingAuthUser }
    );
    expect(plan.ok).toBe(true);
    expect(findExistingAuthUser).not.toHaveBeenCalled();
    expect(plan.entries.map(e => e.path)).toEqual(['already_linked', 'guest_skipped']);
  });
});

describe('planMigration — existing Auth-user collision requires manual review', () => {
  it('flags collision_manual_review when an Auth user exists with no matching migration metadata', async () => {
    const findExistingAuthUser = vi.fn(async () => ({ status: AUTH_LOOKUP_STATUS.FOUND, user: { id: 'stranger-auth-id', user_metadata: {} } }));
    const plan = await planMigration([member({ id: ID_A })], { findExistingAuthUser });
    expect(plan.entries[0].path).toBe('collision_manual_review');
  });

  it('never auto-attaches based on email match alone — mismatched metadata is still a collision', async () => {
    const findExistingAuthUser = vi.fn(async () => ({
      status: AUTH_LOOKUP_STATUS.FOUND,
      user: { id: 'stranger-auth-id', user_metadata: { [MIGRATION_METADATA_KEY]: 'some-other-member' } },
    }));
    const plan = await planMigration([member({ id: ID_A })], { findExistingAuthUser });
    expect(plan.entries[0].path).toBe('collision_manual_review');
  });

  it('safely relinks when the existing Auth user carries verified migration metadata for this exact member', async () => {
    const findExistingAuthUser = vi.fn(async () => ({
      status: AUTH_LOOKUP_STATUS.FOUND,
      user: { id: 'my-own-partial-auth-id', user_metadata: { [MIGRATION_METADATA_KEY]: ID_A } },
    }));
    const plan = await planMigration([member({ id: ID_A })], { findExistingAuthUser });
    expect(plan.entries[0].path).toBe('relink_existing');
    expect(plan.entries[0].existingAuthUserId).toBe('my-own-partial-auth-id');
  });
});

describe('planMigration — Auth lookup errors fail the whole run closed', () => {
  it('stops planning immediately on a lookup_error, never classifying the email as available', async () => {
    const findExistingAuthUser = vi.fn(async () => ({ status: AUTH_LOOKUP_STATUS.ERROR, error: 'listUsers() network failure' }));
    const plan = await planMigration([member({ id: ID_A })], { findExistingAuthUser });
    expect(plan.ok).toBe(false);
    expect(plan.fatalError).toBe('auth_lookup_failed');
    expect(plan.failedMemberId).toBe(ID_A);
    expect(plan.lookupError).toBe('listUsers() network failure');
    expect(plan.entries).toEqual([]);
  });

  it('never looks up a second member once the first lookup has failed', async () => {
    const findExistingAuthUser = vi.fn(async () => ({ status: AUTH_LOOKUP_STATUS.ERROR, error: 'boom' }));
    await planMigration(
      [member({ id: ID_A, email: 'a@example.com' }), member({ id: ID_B, email: 'b@example.com' })],
      { findExistingAuthUser }
    );
    expect(findExistingAuthUser).toHaveBeenCalledTimes(1);
  });

  it('reports only a masked email for the failed lookup, never the raw address', async () => {
    const findExistingAuthUser = vi.fn(async () => ({ status: AUTH_LOOKUP_STATUS.ERROR, error: 'boom' }));
    const plan = await planMigration([member({ id: ID_A, email: 'racer@example.com' })], { findExistingAuthUser });
    expect(plan.failedMaskedEmail).toBe('ra***@example.com');
    expect(JSON.stringify(plan)).not.toContain('racer@example.com');
  });
});

describe('buildCreateUserPayload / buildInvitePayload — no secret ever misrouted', () => {
  it('Path A sends the hash as password_hash, never as password', () => {
    const payload = buildCreateUserPayload(member());
    expect(payload.password_hash).toBe(VALID_BCRYPT);
    expect(payload).not.toHaveProperty('password');
    expect(JSON.stringify(payload)).not.toMatch(/"password":/);
  });
  it('Path A payload carries verified migration metadata', () => {
    const payload = buildCreateUserPayload(member({ id: 'member-42' }));
    expect(payload.user_metadata[MIGRATION_METADATA_KEY]).toBe('member-42');
    expect(payload.email_confirm).toBe(true);
  });
  it('Path B (invite) sends no password or hash value at all', () => {
    const payload = buildInvitePayload(member());
    expect(payload).not.toHaveProperty('password');
    expect(payload).not.toHaveProperty('password_hash');
    // requires_password_reset is a legitimate boolean flag (its *name*
    // contains "password", its value is never one) — assert no actual
    // password/hash *value* is present, rather than a blanket substring
    // match on the whole serialized payload.
    expect(payload.options.data.requires_password_reset).toBe(true);
    expect(Object.keys(payload.options.data).sort()).toEqual([MIGRATION_METADATA_KEY, 'requires_password_reset'].sort());
  });
});

describe('buildReportEntry — never leaks a secret', () => {
  it('never includes password_hash, password, or any *_key/*token field', () => {
    const entry = { member: member(), path: 'existing_bcrypt', reason: 'x' };
    const report = buildReportEntry(entry, { outcome: 'created', authUserId: 'abc' });
    const serialized = JSON.stringify(report);
    expect(serialized).not.toMatch(/password/i);
    expect(serialized).not.toMatch(/service.?role/i);
    expect(serialized).not.toMatch(/token/i);
    expect(report.maskedEmail).not.toBe(entry.member.email);
  });
});

describe('runMigration — default execution is dry-run', () => {
  it('performs no Admin API call and no members write without --apply', async () => {
    const client = fakeClient();
    const result = await runMigration({
      client,
      members: [member()],
      options: baseOptions(),
      findExistingAuthUser: vi.fn(async () => notFound()),
    });
    expect(result.ok).toBe(true);
    expect(result.dryRun).toBe(true);
    expect(client.auth.admin.createUser).not.toHaveBeenCalled();
    expect(client.auth.admin.inviteUserByEmail).not.toHaveBeenCalled();
    expect(client.from).not.toHaveBeenCalled();
  });
});

describe('runMigration — write scope is unconditional, never inferred from how many rows are writable', () => {
  it('refuses an unscoped --apply with zero writable rows (all guest/skipped)', async () => {
    const client = fakeClient();
    const result = await runMigration({
      client,
      members: [member({ id: ID_A, email: 'a@example.com', member_status: 'guest' })],
      options: baseOptions({ apply: true }),
      findExistingAuthUser: vi.fn(async () => notFound()),
    });
    expect(result.ok).toBe(false);
    expect(result.fatalError).toBe('unscoped_apply_not_confirmed');
    expect(result.report).toEqual([]);
    expect(client.auth.admin.createUser).not.toHaveBeenCalled();
  });

  it('refuses an unscoped --apply with exactly one writable row', async () => {
    const client = fakeClient();
    const result = await runMigration({
      client,
      members: [member({ id: ID_A, email: 'a@example.com' })],
      options: baseOptions({ apply: true }),
      findExistingAuthUser: vi.fn(async () => notFound()),
    });
    expect(result.ok).toBe(false);
    expect(result.fatalError).toBe('unscoped_apply_not_confirmed');
    expect(client.auth.admin.createUser).not.toHaveBeenCalled();
  });

  it('refuses an unscoped --apply with many writable rows', async () => {
    const client = fakeClient();
    const result = await runMigration({
      client,
      members: [
        member({ id: ID_A, email: 'a@example.com' }),
        member({ id: ID_B, email: 'b@example.com' }),
        member({ id: ID_C, email: 'c@example.com' }),
      ],
      options: baseOptions({ apply: true }),
      findExistingAuthUser: vi.fn(async () => notFound()),
    });
    expect(result.ok).toBe(false);
    expect(result.fatalError).toBe('unscoped_apply_not_confirmed');
    expect(client.auth.admin.createUser).not.toHaveBeenCalled();
  });

  it('proceeds when --confirm-bulk is passed alongside an unscoped --apply', async () => {
    const client = fakeClient();
    const result = await runMigration({
      client,
      members: [member({ id: ID_A, email: 'a@example.com' }), member({ id: ID_B, email: 'b@example.com' })],
      options: baseOptions({ apply: true, confirmBulk: true }),
      findExistingAuthUser: vi.fn(async () => notFound()),
    });
    expect(result.ok).toBe(true);
    expect(client.auth.admin.createUser).toHaveBeenCalledTimes(2);
  });
});

describe('runMigration — --member-id must be a valid, existing UUID; never silently degrades to unscoped', () => {
  it('a valid, existing --member-id scopes the run without needing --confirm-bulk', async () => {
    const client = fakeClient();
    const result = await runMigration({
      client,
      members: [member({ id: ID_A, email: 'a@example.com' }), member({ id: ID_B, email: 'b@example.com' })],
      options: baseOptions({ apply: true, memberId: ID_A, memberIdProvided: true }),
      findExistingAuthUser: vi.fn(async () => notFound()),
    });
    expect(result.ok).toBe(true);
    expect(result.report).toHaveLength(1);
    expect(result.report[0].memberId).toBe(ID_A);
    expect(client.auth.admin.createUser).toHaveBeenCalledTimes(1);
  });

  it('rejects a missing --member-id value (flag given with no usable value), with zero writes', async () => {
    const client = fakeClient();
    const result = await runMigration({
      client,
      members: [member({ id: ID_A })],
      options: baseOptions({ apply: true, memberId: null, memberIdProvided: true }),
      findExistingAuthUser: vi.fn(async () => notFound()),
    });
    expect(result.ok).toBe(false);
    expect(result.fatalError).toBe('invalid_member_id');
    expect(result.report).toEqual([]);
    expect(client.auth.admin.createUser).not.toHaveBeenCalled();
  });

  it('rejects an empty-string --member-id, with zero writes', async () => {
    const client = fakeClient();
    const result = await runMigration({
      client,
      members: [member({ id: ID_A })],
      options: baseOptions({ apply: true, memberId: '', memberIdProvided: true }),
      findExistingAuthUser: vi.fn(async () => notFound()),
    });
    expect(result.ok).toBe(false);
    expect(result.fatalError).toBe('invalid_member_id');
    expect(client.auth.admin.createUser).not.toHaveBeenCalled();
  });

  it('rejects a malformed (non-UUID) --member-id, with zero writes', async () => {
    const client = fakeClient();
    const result = await runMigration({
      client,
      members: [member({ id: ID_A })],
      options: baseOptions({ apply: true, memberId: 'not-a-real-uuid', memberIdProvided: true }),
      findExistingAuthUser: vi.fn(async () => notFound()),
    });
    expect(result.ok).toBe(false);
    expect(result.fatalError).toBe('invalid_member_id');
    expect(client.auth.admin.createUser).not.toHaveBeenCalled();
  });

  it('rejects a well-formed but nonexistent --member-id, with zero writes', async () => {
    const client = fakeClient();
    const result = await runMigration({
      client,
      members: [member({ id: ID_A })],
      options: baseOptions({ apply: true, memberId: ID_NONEXISTENT, memberIdProvided: true }),
      findExistingAuthUser: vi.fn(async () => notFound()),
    });
    expect(result.ok).toBe(false);
    expect(result.fatalError).toBe('member_id_not_found');
    expect(client.auth.admin.createUser).not.toHaveBeenCalled();
  });

  it('never treats an invalid --member-id as equivalent to no --member-id at all (does not fall through to requiring --confirm-bulk instead)', async () => {
    const client = fakeClient();
    const result = await runMigration({
      client,
      members: [member({ id: ID_A })],
      options: baseOptions({ apply: true, confirmBulk: true, memberId: 'garbage', memberIdProvided: true }),
      findExistingAuthUser: vi.fn(async () => notFound()),
    });
    // Even with --confirm-bulk also present, a bad --member-id must still
    // be a fatal error — it must never be silently discarded in favor of
    // treating this as an unscoped, --confirm-bulk-authorized bulk run.
    expect(result.ok).toBe(false);
    expect(result.fatalError).toBe('invalid_member_id');
    expect(client.auth.admin.createUser).not.toHaveBeenCalled();
  });
});

describe('runMigration — duplicate-email detection runs on the full dataset before --member-id scoping', () => {
  it('a scoped pilot is blocked by a duplicate elsewhere in the table, even though the scoped member itself is not part of the duplicate', async () => {
    const client = fakeClient();
    const findExistingAuthUser = vi.fn(async () => notFound());
    const result = await runMigration({
      client,
      members: [
        member({ id: ID_A, email: 'pilot@example.com' }),
        member({ id: ID_B, email: 'dup@example.com' }),
        member({ id: ID_C, email: 'dup@example.com' }),
      ],
      options: baseOptions({ apply: true, memberId: ID_A, memberIdProvided: true }),
      findExistingAuthUser,
    });
    expect(result.ok).toBe(false);
    expect(result.fatalError).toBe('duplicate_member_emails');
    expect(result.report).toEqual([]);
    expect(client.auth.admin.createUser).not.toHaveBeenCalled();
    expect(findExistingAuthUser).not.toHaveBeenCalled();
  });

  it('a dry run scoped to one member also reports the full-dataset duplicate rather than silently succeeding', async () => {
    const result = await runMigration({
      client: fakeClient(),
      members: [
        member({ id: ID_A, email: 'pilot@example.com' }),
        member({ id: ID_B, email: 'dup@example.com' }),
        member({ id: ID_C, email: 'dup@example.com' }),
      ],
      options: baseOptions({ memberId: ID_A, memberIdProvided: true }),
      findExistingAuthUser: vi.fn(async () => notFound()),
    });
    expect(result.ok).toBe(false);
    expect(result.fatalError).toBe('duplicate_member_emails');
  });
});

describe('runMigration — Auth lookup failures fail the entire run closed', () => {
  it('stops the run and never calls createUser, inviteUserByEmail, or a members write', async () => {
    const client = fakeClient();
    const findExistingAuthUser = vi.fn(async () => ({ status: AUTH_LOOKUP_STATUS.ERROR, error: 'listUsers() timed out' }));
    const result = await runMigration({
      client,
      members: [member({ id: ID_A })],
      options: baseOptions({ apply: true, memberId: ID_A, memberIdProvided: true }),
      findExistingAuthUser,
    });
    expect(result.ok).toBe(false);
    expect(result.fatalError).toBe('auth_lookup_failed');
    expect(result.lookupError).toBe('listUsers() timed out');
    expect(result.report).toEqual([]);
    expect(client.auth.admin.createUser).not.toHaveBeenCalled();
    expect(client.auth.admin.inviteUserByEmail).not.toHaveBeenCalled();
    expect(client.from).not.toHaveBeenCalled();
  });

  it('also stops a dry run — a lookup failure is never treated as safe to merely preview', async () => {
    const result = await runMigration({
      client: fakeClient(),
      members: [member({ id: ID_A })],
      options: baseOptions({ memberId: ID_A, memberIdProvided: true }),
      findExistingAuthUser: vi.fn(async () => ({ status: AUTH_LOOKUP_STATUS.ERROR, error: 'boom' })),
    });
    expect(result.ok).toBe(false);
    expect(result.fatalError).toBe('auth_lookup_failed');
  });
});

describe('runMigration — invitations require explicit --send-invitations consent, separate from write scope', () => {
  it('an invitation_required row is not contacted under --apply alone (no --send-invitations)', async () => {
    const client = fakeClient();
    const result = await runMigration({
      client,
      members: [member({ id: ID_A, password_hash: null })],
      options: baseOptions({ apply: true, memberId: ID_A, memberIdProvided: true }),
      findExistingAuthUser: vi.fn(async () => notFound()),
    });
    expect(result.ok).toBe(true);
    expect(client.auth.admin.inviteUserByEmail).not.toHaveBeenCalled();
    expect(client.from).not.toHaveBeenCalled();
    expect(result.report[0].outcome).toBe('invitation_not_authorized');
  });

  it('--confirm-bulk alone does not authorize sending invitations', async () => {
    const client = fakeClient();
    const result = await runMigration({
      client,
      members: [
        member({ id: ID_A, email: 'a@example.com' }), // existing_bcrypt
        member({ id: ID_B, email: 'b@example.com', password_hash: null }), // invitation_required
      ],
      options: baseOptions({ apply: true, confirmBulk: true }),
      findExistingAuthUser: vi.fn(async () => notFound()),
    });
    expect(result.ok).toBe(true);
    expect(client.auth.admin.createUser).toHaveBeenCalledTimes(1);
    expect(client.auth.admin.inviteUserByEmail).not.toHaveBeenCalled();
    const invitationEntry = result.report.find(r => r.memberId === ID_B);
    expect(invitationEntry?.outcome).toBe('invitation_not_authorized');
  });

  it('sends the invitation only when both --apply and --send-invitations are present', async () => {
    const client = fakeClient();
    const result = await runMigration({
      client,
      members: [member({ id: ID_A, password_hash: null })],
      options: baseOptions({ apply: true, sendInvitations: true, memberId: ID_A, memberIdProvided: true }),
      findExistingAuthUser: vi.fn(async () => notFound()),
    });
    expect(result.ok).toBe(true);
    expect(client.auth.admin.inviteUserByEmail).toHaveBeenCalledTimes(1);
    expect(result.report[0].outcome).toBe('invited');
  });

  it('--send-invitations without --apply changes nothing — still a dry run with zero client calls', async () => {
    const client = fakeClient();
    const result = await runMigration({
      client,
      members: [member({ id: ID_A, password_hash: null })],
      options: baseOptions({ sendInvitations: true, memberId: ID_A, memberIdProvided: true }),
      findExistingAuthUser: vi.fn(async () => notFound()),
    });
    expect(result.ok).toBe(true);
    expect(result.dryRun).toBe(true);
    expect(result.report[0].outcome).toBe('would_invite');
    expect(client.auth.admin.inviteUserByEmail).not.toHaveBeenCalled();
    expect(client.auth.admin.createUser).not.toHaveBeenCalled();
  });

  it('a dry run without --send-invitations previews the invitation as not-yet-authorized', async () => {
    const result = await runMigration({
      client: fakeClient(),
      members: [member({ id: ID_A, password_hash: null })],
      options: baseOptions({ memberId: ID_A, memberIdProvided: true }),
      findExistingAuthUser: vi.fn(async () => notFound()),
    });
    expect(result.report[0].outcome).toBe('would_skip_invitation_not_authorized');
  });

  it('Path A (bcrypt) proceeds under normal write-scope rules without needing --send-invitations', async () => {
    const client = fakeClient();
    const result = await runMigration({
      client,
      members: [member({ id: ID_A })],
      options: baseOptions({ apply: true, memberId: ID_A, memberIdProvided: true }),
      findExistingAuthUser: vi.fn(async () => notFound()),
    });
    expect(result.ok).toBe(true);
    expect(result.report[0].outcome).toBe('created');
    expect(client.auth.admin.createUser).toHaveBeenCalledTimes(1);
  });
});

describe('runMigration — Path A (existing_bcrypt) uses password_hash, links the returned Auth id', () => {
  it('calls createUser with password_hash and links members.auth_user_id to the returned id', async () => {
    const eqMock = vi.fn(async () => ({ error: null }));
    const updateMock = vi.fn(() => ({ eq: eqMock }));
    const client = fakeClient({ from: vi.fn(() => ({ update: updateMock })) });

    const result = await runMigration({
      client,
      members: [member({ id: ID_A })],
      options: baseOptions({ apply: true, memberId: ID_A, memberIdProvided: true }),
      findExistingAuthUser: vi.fn(async () => notFound()),
    });

    expect(client.auth.admin.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ password_hash: VALID_BCRYPT })
    );
    expect(updateMock).toHaveBeenCalledWith({ auth_user_id: 'new-auth-id' });
    expect(eqMock).toHaveBeenCalledWith('id', ID_A);
    expect(result.report[0].outcome).toBe('created');
    expect(result.report[0].authUserId).toBe('new-auth-id');
  });
});

describe('runMigration — Path B (invitation_required) uses the invitation API, never direct SQL', () => {
  it('calls inviteUserByEmail, not createUser, for a member with no usable hash', async () => {
    const client = fakeClient();
    const result = await runMigration({
      client,
      members: [member({ id: ID_A, password_hash: null })],
      options: baseOptions({ apply: true, sendInvitations: true, memberId: ID_A, memberIdProvided: true }),
      findExistingAuthUser: vi.fn(async () => notFound()),
    });
    expect(client.auth.admin.inviteUserByEmail).toHaveBeenCalledTimes(1);
    expect(client.auth.admin.createUser).not.toHaveBeenCalled();
    expect(result.report[0].outcome).toBe('invited');
    expect(result.report[0].authUserId).toBe('invited-auth-id');
  });
});

describe('runMigration — guest members are skipped, never contacted', () => {
  it('never calls the Admin API for a guest member', async () => {
    const client = fakeClient();
    const result = await runMigration({
      client,
      members: [member({ id: ID_A, member_status: 'guest' })],
      options: baseOptions({ apply: true, memberId: ID_A, memberIdProvided: true }),
      findExistingAuthUser: vi.fn(async () => notFound()),
    });
    expect(client.auth.admin.createUser).not.toHaveBeenCalled();
    expect(client.auth.admin.inviteUserByEmail).not.toHaveBeenCalled();
    expect(result.report[0].outcome).toBe('skipped');
  });
});

describe('runMigration — already-linked members are skipped on rerun, never duplicated', () => {
  it('does not call the Admin API for an already-linked member', async () => {
    const client = fakeClient();
    const result = await runMigration({
      client,
      members: [member({ id: ID_A, auth_user_id: 'already-there' })],
      options: baseOptions({ apply: true, memberId: ID_A, memberIdProvided: true }),
      findExistingAuthUser: vi.fn(async () => notFound()),
    });
    expect(client.auth.admin.createUser).not.toHaveBeenCalled();
    expect(result.report[0].outcome).toBe('skipped');
  });
});

describe('runMigration — collisions are never applied automatically', () => {
  it('reports collision_manual_review as skipped, with zero Admin API calls', async () => {
    const client = fakeClient();
    const result = await runMigration({
      client,
      members: [member({ id: ID_A })],
      options: baseOptions({ apply: true, memberId: ID_A, memberIdProvided: true }),
      findExistingAuthUser: vi.fn(async () => ({ status: AUTH_LOOKUP_STATUS.FOUND, user: { id: 'stranger', user_metadata: {} } })),
    });
    expect(client.auth.admin.createUser).not.toHaveBeenCalled();
    expect(result.report[0].path).toBe('collision_manual_review');
    expect(result.report[0].outcome).toBe('skipped');
  });
});

describe('runMigration — failed Auth creation never writes members', () => {
  it('does not call from(members).update when createUser errors', async () => {
    const fromMock = vi.fn(() => ({ update: vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) })) }));
    const client = fakeClient({
      auth: { admin: { createUser: vi.fn(async () => ({ data: null, error: { message: 'Admin API failure' } })), inviteUserByEmail: vi.fn() } },
      from: fromMock,
    });
    const result = await runMigration({
      client,
      members: [member({ id: ID_A })],
      options: baseOptions({ apply: true, memberId: ID_A, memberIdProvided: true }),
      findExistingAuthUser: vi.fn(async () => notFound()),
    });
    expect(fromMock).not.toHaveBeenCalled();
    expect(result.report[0].outcome).toBe('failed_creation');
    expect(result.report[0].authUserId).toBeUndefined();
  });
});

describe('runMigration — a partial migration (Auth created, member link failed) is reported, not silently retried', () => {
  it('reports partial_migration_manual_repair and still returns the Auth id for manual repair', async () => {
    const eqMock = vi.fn(async () => ({ error: { message: 'members update failed' } }));
    const client = fakeClient({ from: vi.fn(() => ({ update: vi.fn(() => ({ eq: eqMock })) })) });
    const result = await runMigration({
      client,
      members: [member({ id: ID_A })],
      options: baseOptions({ apply: true, memberId: ID_A, memberIdProvided: true }),
      findExistingAuthUser: vi.fn(async () => notFound()),
    });
    expect(result.report[0].outcome).toBe('partial_migration_manual_repair');
    expect(result.report[0].authUserId).toBe('new-auth-id');
  });

  it('on the next run, the same member (now verified-linked in Auth metadata) is safely relinked, not recreated', async () => {
    const client = fakeClient();
    const result = await runMigration({
      client,
      members: [member({ id: ID_A })], // members.auth_user_id still null after the partial failure
      options: baseOptions({ apply: true, memberId: ID_A, memberIdProvided: true }),
      findExistingAuthUser: vi.fn(async () => ({ status: AUTH_LOOKUP_STATUS.FOUND, user: { id: 'new-auth-id', user_metadata: { [MIGRATION_METADATA_KEY]: ID_A } } })),
    });
    expect(client.auth.admin.createUser).not.toHaveBeenCalled();
    expect(result.report[0].outcome).toBe('relinked');
    expect(result.report[0].authUserId).toBe('new-auth-id');
  });
});

describe('runMigration — output never retains a full email address anywhere', () => {
  it('a successful report never contains the raw email, only maskedEmail', async () => {
    const result = await runMigration({
      client: fakeClient(),
      members: [member({ id: ID_A, email: 'racer@example.com' })],
      options: baseOptions({ apply: true, memberId: ID_A, memberIdProvided: true }),
      findExistingAuthUser: vi.fn(async () => notFound()),
    });
    expect(JSON.stringify(result)).not.toContain('racer@example.com');
    expect(result.report[0].maskedEmail).toBe('ra***@example.com');
  });

  it('a duplicate-email fatal report never contains a raw email', async () => {
    const result = await runMigration({
      client: fakeClient(),
      members: [
        member({ id: ID_A, email: 'racer@example.com' }),
        member({ id: ID_B, email: 'racer@example.com' }),
      ],
      options: baseOptions(),
      findExistingAuthUser: vi.fn(async () => notFound()),
    });
    expect(JSON.stringify(result)).not.toContain('racer@example.com');
  });

  it('a lookup-error fatal report never contains a raw email', async () => {
    const result = await runMigration({
      client: fakeClient(),
      members: [member({ id: ID_A, email: 'racer@example.com' })],
      options: baseOptions({ memberId: ID_A, memberIdProvided: true }),
      findExistingAuthUser: vi.fn(async () => ({ status: AUTH_LOOKUP_STATUS.ERROR, error: 'boom' })),
    });
    expect(JSON.stringify(result)).not.toContain('racer@example.com');
  });
});

describe('normalizeEmail', () => {
  it('lowercases and trims', () => {
    expect(normalizeEmail('  Racer@Example.COM  ')).toBe('racer@example.com');
  });
});

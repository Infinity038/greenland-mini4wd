// Mocked-only tests for the one-off member->Supabase-Auth importer. No live
// Supabase project, network call, real service-role key, or real Admin API
// is ever touched — every Supabase-shaped dependency below is a plain
// in-memory fake.
import { describe, expect, it, vi } from 'vitest';
import {
  BCRYPT_HASH_PATTERN,
  MIGRATION_METADATA_KEY,
  buildCreateUserPayload,
  buildInvitePayload,
  buildReportEntry,
  classifyMemberLocally,
  detectDuplicateMemberEmails,
  isValidBcryptHash,
  maskEmail,
  normalizeEmail,
  parseCliArgs,
  planMigration,
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

function member(overrides: Record<string, unknown> = {}) {
  return {
    id: 'member-1',
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
  it('defaults to apply:false, confirmBulk:false, memberId:null with no flags', () => {
    expect(parseCliArgs([])).toEqual({ apply: false, confirmBulk: false, memberId: null });
  });
  it('recognizes --apply', () => {
    expect(parseCliArgs(['--apply']).apply).toBe(true);
  });
  it('recognizes --confirm-bulk', () => {
    expect(parseCliArgs(['--confirm-bulk']).confirmBulk).toBe(true);
  });
  it('recognizes --member-id as two tokens', () => {
    expect(parseCliArgs(['--member-id', 'abc-123']).memberId).toBe('abc-123');
  });
  it('recognizes --member-id=<id> as one token', () => {
    expect(parseCliArgs(['--member-id=abc-123']).memberId).toBe('abc-123');
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
    expect(detectDuplicateMemberEmails([member({ id: 'a', email: 'a@example.com' }), member({ id: 'b', email: 'b@example.com' })])).toEqual([]);
  });
  it('detects a duplicate, case-insensitively', () => {
    const dup = detectDuplicateMemberEmails([
      member({ id: 'a', email: 'Racer@Example.com' }),
      member({ id: 'b', email: 'racer@example.com' }),
    ]);
    expect(dup).toHaveLength(1);
    expect(dup[0].memberIds.sort()).toEqual(['a', 'b']);
  });
});

describe('planMigration — duplicate emails stop the run before any lookup or write', () => {
  it('returns ok:false and never calls findExistingAuthUser when duplicates exist', async () => {
    const findExistingAuthUser = vi.fn(async () => null);
    const plan = await planMigration(
      [member({ id: 'a', email: 'dup@example.com' }), member({ id: 'b', email: 'dup@example.com' })],
      { findExistingAuthUser }
    );
    expect(plan.ok).toBe(false);
    expect(plan.fatalError).toBe('duplicate_member_emails');
    expect(findExistingAuthUser).not.toHaveBeenCalled();
  });
});

describe('planMigration — already-linked and guest members never trigger an Auth lookup', () => {
  it('skips findExistingAuthUser for already_linked and guest_skipped members', async () => {
    const findExistingAuthUser = vi.fn(async () => null);
    const plan = await planMigration(
      [
        member({ id: 'a', email: 'a@example.com', auth_user_id: 'existing' }),
        member({ id: 'b', email: 'b@example.com', member_status: 'guest' }),
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
    const findExistingAuthUser = vi.fn(async () => ({ id: 'stranger-auth-id', user_metadata: {} }));
    const plan = await planMigration([member({ id: 'a' })], { findExistingAuthUser });
    expect(plan.entries[0].path).toBe('collision_manual_review');
  });

  it('never auto-attaches based on email match alone — mismatched metadata is still a collision', async () => {
    const findExistingAuthUser = vi.fn(async () => ({ id: 'stranger-auth-id', user_metadata: { [MIGRATION_METADATA_KEY]: 'some-other-member' } }));
    const plan = await planMigration([member({ id: 'a' })], { findExistingAuthUser });
    expect(plan.entries[0].path).toBe('collision_manual_review');
  });

  it('safely relinks when the existing Auth user carries verified migration metadata for this exact member', async () => {
    const findExistingAuthUser = vi.fn(async () => ({ id: 'my-own-partial-auth-id', user_metadata: { [MIGRATION_METADATA_KEY]: 'a' } }));
    const plan = await planMigration([member({ id: 'a' })], { findExistingAuthUser });
    expect(plan.entries[0].path).toBe('relink_existing');
    expect(plan.entries[0].existingAuthUserId).toBe('my-own-partial-auth-id');
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
      options: { apply: false, confirmBulk: false, memberId: null },
      findExistingAuthUser: vi.fn(async () => null),
    });
    expect(result.ok).toBe(true);
    expect(result.dryRun).toBe(true);
    expect(client.auth.admin.createUser).not.toHaveBeenCalled();
    expect(client.auth.admin.inviteUserByEmail).not.toHaveBeenCalled();
    expect(client.from).not.toHaveBeenCalled();
  });
});

describe('runMigration — bulk writes require explicit confirmation', () => {
  it('refuses a multi-member --apply run without --confirm-bulk, with zero writes', async () => {
    const client = fakeClient();
    const result = await runMigration({
      client,
      members: [member({ id: 'a', email: 'a@example.com' }), member({ id: 'b', email: 'b@example.com' })],
      options: { apply: true, confirmBulk: false, memberId: null },
      findExistingAuthUser: vi.fn(async () => null),
    });
    expect(result.ok).toBe(false);
    expect(result.fatalError).toBe('bulk_apply_not_confirmed');
    expect(client.auth.admin.createUser).not.toHaveBeenCalled();
  });

  it('proceeds when --confirm-bulk is passed alongside --apply', async () => {
    const client = fakeClient();
    const result = await runMigration({
      client,
      members: [member({ id: 'a', email: 'a@example.com' }), member({ id: 'b', email: 'b@example.com' })],
      options: { apply: true, confirmBulk: true, memberId: null },
      findExistingAuthUser: vi.fn(async () => null),
    });
    expect(result.ok).toBe(true);
    expect(client.auth.admin.createUser).toHaveBeenCalledTimes(2);
  });
});

describe('runMigration — --member-id limits the run to one member', () => {
  it('only processes the matching member, ignoring the rest', async () => {
    const client = fakeClient();
    const result = await runMigration({
      client,
      members: [member({ id: 'a', email: 'a@example.com' }), member({ id: 'b', email: 'b@example.com' })],
      options: { apply: true, confirmBulk: false, memberId: 'a' },
      findExistingAuthUser: vi.fn(async () => null),
    });
    expect(result.ok).toBe(true);
    expect(result.report).toHaveLength(1);
    expect(result.report[0].memberId).toBe('a');
    expect(client.auth.admin.createUser).toHaveBeenCalledTimes(1);
  });

  it('a single-member run via --member-id does not require --confirm-bulk', async () => {
    const client = fakeClient();
    const result = await runMigration({
      client,
      members: [member({ id: 'a' })],
      options: { apply: true, confirmBulk: false, memberId: 'a' },
      findExistingAuthUser: vi.fn(async () => null),
    });
    expect(result.ok).toBe(true);
    expect(result.fatalError).toBeNull();
  });
});

describe('runMigration — Path A (existing_bcrypt) uses password_hash, links the returned Auth id', () => {
  it('calls createUser with password_hash and links members.auth_user_id to the returned id', async () => {
    const eqMock = vi.fn(async () => ({ error: null }));
    const updateMock = vi.fn(() => ({ eq: eqMock }));
    const client = fakeClient({ from: vi.fn(() => ({ update: updateMock })) });

    const result = await runMigration({
      client,
      members: [member({ id: 'member-9' })],
      options: { apply: true, confirmBulk: false, memberId: 'member-9' },
      findExistingAuthUser: vi.fn(async () => null),
    });

    expect(client.auth.admin.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ password_hash: VALID_BCRYPT })
    );
    expect(updateMock).toHaveBeenCalledWith({ auth_user_id: 'new-auth-id' });
    expect(eqMock).toHaveBeenCalledWith('id', 'member-9');
    expect(result.report[0].outcome).toBe('created');
    expect(result.report[0].authUserId).toBe('new-auth-id');
  });
});

describe('runMigration — Path B (invitation_required) uses the invitation API, never direct SQL', () => {
  it('calls inviteUserByEmail, not createUser, for a member with no usable hash', async () => {
    const client = fakeClient();
    const result = await runMigration({
      client,
      members: [member({ id: 'member-7', password_hash: null })],
      options: { apply: true, confirmBulk: false, memberId: 'member-7' },
      findExistingAuthUser: vi.fn(async () => null),
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
      members: [member({ id: 'guest-1', member_status: 'guest' })],
      options: { apply: true, confirmBulk: false, memberId: 'guest-1' },
      findExistingAuthUser: vi.fn(async () => null),
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
      members: [member({ id: 'linked-1', auth_user_id: 'already-there' })],
      options: { apply: true, confirmBulk: false, memberId: 'linked-1' },
      findExistingAuthUser: vi.fn(async () => null),
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
      members: [member({ id: 'coll-1' })],
      options: { apply: true, confirmBulk: false, memberId: 'coll-1' },
      findExistingAuthUser: vi.fn(async () => ({ id: 'stranger', user_metadata: {} })),
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
      members: [member({ id: 'fail-1' })],
      options: { apply: true, confirmBulk: false, memberId: 'fail-1' },
      findExistingAuthUser: vi.fn(async () => null),
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
      members: [member({ id: 'partial-1' })],
      options: { apply: true, confirmBulk: false, memberId: 'partial-1' },
      findExistingAuthUser: vi.fn(async () => null),
    });
    expect(result.report[0].outcome).toBe('partial_migration_manual_repair');
    expect(result.report[0].authUserId).toBe('new-auth-id');
  });

  it('on the next run, the same member (now verified-linked in Auth metadata) is safely relinked, not recreated', async () => {
    const client = fakeClient();
    const result = await runMigration({
      client,
      members: [member({ id: 'partial-1' })], // members.auth_user_id still null after the partial failure
      options: { apply: true, confirmBulk: false, memberId: 'partial-1' },
      findExistingAuthUser: vi.fn(async () => ({ id: 'new-auth-id', user_metadata: { [MIGRATION_METADATA_KEY]: 'partial-1' } })),
    });
    expect(client.auth.admin.createUser).not.toHaveBeenCalled();
    expect(result.report[0].outcome).toBe('relinked');
    expect(result.report[0].authUserId).toBe('new-auth-id');
  });
});

describe('normalizeEmail', () => {
  it('lowercases and trims', () => {
    expect(normalizeEmail('  Racer@Example.COM  ')).toBe('racer@example.com');
  });
});

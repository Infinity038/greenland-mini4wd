import { afterEach, describe, expect, it, vi } from 'vitest';

const ENV_KEY = 'NEXT_PUBLIC_OPEN_TOURNAMENT_ENABLED';
const originalValue = process.env[ENV_KEY];

afterEach(() => {
  if (originalValue === undefined) delete process.env[ENV_KEY];
  else process.env[ENV_KEY] = originalValue;
  vi.resetModules();
});

async function loadFlags() {
  vi.resetModules();
  return import('./featureFlags');
}

describe('FEATURE_FLAGS.openTournamentEnabled', () => {
  it('defaults to false when the env var is unset', async () => {
    delete process.env[ENV_KEY];
    const { FEATURE_FLAGS } = await loadFlags();
    expect(FEATURE_FLAGS.openTournamentEnabled).toBe(false);
  });

  it('is false for any value other than the literal string "true"', async () => {
    process.env[ENV_KEY] = 'yes';
    const { FEATURE_FLAGS } = await loadFlags();
    expect(FEATURE_FLAGS.openTournamentEnabled).toBe(false);
  });

  it('is true only when set to the literal string "true"', async () => {
    process.env[ENV_KEY] = 'true';
    const { FEATURE_FLAGS } = await loadFlags();
    expect(FEATURE_FLAGS.openTournamentEnabled).toBe(true);
  });
});

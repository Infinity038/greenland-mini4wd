import { describe, it, expect } from 'vitest';
import { createDuplicateScanGuard } from './duplicateScanGuard';

describe('createDuplicateScanGuard', () => {
  it('accepts the first scan of a code', () => {
    const guard = createDuplicateScanGuard(1000);
    expect(guard.shouldAccept('CODE-1', 0)).toBe(true);
  });

  it('rejects an immediate duplicate of the same code within the window', () => {
    const guard = createDuplicateScanGuard(1000);
    guard.shouldAccept('CODE-1', 0);
    expect(guard.shouldAccept('CODE-1', 200)).toBe(false);
  });

  it('accepts the same code again once the debounce window has elapsed (intentional re-scan)', () => {
    const guard = createDuplicateScanGuard(1000);
    guard.shouldAccept('CODE-1', 0);
    expect(guard.shouldAccept('CODE-1', 1500)).toBe(true);
  });

  it('does not debounce a different code scanned immediately after', () => {
    const guard = createDuplicateScanGuard(1000);
    guard.shouldAccept('CODE-1', 0);
    expect(guard.shouldAccept('CODE-2', 10)).toBe(true);
  });

  it('reset() clears the debounce state', () => {
    const guard = createDuplicateScanGuard(1000);
    guard.shouldAccept('CODE-1', 0);
    guard.reset();
    expect(guard.shouldAccept('CODE-1', 10)).toBe(true);
  });
});

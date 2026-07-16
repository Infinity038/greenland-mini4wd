// Debounces accidental repeat scans (a camera decoding the same frame twice,
// or a hardware scanner double-firing) without blocking a deliberate re-scan
// of the same code after the window elapses — that second scan should still
// increase quantity as normal.

export interface DuplicateScanGuard {
  shouldAccept(code: string, now?: number): boolean;
  reset(): void;
}

export function createDuplicateScanGuard(windowMs = 1500): DuplicateScanGuard {
  let lastCode: string | null = null;
  let lastAt = 0;
  return {
    shouldAccept(code: string, now: number = Date.now()): boolean {
      if (code === lastCode && now - lastAt < windowMs) return false;
      lastCode = code;
      lastAt = now;
      return true;
    },
    reset(): void {
      lastCode = null;
      lastAt = 0;
    },
  };
}

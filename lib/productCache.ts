// Durable client-side cache for the public product catalog. Lets pages render the
// last successfully loaded catalog immediately and survive a failed background
// refresh instead of rendering an empty shop (see docs/CLAUDE-BMAX-REFINEMENT-BRIEF.md,
// "Products disappear on database errors").
const SCHEMA_VERSION = 1;
const CACHE_PREFIX = 'gm4wd_catalog_cache_v';

interface CacheEnvelope<T> {
  schemaVersion: number;
  savedAt: number;
  data: T[];
}

function cacheKey(name: string): string {
  return `${CACHE_PREFIX}${SCHEMA_VERSION}_${name}`;
}

export function readCachedProducts<T>(name: string): { data: T[]; savedAt: number } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(cacheKey(name));
    if (!raw) return null;
    const parsed: CacheEnvelope<T> = JSON.parse(raw);
    if (parsed.schemaVersion !== SCHEMA_VERSION || !Array.isArray(parsed.data)) return null;
    return { data: parsed.data, savedAt: parsed.savedAt };
  } catch {
    return null;
  }
}

export function writeCachedProducts<T>(name: string, data: T[]): void {
  if (typeof window === 'undefined') return;
  try {
    const envelope: CacheEnvelope<T> = { schemaVersion: SCHEMA_VERSION, savedAt: Date.now(), data };
    window.localStorage.setItem(cacheKey(name), JSON.stringify(envelope));
  } catch {
    // localStorage unavailable or full — non-fatal, just means no offline fallback this time.
  }
}

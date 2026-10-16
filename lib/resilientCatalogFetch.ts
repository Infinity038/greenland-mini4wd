import { readCachedProducts, writeCachedProducts } from './productCache';

export interface ResilientFetchResult<T> {
  data: T[];
  error: string | null;
}

export interface SupabaseLikeResult<T> {
  data: T[] | null;
  error: { message: string } | null;
}

const REFRESH_FAILED_MESSAGE = 'The catalog could not refresh. Showing the latest saved version.';

// Cache-first, error-resilient product fetch: on a real Supabase failure, the
// last successfully cached catalog is kept (with a banner message the caller can
// surface) instead of silently rendering an empty shop. Calling this again
// (e.g. from a "Retry" button) re-runs the same cache-then-network flow.
// Cached data is emitted immediately while the network refresh runs, and a bounded
// refresh prevents indefinite loading when the catalogue API stalls.
// See docs/CLAUDE-BMAX-REFINEMENT-BRIEF.md, "Products disappear on database errors".
export async function resilientCatalogFetch<T>(
  cacheKey: string,
  run: () => PromiseLike<SupabaseLikeResult<T>>,
  onCached?: (data: T[]) => void,
  timeoutMs = 6500
): Promise<ResilientFetchResult<T>> {
  const cached = readCachedProducts<T>(cacheKey);
  if (cached) onCached?.(cached.data);
  try {
    const { data, error } = await new Promise<SupabaseLikeResult<T>>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('catalog refresh timed out')), timeoutMs);
      Promise.resolve().then(run).then(
        result => { clearTimeout(timer); resolve(result); },
        reason => { clearTimeout(timer); reject(reason); }
      );
    });
    if (error) {
      console.error(`[catalog:${cacheKey}] refresh failed:`, error.message);
      return { data: cached?.data ?? [], error: REFRESH_FAILED_MESSAGE };
    }
    writeCachedProducts(cacheKey, data ?? []);
    return { data: data ?? [], error: null };
  } catch (err) {
    console.error(`[catalog:${cacheKey}] unexpected error:`, err instanceof Error ? err.message : err);
    return { data: cached?.data ?? [], error: REFRESH_FAILED_MESSAGE };
  }
}

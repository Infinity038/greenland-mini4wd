import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resilientCatalogFetch } from './resilientCatalogFetch';
import { readCachedProducts } from './productCache';

interface Product {
  id: string;
  name: string;
}

const CACHE_KEY = 'shop_products';

beforeEach(() => {
  window.localStorage.clear();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('resilientCatalogFetch', () => {
  it('returns fresh data and caches it on a successful query', async () => {
    const products: Product[] = [{ id: '1', name: 'Ray Spear' }];
    const result = await resilientCatalogFetch<Product>(CACHE_KEY, async () => ({ data: products, error: null }));
    expect(result).toEqual({ data: products, error: null });
    expect(readCachedProducts<Product>(CACHE_KEY)?.data).toEqual(products);
  });

  it('keeps the previously cached catalog and surfaces a banner message when the query errors', async () => {
    const cached: Product[] = [{ id: '1', name: 'Ray Spear' }];
    await resilientCatalogFetch<Product>(CACHE_KEY, async () => ({ data: cached, error: null }));

    const result = await resilientCatalogFetch<Product>(CACHE_KEY, async () => ({
      data: null,
      error: { message: 'network down' },
    }));

    expect(result.data).toEqual(cached);
    expect(result.error).toBe('The catalog could not refresh. Showing the latest saved version.');
  });

  it('returns an empty list (not a crash) when a query fails with nothing cached yet', async () => {
    const result = await resilientCatalogFetch<Product>(CACHE_KEY, async () => ({
      data: null,
      error: { message: 'network down' },
    }));
    expect(result.data).toEqual([]);
    expect(result.error).not.toBeNull();
  });

  it('also falls back to cache when the query promise itself throws', async () => {
    const cached: Product[] = [{ id: '1', name: 'Ray Spear' }];
    await resilientCatalogFetch<Product>(CACHE_KEY, async () => ({ data: cached, error: null }));

    const result = await resilientCatalogFetch<Product>(CACHE_KEY, async () => {
      throw new Error('fetch failed');
    });

    expect(result.data).toEqual(cached);
    expect(result.error).not.toBeNull();
  });

  it('recovers on a subsequent retry after a failed call', async () => {
    const cached: Product[] = [{ id: '1', name: 'Ray Spear' }];
    await resilientCatalogFetch<Product>(CACHE_KEY, async () => ({ data: cached, error: null }));

    // Simulate the user pressing "Retry" after a transient failure — the very next
    // call succeeds and should return live (not stale) data.
    await resilientCatalogFetch<Product>(CACHE_KEY, async () => ({ data: null, error: { message: 'down' } }));
    const fresh: Product[] = [{ id: '1', name: 'Ray Spear' }, { id: '2', name: 'Neo-VQS' }];
    const retryResult = await resilientCatalogFetch<Product>(CACHE_KEY, async () => ({ data: fresh, error: null }));

    expect(retryResult).toEqual({ data: fresh, error: null });
    expect(readCachedProducts<Product>(CACHE_KEY)?.data).toEqual(fresh);
  });
});

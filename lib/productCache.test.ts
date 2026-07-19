import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readCachedProducts, writeCachedProducts } from './productCache';

interface Item {
  id: number;
  name: string;
}

beforeEach(() => {
  window.localStorage.clear();
});

describe('productCache', () => {
  it('returns null when nothing has been cached yet', () => {
    expect(readCachedProducts<Item>('shop_products')).toBeNull();
  });

  it('round-trips written data and stamps a savedAt timestamp', () => {
    const items: Item[] = [{ id: 1, name: 'Ray Spear' }];
    const before = Date.now();
    writeCachedProducts('shop_products', items);
    const result = readCachedProducts<Item>('shop_products');
    expect(result).not.toBeNull();
    expect(result!.data).toEqual(items);
    expect(result!.savedAt).toBeGreaterThanOrEqual(before);
  });

  it('keeps separate cache keys independent', () => {
    writeCachedProducts('shop_products', [{ id: 1, name: 'A' }]);
    writeCachedProducts('home_shop_preview', [{ id: 2, name: 'B' }]);
    expect(readCachedProducts<Item>('shop_products')?.data).toEqual([{ id: 1, name: 'A' }]);
    expect(readCachedProducts<Item>('home_shop_preview')?.data).toEqual([{ id: 2, name: 'B' }]);
  });

  it('treats corrupt JSON as a cache miss instead of throwing', () => {
    window.localStorage.setItem('gm4wd_catalog_cache_v1_shop_products', '{not valid json');
    expect(readCachedProducts<Item>('shop_products')).toBeNull();
  });

  it('invalidates the cache when the stored schema version does not match', () => {
    window.localStorage.setItem(
      'gm4wd_catalog_cache_v1_shop_products',
      JSON.stringify({ schemaVersion: 999, savedAt: Date.now(), data: [{ id: 1, name: 'Stale' }] })
    );
    expect(readCachedProducts<Item>('shop_products')).toBeNull();
  });

  it('does not throw when localStorage.setItem fails (e.g. quota exceeded)', () => {
    const spy = vi.spyOn(window.localStorage.__proto__, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(() => writeCachedProducts('shop_products', [{ id: 1, name: 'A' }])).not.toThrow();
    spy.mockRestore();
  });
});

'use strict';

const { createTtlCache } = require('../../src/utils/runtimeCache');

describe('runtimeCache', () => {
  it('stores and retrieves cached values until expiration', async () => {
    const cache = createTtlCache({ ttlMs: 20, maxEntries: 3 });
    cache.set('alpha', { value: 1 });

    expect(cache.get('alpha')).toEqual({ value: 1 });

    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(cache.get('alpha')).toBeNull();
  });

  it('evicts oldest entries when maxEntries is exceeded', () => {
    const cache = createTtlCache({ ttlMs: 1000, maxEntries: 2 });
    cache.set('alpha', 1);
    cache.set('beta', 2);
    cache.set('gamma', 3);

    expect(cache.get('alpha')).toBeNull();
    expect(cache.get('beta')).toBe(2);
    expect(cache.get('gamma')).toBe(3);
  });

  it('produces stable keys for equivalent payloads', () => {
    const cache = createTtlCache({ ttlMs: 1000, maxEntries: 2 });

    expect(cache.stableKey('demo', { b: 2, a: 1 })).toBe(cache.stableKey('demo', { a: 1, b: 2 }));
  });
});

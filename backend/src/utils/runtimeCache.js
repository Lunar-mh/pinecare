'use strict';

function stableStringify(value) {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value !== 'object') {
    return String(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  return `{${Object.keys(value)
    .sort()
    .map((key) => `${key}:${stableStringify(value[key])}`)
    .join(',')}}`;
}

function createTtlCache({ ttlMs = 1000, maxEntries = 50 } = {}) {
  const store = new Map();

  function evictExpired() {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (entry.expiresAt <= now) {
        store.delete(key);
      }
    }
  }

  function trimIfNeeded() {
    while (store.size > maxEntries) {
      const oldestKey = store.keys().next().value;
      if (!oldestKey) {
        break;
      }
      store.delete(oldestKey);
    }
  }

  return {
    get(key) {
      evictExpired();
      const entry = store.get(key);
      return entry ? entry.value : null;
    },

    set(key, value) {
      evictExpired();
      store.set(key, {
        value,
        expiresAt: Date.now() + ttlMs,
      });
      trimIfNeeded();
      return value;
    },

    clear() {
      store.clear();
    },

    stableKey(prefix, payload) {
      return `${prefix}:${stableStringify(payload)}`;
    },
  };
}

module.exports = {
  createTtlCache,
  stableStringify,
};

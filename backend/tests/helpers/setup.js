'use strict';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
process.env.RUNTIME_MODE = process.env.RUNTIME_MODE || 'COMPETITION_SANDBOX';
process.env.COMPETITION_SANDBOX = process.env.COMPETITION_SANDBOX || '1';
process.env.PRODUCTION_LIVE = process.env.PRODUCTION_LIVE || '0';

async function closeCachedModule(modulePath, fnName) {
  try {
    const resolved = require.resolve(modulePath);
    const cached = require.cache[resolved];
    if (!cached || !cached.exports) {
      return;
    }

    const exported = cached.exports;
    const closeFn = exported && typeof exported[fnName] === 'function' ? exported[fnName].bind(exported) : null;
    if (!closeFn) {
      return;
    }

    await closeFn();
  } catch (_err) {
    // Best effort cleanup for test teardown.
  }
}

afterAll(async () => {
  await closeCachedModule('../../src/jobs', 'stopBackgroundWorkers');
  await closeCachedModule('../../src/config/database', 'closePool');
  await closeCachedModule('../../src/config/redis', 'closeRedis');
});

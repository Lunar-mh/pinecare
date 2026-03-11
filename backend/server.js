'use strict';

require('dotenv').config();

const { closePool } = require('./src/config/database');
const redis = require('./src/config/redis');
const { validateEnv } = require('./src/config/validateEnv');
const { resolveMode } = require('./src/config/runtimeMode');
const { stopMedicationJobs } = require('./src/jobs');
const logger = require('./src/utils/logger');
const app = require('./src/app');

validateEnv();

const port = process.env.PORT || 3000;

const server = app.listen(port, () => {
  logger.info('server', 'started', { port, mode: resolveMode() });
});

function closeHttpServer() {
  return new Promise((resolve, reject) => {
    server.close((err) => {
      if (err) {
        reject(err);
        return;
      }

      resolve();
    });
  });
}

async function gracefulShutdown(signal) {
  logger.info('server', 'shutdown_started', { signal });

  const timeout = setTimeout(() => {
    logger.error('server', 'shutdown_timeout', { signal });
    process.exit(1);
  }, 10000);

  try {
    stopMedicationJobs();
    await closeHttpServer();
    await Promise.allSettled([closePool(), redis.closeRedis()]);
    clearTimeout(timeout);
    logger.info('server', 'shutdown_completed', { signal });
    process.exit(0);
  } catch (err) {
    clearTimeout(timeout);
    logger.error('server', 'shutdown_failed', { signal, message: err.message });
    process.exit(1);
  }
}

process.on('SIGTERM', () => {
  gracefulShutdown('SIGTERM');
});
process.on('SIGINT', () => {
  gracefulShutdown('SIGINT');
});

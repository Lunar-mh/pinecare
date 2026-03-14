'use strict';

const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const healthRoutes = require('./routes/healthRoutes');
const systemHealthRoutes = require('./routes/systemHealthRoutes');
const errorHandler = require('./middleware/errorHandler');
const requestContext = require('./middleware/requestContext');
const securityHeaders = require('./middleware/securityHeaders');
const { startBackgroundWorkers } = require('./jobs');
const logger = require('./utils/logger');
const { isProductionLive } = require('./config/runtimeMode');
const {
  buildCorsOptions,
  getJsonBodyLimit,
  getTrustProxySetting,
  shouldStartMedicationJobs,
} = require('./config/http');

function shouldEnableLegacyRootRoutes() {
  const raw = String(process.env.ENABLE_LEGACY_ROOT_ROUTES || '').trim();
  if (raw) {
    return raw === '1';
  }

  return !isProductionLive();
}

function createRequestLogger() {
  let morgan = null;
  try {
    morgan = require('morgan');
  } catch (_err) {
    morgan = null;
  }

  if (morgan) {
    return morgan(':method :url :status :res[content-length] - :response-time ms', {
      stream: {
        write(line) {
          logger.info('http', 'request', { line: String(line || '').trim() });
        },
      },
    });
  }

  return (req, res, next) => {
    const startAt = Date.now();
    res.on('finish', () => {
      logger.info('http', 'request', {
        requestId: req.requestId || null,
        method: req.method,
        path: req.originalUrl || req.url,
        statusCode: res.statusCode,
        durationMs: Date.now() - startAt,
      });
    });
    next();
  };
}

const app = express();

app.set('trust proxy', getTrustProxySetting());
app.use(requestContext);
app.use(createRequestLogger());
app.use(securityHeaders);
app.use(express.json({ limit: getJsonBodyLimit() }));
app.use(cors(buildCorsOptions()));

app.use(systemHealthRoutes);
app.use('/health', healthRoutes);
app.use('/api/v1', routes);
if (shouldEnableLegacyRootRoutes()) {
  app.use('/', routes);
}

if (shouldStartMedicationJobs()) {
  startBackgroundWorkers();
}

app.use(errorHandler);

module.exports = app;

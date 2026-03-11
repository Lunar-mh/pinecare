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
const {
  buildCorsOptions,
  getJsonBodyLimit,
  getTrustProxySetting,
  shouldStartMedicationJobs,
} = require('./config/http');

const app = express();

app.set('trust proxy', getTrustProxySetting());
app.use(requestContext);
app.use(securityHeaders);
app.use(express.json({ limit: getJsonBodyLimit() }));
app.use(cors(buildCorsOptions()));

app.use(systemHealthRoutes);
app.use('/health', healthRoutes);
app.use('/api/v1', routes);
app.use('/', routes);

if (shouldStartMedicationJobs()) {
  startBackgroundWorkers();
}

app.use(errorHandler);

module.exports = app;

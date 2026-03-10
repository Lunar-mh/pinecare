'use strict';

const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const { startMedicationJobs } = require('./jobs');

const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(cors());

app.use('/api/v1', routes);
app.use('/', routes);

const shouldEnableJobs =
  process.env.NODE_ENV !== 'test' && String(process.env.ENABLE_MEDICATION_JOBS || '1') !== '0';
if (shouldEnableJobs) {
  startMedicationJobs();
}

app.use(errorHandler);

module.exports = app;

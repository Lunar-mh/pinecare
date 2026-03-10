'use strict';

require('dotenv').config();

const { validateEnv } = require('./src/config/validateEnv');
const { resolveMode } = require('./src/config/runtimeMode');
const app = require('./src/app');

validateEnv();

const port = process.env.PORT || 3000;

const server = app.listen(port, () => {
  console.log(`Backend server started on port ${port} (mode=${resolveMode()}).`);
});

function gracefulShutdown(signal) {
  console.log(`Received ${signal}, shutting down server...`);
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('Server shutdown timeout, forcing exit.');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

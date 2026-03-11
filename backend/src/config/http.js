'use strict';

const { isProductionLive } = require('./runtimeMode');

const DEFAULT_JSON_LIMIT = '1mb';
const DEFAULT_SERVER_ROLE = 'api';

function parseList(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function getCorsAllowedOrigins() {
  return parseList(process.env.CORS_ALLOWED_ORIGINS);
}

function isOriginAllowed(origin) {
  if (!origin) {
    return true;
  }

  const allowedOrigins = getCorsAllowedOrigins();
  if (allowedOrigins.length === 0) {
    return !isProductionLive();
  }

  return allowedOrigins.includes(origin);
}

function buildCorsOptions() {
  return {
    origin(origin, callback) {
      if (isOriginAllowed(origin)) {
        return callback(null, true);
      }

      const err = new Error('CORS origin not allowed.');
      err.code = 403;
      err.statusCode = 403;
      return callback(err);
    },
    credentials: true,
    optionsSuccessStatus: 204,
  };
}

function getTrustProxySetting() {
  const raw = String(process.env.TRUST_PROXY || '').trim().toLowerCase();
  if (!raw) {
    return false;
  }

  if (['1', 'true', 'yes', 'on'].includes(raw)) {
    return true;
  }

  if (['0', 'false', 'no', 'off'].includes(raw)) {
    return false;
  }

  const asNumber = Number.parseInt(raw, 10);
  if (Number.isInteger(asNumber) && asNumber >= 0) {
    return asNumber;
  }

  return raw;
}

function getJsonBodyLimit() {
  return String(process.env.JSON_BODY_LIMIT || DEFAULT_JSON_LIMIT).trim() || DEFAULT_JSON_LIMIT;
}

function getServerRole() {
  const raw = String(process.env.SERVER_ROLE || DEFAULT_SERVER_ROLE).trim().toLowerCase();
  return raw === 'worker' ? 'worker' : 'api';
}

function shouldStartMedicationJobs(nodeEnv = process.env.NODE_ENV) {
  return nodeEnv !== 'test' && getServerRole() === 'worker';
}

module.exports = {
  buildCorsOptions,
  getCorsAllowedOrigins,
  getJsonBodyLimit,
  getServerRole,
  getTrustProxySetting,
  isOriginAllowed,
  shouldStartMedicationJobs,
};


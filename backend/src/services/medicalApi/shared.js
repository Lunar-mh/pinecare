'use strict';

const axios = require('axios');
const AuditLogModel = require('../../models/auditLog');
const {
  createUpstreamError,
  isRetryableError,
  logThirdPartyError,
} = require('../../utils/thirdParty');

const API_TIMEOUT_MS = Number(process.env.MEDICAL_API_TIMEOUT_MS || 5000);
const MAX_RETRY = Math.max(0, Number(process.env.MEDICAL_API_MAX_RETRY || 2));
const CIRCUIT_BREAKER_THRESHOLD = Math.max(
  1,
  Number(process.env.MEDICAL_API_CIRCUIT_BREAKER_THRESHOLD || 3)
);
const CIRCUIT_BREAKER_COOLDOWN_MS = Math.max(
  1000,
  Number(process.env.MEDICAL_API_CIRCUIT_BREAKER_COOLDOWN_MS || 30000)
);

function createBizError(code, message, statusCode) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode || code;
  return error;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeList(data, fieldName) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data[fieldName])) return data[fieldName];
  return [];
}

async function writeAudit(action, details) {
  try {
    await AuditLogModel.create({
      userId: null,
      action,
      details,
    });
  } catch (_err) {
    return null;
  }

  return true;
}

function buildAuthHeaders(apiKey) {
  if (!apiKey) {
    return {};
  }

  const authMode = String(process.env.MEDICAL_API_AUTH_MODE || 'bearer')
    .trim()
    .toLowerCase();

  if (authMode === 'x-api-key') {
    return { 'X-API-Key': apiKey };
  }

  return { Authorization: `Bearer ${apiKey}` };
}

function buildHttpClient(baseURL, apiKey) {
  return axios.create({
    baseURL: baseURL || 'https://medical-api.example.com',
    timeout: API_TIMEOUT_MS,
    headers: {
      'Content-Type': 'application/json',
      ...buildAuthHeaders(apiKey),
    },
  });
}

function buildRequestOptions(requestId) {
  if (!requestId) {
    return {};
  }

  return {
    headers: {
      'X-Request-Id': String(requestId),
    },
  };
}

module.exports = {
  API_TIMEOUT_MS,
  CIRCUIT_BREAKER_COOLDOWN_MS,
  CIRCUIT_BREAKER_THRESHOLD,
  MAX_RETRY,
  buildAuthHeaders,
  buildHttpClient,
  buildRequestOptions,
  createBizError,
  createUpstreamError,
  isRetryableError,
  logThirdPartyError,
  normalizeList,
  sleep,
  writeAudit,
};

'use strict';

const { applyRuntimeModeEnv, isProductionLive } = require('./runtimeMode');

const BASE_SCHEMA = [
  { key: 'PORT', defaultValue: '3000', type: 'number', required: false },
  { key: 'DB_HOST', defaultValue: 'localhost', type: 'string', required: false },
  { key: 'DB_PORT', defaultValue: '3306', type: 'number', required: false },
  { key: 'DB_USER', defaultValue: 'root', type: 'string', required: false },
  { key: 'DB_PASSWORD', defaultValue: '', type: 'string', required: false },
  { key: 'DB_NAME', defaultValue: 'yinban', type: 'string', required: false },
  { key: 'REDIS_HOST', defaultValue: 'localhost', type: 'string', required: false },
  { key: 'REDIS_PORT', defaultValue: '6379', type: 'number', required: false },
  { key: 'JWT_SECRET', defaultValue: '', type: 'string', required: true },
  { key: 'JWT_REFRESH_SECRET', defaultValue: '', type: 'string', required: false },
  { key: 'RUNTIME_MODE', defaultValue: 'COMPETITION_SANDBOX', type: 'string', required: false },
  { key: 'PRODUCTION_LIVE', defaultValue: '0', type: 'string', required: false },
  { key: 'COMPETITION_SANDBOX', defaultValue: '1', type: 'string', required: false },
];

function castValue(raw, type, key) {
  if (type === 'number') {
    const value = Number(raw);
    if (!Number.isFinite(value) || Number.isNaN(value)) {
      throw new Error(`${key} must be a number.`);
    }
    return value;
  }

  return String(raw);
}

function validateRequiredVars(schema) {
  const missingRequired = [];
  const normalized = {};

  for (const item of schema) {
    const raw = process.env[item.key];
    const hasValue = raw !== undefined && raw !== null && String(raw).trim() !== '';

    if (!hasValue && item.required && !item.defaultValue) {
      missingRequired.push(item.key);
      continue;
    }

    const finalRaw = hasValue ? raw : item.defaultValue;
    const casted = castValue(finalRaw, item.type, item.key);

    normalized[item.key] = casted;
    process.env[item.key] = String(casted);
  }

  if (missingRequired.length > 0) {
    throw new Error(`Missing required environment variables: ${missingRequired.join(', ')}`);
  }

  return normalized;
}

function validateJwtSecretStrength() {
  const secret = String(process.env.JWT_SECRET || '').trim();
  if (!secret) {
    throw new Error('JWT_SECRET is required.');
  }

  if (secret.length < 16 && isProductionLive()) {
    throw new Error('JWT_SECRET must be at least 16 characters in PRODUCTION_LIVE mode.');
  }

  if (!process.env.JWT_REFRESH_SECRET) {
    process.env.JWT_REFRESH_SECRET = secret;
  }
}

function validateEnv() {
  const normalized = validateRequiredVars(BASE_SCHEMA);

  const mode = applyRuntimeModeEnv();
  normalized.RUNTIME_MODE = mode;
  normalized.PRODUCTION_LIVE = process.env.PRODUCTION_LIVE;
  normalized.COMPETITION_SANDBOX = process.env.COMPETITION_SANDBOX;

  validateJwtSecretStrength();

  return normalized;
}

module.exports = {
  validateEnv,
};

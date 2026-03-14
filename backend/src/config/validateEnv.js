'use strict';

const { createHmac } = require('crypto');
const { getCorsAllowedOrigins, getServerRole } = require('./http');
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

const REFRESH_SECRET_DERIVATION_SALT = 'yinban.jwt.refresh.v1';

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

function deriveRefreshSecret(secret) {
  return createHmac('sha256', secret).update(REFRESH_SECRET_DERIVATION_SALT).digest('hex');
}

function validateJwtSecretStrength() {
  const secret = String(process.env.JWT_SECRET || '').trim();
  if (!secret) {
    throw new Error('JWT_SECRET is required.');
  }

  if (secret.length < 16 && isProductionLive()) {
    throw new Error('JWT_SECRET must be at least 16 characters in PRODUCTION_LIVE mode.');
  }

  const refreshSecret = String(process.env.JWT_REFRESH_SECRET || '').trim();

  if (isProductionLive()) {
    if (!refreshSecret) {
      throw new Error('JWT_REFRESH_SECRET is required in PRODUCTION_LIVE mode. It must differ from JWT_SECRET.');
    }
    if (refreshSecret === secret) {
      throw new Error('JWT_REFRESH_SECRET must differ from JWT_SECRET in PRODUCTION_LIVE mode.');
    }
    return;
  }

  if (!refreshSecret || refreshSecret === secret) {
    process.env.JWT_REFRESH_SECRET = deriveRefreshSecret(secret);
    console.warn('[validateEnv] JWT_REFRESH_SECRET is missing or duplicated. A derived refresh secret has been applied.');
  }
}

function isBcryptHash(value) {
  return /^\$2[aby]\$/.test(String(value || '').trim());
}

function resolveAdminPasswordHash() {
  return String(process.env.ADMIN_PASSWORD_HASH || process.env.ADMIN_PASSWORD || '').trim();
}
function isPlaceholderValue(value) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();

  if (!normalized) return true;

  return (
    normalized.includes('replace_') ||
    normalized.includes('your_') ||
    normalized === 'change_me' ||
    normalized === 'root' ||
    normalized === 'password'
  );
}

function requireEnv(keys, message) {
  const missing = keys.filter((key) => !String(process.env[key] || '').trim());
  if (missing.length > 0) {
    throw new Error(`${message}: ${missing.join(', ')}`);
  }
}

function resolveServiceMode(key) {
  return String(process.env[key] || 'auto')
    .trim()
    .toLowerCase();
}

function validateProductionSecrets() {
  if (!isProductionLive()) {
    return;
  }

  if (isPlaceholderValue(process.env.JWT_SECRET)) {
    throw new Error('JWT_SECRET cannot use a placeholder value in PRODUCTION_LIVE mode.');
  }

  if (isPlaceholderValue(process.env.JWT_REFRESH_SECRET)) {
    throw new Error('JWT_REFRESH_SECRET cannot use a placeholder value in PRODUCTION_LIVE mode.');
  }

  if (String(process.env.WECHAT_NOTIFY_MOCK || '0').trim() === '1') {
    throw new Error('WECHAT_NOTIFY_MOCK must be disabled in PRODUCTION_LIVE mode.');
  }

  if (getCorsAllowedOrigins().length === 0) {
    throw new Error('CORS_ALLOWED_ORIGINS must be configured in PRODUCTION_LIVE mode.');
  }

  const adminUsername = String(process.env.ADMIN_USERNAME || '').trim();
  const adminPasswordHash = resolveAdminPasswordHash();
  if (!adminUsername || !adminPasswordHash) {
    throw new Error('ADMIN_USERNAME and ADMIN_PASSWORD_HASH are required in PRODUCTION_LIVE mode.');
  }

  if (!isBcryptHash(adminPasswordHash)) {
    throw new Error('ADMIN_PASSWORD_HASH must be a valid bcrypt hash in PRODUCTION_LIVE mode.');
  }
}

function validateAiConfig() {
  const mode = resolveServiceMode('AI_CONSULT_MODE');
  if (mode === 'live' || isProductionLive()) {
    requireEnv(['DASHSCOPE_API_KEY'], 'AI consult live mode requires environment variables');
  }
}

function validateVoiceConfig() {
  const mode = resolveServiceMode('VOICE_SERVICE_MODE');
  if (mode !== 'live' && !isProductionLive()) {
    return;
  }

  requireEnv(['DASHSCOPE_API_KEY'], 'Voice live mode requires environment variables');

  const ossMode = resolveServiceMode('OSS_MODE');
  const hasUploadApi =
    Boolean(String(process.env.OSS_UPLOAD_API_URL || '').trim()) &&
    Boolean(String(process.env.OSS_UPLOAD_TOKEN || '').trim());
  const hasDirectOssConfig =
    Boolean(String(process.env.OSS_ENDPOINT || '').trim()) &&
    Boolean(String(process.env.OSS_ACCESS_KEY_ID || '').trim()) &&
    Boolean(String(process.env.OSS_ACCESS_KEY_SECRET || '').trim());

  if ((ossMode === 'live' || isProductionLive()) && !hasUploadApi && !hasDirectOssConfig) {
    throw new Error(
      'Voice live mode requires OSS live upload configuration: OSS_UPLOAD_API_URL + OSS_UPLOAD_TOKEN or OSS_ENDPOINT + OSS_ACCESS_KEY_ID + OSS_ACCESS_KEY_SECRET.'
    );
  }
}

function validateMedicalConfig() {
  const mode = resolveServiceMode('MEDICAL_API_MODE');
  if (mode === 'live' || isProductionLive()) {
    requireEnv(
      ['MEDICAL_API_BASE_URL', 'MEDICAL_API_KEY'],
      'Medical API live mode requires environment variables'
    );
  }
}

function validateWeChatConfig() {
  const mode = resolveServiceMode('WECHAT_NOTIFY_MODE');
  if (mode !== 'live' && !isProductionLive()) {
    return;
  }

  requireEnv(['WX_ACCESS_TOKEN', 'WX_MSG_TEMPLATE_ID'], 'WeChat notify live mode requires environment variables');
}

function validateOssConfig() {
  const mode = resolveServiceMode('OSS_MODE');
  if (mode !== 'live' && !isProductionLive()) {
    return;
  }

  const hasUploadApi =
    Boolean(String(process.env.OSS_UPLOAD_API_URL || '').trim()) &&
    Boolean(String(process.env.OSS_UPLOAD_TOKEN || '').trim());
  const hasDirectOssConfig =
    Boolean(String(process.env.OSS_ENDPOINT || '').trim()) &&
    Boolean(String(process.env.OSS_ACCESS_KEY_ID || '').trim()) &&
    Boolean(String(process.env.OSS_ACCESS_KEY_SECRET || '').trim());

  if (!hasUploadApi && !hasDirectOssConfig) {
    throw new Error(
      'OSS live mode requires OSS_UPLOAD_API_URL + OSS_UPLOAD_TOKEN or OSS_ENDPOINT + OSS_ACCESS_KEY_ID + OSS_ACCESS_KEY_SECRET.'
    );
  }
}

function validateEnv() {
  const normalized = validateRequiredVars(BASE_SCHEMA);

  const mode = applyRuntimeModeEnv();
  normalized.RUNTIME_MODE = mode;
  normalized.PRODUCTION_LIVE = process.env.PRODUCTION_LIVE;
  normalized.COMPETITION_SANDBOX = process.env.COMPETITION_SANDBOX;

  validateJwtSecretStrength();
  normalized.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
  validateProductionSecrets();
  validateAiConfig();
  validateVoiceConfig();
  validateMedicalConfig();
  validateWeChatConfig();
  validateOssConfig();

  normalized.SERVER_ROLE = getServerRole();
  process.env.SERVER_ROLE = normalized.SERVER_ROLE;

  return normalized;
}

module.exports = {
  validateEnv,
};





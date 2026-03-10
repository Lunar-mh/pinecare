'use strict';

const ENV_SCHEMA = [
  { key: 'PORT', defaultValue: '3000', type: 'number', required: false },
  { key: 'DB_HOST', defaultValue: 'localhost', type: 'string', required: false },
  { key: 'DB_PORT', defaultValue: '3306', type: 'number', required: false },
  { key: 'DB_USER', defaultValue: 'root', type: 'string', required: false },
  { key: 'DB_PASSWORD', defaultValue: '', type: 'string', required: false },
  { key: 'DB_NAME', defaultValue: 'yinban', type: 'string', required: false },
  { key: 'REDIS_HOST', defaultValue: 'localhost', type: 'string', required: false },
  { key: 'REDIS_PORT', defaultValue: '6379', type: 'number', required: false },
  { key: 'JWT_SECRET', defaultValue: '', type: 'string', required: true },
  { key: 'WX_MSG_TEMPLATE_ID', defaultValue: '', type: 'string', required: false },
];

function castValue(raw, type, key) {
  if (type === 'number') {
    const value = Number(raw);
    if (!Number.isFinite(value) || Number.isNaN(value)) {
      throw new Error(`${key} 必须为数字`);
    }
    return value;
  }

  return String(raw);
}

function validateEnv() {
  const missingRequired = [];
  const normalized = {};

  for (const item of ENV_SCHEMA) {
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
    throw new Error(`缺少必填环境变量: ${missingRequired.join(', ')}`);
  }

  return normalized;
}

module.exports = {
  validateEnv,
};

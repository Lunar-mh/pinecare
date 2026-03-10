'use strict';

const medicationSettingModel = require('../models/medicationSettingModel');

function createBizError(code, message, statusCode) {
  const err = new Error(message);
  err.code = code;
  err.statusCode = statusCode || code;
  return err;
}

function parseSwitch(value, fieldName) {
  if (value === undefined) {
    return undefined;
  }

  if (value === true || value === 1 || value === '1') return 1;
  if (value === false || value === 0 || value === '0') return 0;

  throw createBizError(400, `${fieldName} 仅支持 0 或 1`, 400);
}

function normalizeTime(value, fieldName) {
  if (value === undefined) {
    return undefined;
  }

  const text = String(value || '').trim();
  const regex = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/;
  if (!regex.test(text)) {
    throw createBizError(400, `${fieldName} 时间格式非法`, 400);
  }

  return text.length === 5 ? `${text}:00` : text;
}

const medicationSettingService = {
  async getSettings(userId) {
    return medicationSettingModel.getOrCreateByUserId(userId);
  },

  async updateSettings(userId, payload) {
    const safe = payload || {};

    const current = await medicationSettingModel.getOrCreateByUserId(userId);

    const next = {
      reminder_enabled:
        parseSwitch(safe.reminder_enabled, 'reminder_enabled') === undefined
          ? current.reminder_enabled
          : parseSwitch(safe.reminder_enabled, 'reminder_enabled'),
      family_sync_enabled:
        parseSwitch(safe.family_sync_enabled, 'family_sync_enabled') === undefined
          ? current.family_sync_enabled
          : parseSwitch(safe.family_sync_enabled, 'family_sync_enabled'),
      sleep_start:
        normalizeTime(safe.sleep_start, 'sleep_start') === undefined
          ? current.sleep_start
          : normalizeTime(safe.sleep_start, 'sleep_start'),
      sleep_end:
        normalizeTime(safe.sleep_end, 'sleep_end') === undefined
          ? current.sleep_end
          : normalizeTime(safe.sleep_end, 'sleep_end'),
    };

    return medicationSettingModel.upsertByUserId(userId, next);
  },
};

module.exports = medicationSettingService;

'use strict';

const { createBizError } = require('../../utils/serviceError');
const DEFAULT_NOTIFICATION_SETTINGS = {
  healthAlertEnabled: true,
  medicationReminderEnabled: true,
  sosAlertEnabled: true,
};


function normalizeElderId(elderId) {
  if (elderId === undefined || elderId === null || elderId === '') {
    return null;
  }

  const parsed = Number(elderId);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw createBizError(422, 'elderId must be a positive integer.', 422);
  }

  return parsed;
}

function normalizeBoolean(value, fieldName) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    if (value === 1) return true;
    if (value === 0) return false;
  }

  if (typeof value === 'string') {
    const text = value.trim().toLowerCase();
    if (text === '1' || text === 'true') return true;
    if (text === '0' || text === 'false') return false;
  }

  throw createBizError(422, `${fieldName} must be a boolean-like value.`, 422);
}

function toIsoText(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function isRecentWithinHours(value, hours) {
  if (!value) return false;
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return false;
  return Date.now() - time <= hours * 60 * 60 * 1000;
}

function pickLatestTime(values) {
  const latest = values
    .map((item) => (item ? new Date(item).getTime() : NaN))
    .filter((item) => !Number.isNaN(item))
    .sort((a, b) => b - a)[0];

  return Number.isFinite(latest) ? new Date(latest).toISOString() : null;
}

function selectBinding(bindings, elderId) {
  if (!Array.isArray(bindings) || bindings.length === 0) {
    return null;
  }

  if (!elderId) {
    return bindings[0];
  }

  const target = bindings.find((item) => Number(item.elderId) === elderId);
  if (!target) {
    throw createBizError(404, 'Bound elder not found.', 404);
  }

  return target;
}

module.exports = {
  DEFAULT_NOTIFICATION_SETTINGS,
  createBizError,
  isRecentWithinHours,
  normalizeBoolean,
  normalizeElderId,
  pickLatestTime,
  selectBinding,
  toIsoText,
};

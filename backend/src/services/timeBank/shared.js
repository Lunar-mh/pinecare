'use strict';

const redis = require('../../config/redis');

const ACCOUNT_CACHE_TTL = 300;
const BALANCE_CACHE_TTL = 300;
const LEADERBOARD_CACHE_TTL = 300;

function createStatusError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

async function getCacheJSON(key) {
  try {
    const raw = await redis.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch (_err) {
    return null;
  }
}

async function setCacheJSON(key, value, ttl) {
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttl);
  } catch (_err) {
    return null;
  }

  return true;
}

async function delCache(...keys) {
  const validKeys = keys.filter(Boolean);
  if (validKeys.length === 0) return;

  try {
    await redis.del(validKeys);
  } catch (_err) {
    return null;
  }

  return true;
}

function calculateDurationHours(payload) {
  const hasTimeRange = payload.startTime && payload.endTime;
  let durationHours = Number(payload.duration || 0);

  if (hasTimeRange) {
    const start = new Date(payload.startTime).getTime();
    const end = new Date(payload.endTime).getTime();

    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
      throw createStatusError('startTime/endTime is invalid.', 422);
    }

    durationHours = (end - start) / (1000 * 60 * 60);
  }

  const normalized = Math.round(durationHours * 10) / 10;
  if (!Number.isFinite(normalized) || normalized < 0.5 || normalized > 8) {
    throw createStatusError('durationHours must stay between 0.5 and 8.', 422);
  }

  return normalized;
}

function calculateTimeCoins(durationHours) {
  return Math.max(1, Math.ceil(Number(durationHours) * 1));
}

function formatMySQLDateTime(date) {
  const pad = (num) => String(num).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

module.exports = {
  ACCOUNT_CACHE_TTL,
  BALANCE_CACHE_TTL,
  LEADERBOARD_CACHE_TTL,
  calculateDurationHours,
  calculateTimeCoins,
  createStatusError,
  delCache,
  formatMySQLDateTime,
  getCacheJSON,
  setCacheJSON,
};
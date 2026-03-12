'use strict';

const redis = require('../../config/redis');
const logger = require('../../utils/logger');

const CONTEXT_PREFIX = 'companion:context:';
const CONTEXT_MAX_MESSAGES = 10;
const CONTEXT_EXPIRE_SECONDS = 7 * 24 * 60 * 60;

function trimContext(messages) {
  return (Array.isArray(messages) ? messages : []).slice(-CONTEXT_MAX_MESSAGES);
}

function logBestEffort(action, err) {
  logger.warn('companionService', action, { error: err.message });
}

async function getContextMessages(userId) {
  try {
    const parsed = JSON.parse((await redis.get(`${CONTEXT_PREFIX}${userId}`)) || '[]');
    return Array.isArray(parsed)
      ? parsed
          .filter((item) => item && item.role && item.content)
          .map((item) => ({ role: item.role, content: String(item.content) }))
      : [];
  } catch (err) {
    logBestEffort('context_read_failed', err);
    return [];
  }
}

async function saveContextMessages(userId, messages) {
  const finalMessages = trimContext(messages);
  try {
    await redis.set(`${CONTEXT_PREFIX}${userId}`, JSON.stringify(finalMessages), 'EX', CONTEXT_EXPIRE_SECONDS);
  } catch (err) {
    logBestEffort('context_write_failed', err);
  }
  return finalMessages;
}

module.exports = {
  getContextMessages,
  saveContextMessages,
};

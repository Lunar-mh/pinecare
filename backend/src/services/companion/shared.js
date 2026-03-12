'use strict';

const AuditLogModel = require('../../models/auditLog');
const { resolveIntegrationMode } = require('../../config/integrationMode');
const logger = require('../../utils/logger');
const { DEFAULT_DECADE, GAME_LIST } = require('./content');

function createBizError(code, message, statusCode) {
  const err = new Error(message);
  err.code = code;
  err.statusCode = statusCode || code;
  return err;
}

const getModeStrategy = () =>
  resolveIntegrationMode({
    requestedMode: process.env.AI_COMPANION_MODE || process.env.DASHSCOPE_MODE || 'auto',
    liveConfigured: Boolean(String(process.env.DASHSCOPE_API_KEY || '').trim()),
  });

function normalizeDecade(input) {
  const raw = String(input || '').trim().toLowerCase();
  if (!raw) return DEFAULT_DECADE;
  if (/^19(50|60|70|80|90)s$/.test(raw)) return raw;
  if (/^(50|60|70|80|90)年代$/.test(raw)) return `19${raw.slice(0, 2)}s`;
  if (/^(1950|1960|1970|1980|1990)$/.test(raw)) return `${raw}s`;
  return /^(50|60|70|80|90)s$/.test(raw) ? `19${raw}` : DEFAULT_DECADE;
}

function buildFallbackReply(message, safetyResult) {
  const prompt = String(message || '').trim();
  const suffix = safetyResult && safetyResult.triage && safetyResult.triage.responseSuffix ? ` ${safetyResult.triage.responseSuffix}` : '';
  return `I am here with you. For "${prompt}", let's take it one step at a time. You can drink some water, slow your breathing, and talk with a family member or caregiver if you want company.${suffix}`.trim();
}

async function writeAudit(action, details) {
  try {
    await AuditLogModel.create({
      userId: details && details.userId ? Number(details.userId) : null,
      action,
      details,
    });
  } catch (err) {
    logger.error('companionService', 'audit_failed', { action, error: err.message });
  }
}

function getDiagnostics(strategy, fallbackUsed) {
  const stub = fallbackUsed || strategy.effectiveMode !== 'live';
  return {
    mode: stub ? 'stub' : 'live',
    source: stub ? 'companion_stub' : 'dashscope_live',
    fallbackUsed,
  };
}

function validateGamePayload(payload) {
  const gameType = String(payload.gameType || '').trim();
  const score = Number(payload.score);
  const difficulty = Number(payload.difficulty);
  const durationSeconds = Number(payload.durationSeconds);
  const gameTypes = GAME_LIST.map((item) => item.gameType);

  if (!gameTypes.includes(gameType)) {
    throw createBizError(422, `gameType only supports ${gameTypes.join(', ')}`, 422);
  }
  if (!Number.isFinite(score) || score < 0) {
    throw createBizError(422, 'score must be greater than or equal to 0.', 422);
  }
  if (!Number.isInteger(difficulty) || difficulty < 1 || difficulty > 5) {
    throw createBizError(422, 'difficulty must be an integer between 1 and 5.', 422);
  }
  if (!Number.isFinite(durationSeconds) || durationSeconds < 0) {
    throw createBizError(422, 'durationSeconds must be greater than or equal to 0.', 422);
  }

  return { gameType, score, difficulty, durationSeconds };
}

module.exports = {
  createBizError,
  getModeStrategy,
  normalizeDecade,
  buildFallbackReply,
  writeAudit,
  getDiagnostics,
  validateGamePayload,
};

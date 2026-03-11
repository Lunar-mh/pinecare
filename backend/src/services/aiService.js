'use strict';

const axios = require('axios');
const ConsultRecord = require('../models/consultRecord');
const AuditLogModel = require('../models/auditLog');
const healthContextService = require('./healthContextService');
const { buildSystemPrompt } = require('../utils/promptTemplate');
const {
  createUpstreamError,
  isRetryableError,
  logThirdPartyError,
} = require('../utils/thirdParty');
const { resolveIntegrationMode } = require('../config/integrationMode');

const DASHSCOPE_URL =
  'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';
const REQUEST_TIMEOUT_MS = Number(process.env.AI_CONSULT_TIMEOUT_MS || 30000);
const MAX_RETRY = Math.max(0, Number(process.env.AI_CONSULT_MAX_RETRY || 2));

function createBizError(message, code = 503, statusCode = 503) {
  const err = new Error(message);
  err.code = code;
  err.statusCode = statusCode;
  return err;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRequestedMode() {
  return process.env.AI_CONSULT_MODE || process.env.DASHSCOPE_MODE || 'auto';
}

function hasLiveConfig() {
  return Boolean(String(process.env.DASHSCOPE_API_KEY || '').trim());
}

function getModeStrategy() {
  return resolveIntegrationMode({
    requestedMode: getRequestedMode(),
    liveConfigured: hasLiveConfig(),
  });
}

function buildStubReply(message, profile, options = {}) {
  const prompt = String(message || '').trim() || 'current health question';
  const nickname = profile && profile.real_name ? String(profile.real_name) : 'User';
  const chronic = Array.isArray(profile && profile.chronicDiseases)
    ? profile.chronicDiseases.filter(Boolean)
    : [];
  const chronicText = chronic.length > 0 ? `Known conditions: ${chronic.join(', ')}. ` : '';
  const fallbackText = options.fallbackUsed
    ? 'The live consultation service is currently unavailable, so this is a controlled fallback reply. '
    : 'This is a sandbox health-consult reply. ';

  return `${nickname}, ${fallbackText}${chronicText}For "${prompt}", please track symptom changes, rest regularly, and seek in-person care if symptoms continue.`;
}

function toConsultError(err) {
  return createUpstreamError(err, {
    timeout: 'AI consult service timeout.',
    rateLimited: 'AI consult service rate limited.',
    unavailable: 'AI consult service unavailable.',
    failed: 'AI consult service failed.',
  });
}

async function requestWithRetry(payload) {
  const apiKey = String(process.env.DASHSCOPE_API_KEY || '').trim();
  if (!apiKey) {
    throw createBizError('DashScope API key is not configured.', 503, 503);
  }

  let lastError = null;
  for (let attempt = 0; attempt <= MAX_RETRY; attempt += 1) {
    try {
      return await axios.post(DASHSCOPE_URL, payload, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: REQUEST_TIMEOUT_MS,
      });
    } catch (err) {
      lastError = err;
      logThirdPartyError('dashscope-ai-consult', err, { attempt: attempt + 1 });

      if (!isRetryableError(err) || attempt >= MAX_RETRY) {
        throw toConsultError(err);
      }

      await sleep(100 * (attempt + 1));
    }
  }

  throw toConsultError(lastError);
}

async function writeAudit(action, details) {
  try {
    await AuditLogModel.create({
      userId: details && details.userId ? Number(details.userId) : null,
      action,
      details,
    });
  } catch (err) {
    console.error('ai_consult_audit_failed', { action, message: err.message });
  }
}

class AIService {
  getCapabilityReport() {
    const strategy = getModeStrategy();
    return {
      requestedMode: strategy.requestedMode,
      effectiveMode: strategy.effectiveMode,
      liveConfigured: strategy.liveConfigured,
      fallbackAllowed: strategy.fallbackAllowed,
      runtimeMode: strategy.runtimeMode,
    };
  }

  isLiveMode() {
    return getModeStrategy().effectiveMode === 'live';
  }

  async chat(userId, message, sessionId) {
    const { profile, contextMessages } = await healthContextService.getContextForUser(userId);
    const historyRows = await ConsultRecord.findBySession(userId, sessionId, 20);
    const historyMessages = historyRows.map((row) => ({
      role: row.role,
      content: row.content,
    }));

    const strategy = getModeStrategy();
    let reply;
    let tokens = null;
    let diagnostics;

    if (strategy.effectiveMode === 'live') {
      const systemPrompt = buildSystemPrompt(profile);
      const messages = [
        { role: 'system', content: systemPrompt },
        ...contextMessages,
        ...historyMessages,
        { role: 'user', content: message },
      ];

      try {
        const response = await requestWithRetry({
          model: 'qwen-turbo',
          input: { messages },
          parameters: { result_format: 'message' },
        });

        const choice =
          response.data && response.data.output && response.data.output.choices
            ? response.data.output.choices[0]
            : null;

        reply =
          choice &&
          choice.message &&
          typeof choice.message.content === 'string' &&
          choice.message.content.trim()
            ? choice.message.content.trim()
            : null;

        if (!reply) {
          throw createBizError('AI consult response is empty.', 503, 503);
        }

        tokens =
          response.data && response.data.usage
            ? (response.data.usage.input_tokens || 0) + (response.data.usage.output_tokens || 0)
            : null;

        diagnostics = {
          mode: 'live',
          source: 'dashscope_live',
          fallbackUsed: false,
          reason: 'live_response',
        };
      } catch (err) {
        if (!strategy.fallbackAllowed) {
          throw err;
        }

        reply = buildStubReply(message, profile, { fallbackUsed: true });
        diagnostics = {
          mode: 'stub',
          source: 'ai_consult_stub',
          fallbackUsed: true,
          reason: 'live_error_fallback',
        };

        await writeAudit('ai_consult.fallback', {
          userId,
          sessionId,
          requestedMode: strategy.requestedMode,
          effectiveMode: strategy.effectiveMode,
          fallbackReason: err.message,
        });
      }
    } else {
      if (!strategy.stubAllowed) {
        throw createBizError('AI consult stub mode is disabled in PRODUCTION_LIVE mode.', 503, 503);
      }

      reply = buildStubReply(message, profile);
      diagnostics = {
        mode: 'stub',
        source: 'ai_consult_stub',
        fallbackUsed: false,
        reason: 'sandbox_or_stub_mode',
      };
    }

    await ConsultRecord.create({ userId, sessionId, role: 'user', content: message });
    await ConsultRecord.create({ userId, sessionId, role: 'assistant', content: reply, tokens });

    return { reply, sessionId, tokens, diagnostics };
  }
}

module.exports = new AIService();


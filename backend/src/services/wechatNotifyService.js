'use strict';

const axios = require('axios');
const { SOS_ERROR_CODES, createSosError } = require('../utils/errorCodes');
const sosWechatDirectService = require('./sosWechatDirectService');

const DEFAULT_TIMEOUT_MS = parseInt(process.env.SOS_WECHAT_TIMEOUT_MS || '5000', 10);

function getCapabilityReport() {
  const endpoint = String(process.env.SOS_WECHAT_NOTIFY_URL || '').trim();
  const direct = sosWechatDirectService.getCapabilityReport();

  return {
    key: 'sos_wechat_notify',
    configured: Boolean(endpoint) || direct.liveConfigured,
    mode: endpoint ? 'webhook' : direct.requestedMode,
    effectiveMode: endpoint ? 'webhook' : direct.effectiveMode,
    fallbackAllowed: endpoint ? true : direct.fallbackAllowed,
    source: endpoint ? 'external_webhook' : direct.provider,
    missingConfig: endpoint ? [] : direct.missingConfig,
    notes: endpoint
      ? 'SOS WeChat notifications are forwarded to the configured webhook endpoint.'
      : 'SOS WeChat notifications use direct subscribe-message delivery when live credentials are present.',
    healthy: Boolean(endpoint) || direct.liveConfigured || direct.fallbackAllowed,
  };
}

async function sendWechatNotification(payload) {
  const endpoint = String(process.env.SOS_WECHAT_NOTIFY_URL || '').trim();

  if (!payload || !payload.open_id) {
    throw createSosError(SOS_ERROR_CODES.PARAM_ERROR, 'SOS WeChat open_id is required.', null, 400);
  }

  if (!endpoint) {
    try {
      return await sosWechatDirectService.sendSosWechat(payload);
    } catch (err) {
      throw createSosError(
        SOS_ERROR_CODES.NOTIFICATION_ERROR,
        err.message || 'SOS WeChat notification failed.',
        err.data || null,
        err.statusCode || 502
      );
    }
  }

  try {
    const response = await axios.post(
      endpoint,
      {
        open_id: payload.open_id,
        template_code: 'sos_alert',
        data: {
          event_id: payload.event_id,
          contact_name: payload.contact_name,
          address: payload.address || 'unknown address',
          latitude: payload.latitude,
          longitude: payload.longitude,
          triggered_at: payload.triggered_at,
        },
      },
      { timeout: DEFAULT_TIMEOUT_MS }
    );

    return response.data || { ok: true };
  } catch (err) {
    throw createSosError(
      SOS_ERROR_CODES.NOTIFICATION_ERROR,
      `SOS WeChat notification failed: ${err.message}`,
      { detail: err.message },
      502
    );
  }
}

module.exports = {
  sendWechatNotification,
  getCapabilityReport,
};

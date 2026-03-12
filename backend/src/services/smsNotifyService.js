'use strict';

const axios = require('axios');
const { SOS_ERROR_CODES, createSosError } = require('../utils/errorCodes');
const sosSmsDirectService = require('./sosSmsDirectService');
const { mergeProviderRuntime, recordProviderSuccess } = require('../utils/providerRuntime');

const DEFAULT_TIMEOUT_MS = parseInt(process.env.SOS_SMS_TIMEOUT_MS || '5000', 10);

function getCapabilityReport() {
  const endpoint = String(process.env.SOS_SMS_NOTIFY_URL || '').trim();
  const direct = sosSmsDirectService.getCapabilityReport();

  return mergeProviderRuntime('sos-sms-webhook', {
    key: 'sos_sms_notify',
    configured: Boolean(endpoint) || direct.liveConfigured,
    mode: endpoint ? 'webhook' : direct.requestedMode,
    requestedMode: endpoint ? 'webhook' : direct.requestedMode,
    effectiveMode: endpoint ? 'webhook' : direct.effectiveMode,
    fallbackAllowed: endpoint ? true : direct.fallbackAllowed,
    source: endpoint ? 'external_webhook' : direct.provider,
    missingConfig: endpoint ? [] : direct.missingConfig,
    runtimeMode: direct.runtimeMode || null,
    liveConfigured: Boolean(endpoint) || direct.liveConfigured,
    notes: endpoint
      ? 'SOS SMS notifications are forwarded to the configured webhook endpoint.'
      : 'SOS SMS notifications use direct Aliyun SMS delivery when live credentials are present.',
    healthy: Boolean(endpoint) || direct.liveConfigured || direct.fallbackAllowed,
  });
}

async function sendSmsNotification(payload) {
  const endpoint = String(process.env.SOS_SMS_NOTIFY_URL || '').trim();

  if (!payload || !payload.phone) {
    throw createSosError(SOS_ERROR_CODES.PARAM_ERROR, 'SOS SMS phone is required.', null, 400);
  }

  if (!endpoint) {
    try {
      return await sosSmsDirectService.sendSosSms(payload);
    } catch (err) {
      throw createSosError(
        SOS_ERROR_CODES.NOTIFICATION_ERROR,
        err.message || 'SOS SMS notification failed.',
        err.data || null,
        err.statusCode || 502
      );
    }
  }

  try {
    const response = await axios.post(
      endpoint,
      {
        phone: payload.phone,
        template_code: process.env.SOS_SMS_TEMPLATE_CODE || 'SOS_ALERT_TEMPLATE',
        template_params: {
          event_id: String(payload.event_id),
          contact_name: payload.contact_name,
          address: payload.address || 'unknown address',
          latitude: payload.latitude,
          longitude: payload.longitude,
          triggered_at: payload.triggered_at,
        },
      },
      { timeout: DEFAULT_TIMEOUT_MS }
    );

    recordProviderSuccess('sos-sms-webhook', {
      operation: 'send',
      mode: 'webhook',
      endpoint,
      eventId: payload.event_id || null,
    });
    return response.data || { ok: true };
  } catch (err) {
    throw createSosError(
      SOS_ERROR_CODES.NOTIFICATION_ERROR,
      `SOS SMS notification failed: ${err.message}`,
      { detail: err.message },
      502
    );
  }
}

module.exports = {
  sendSmsNotification,
  getCapabilityReport,
};

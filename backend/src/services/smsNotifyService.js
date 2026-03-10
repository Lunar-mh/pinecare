'use strict';

const axios = require('axios');
const { SOS_ERROR_CODES, SOS_ERROR_MESSAGES, createSosError } = require('../utils/errorCodes');

const DEFAULT_TIMEOUT_MS = parseInt(process.env.SOS_SMS_TIMEOUT_MS || '5000', 10);

async function sendSmsNotification(payload) {
  const endpoint = process.env.SOS_SMS_NOTIFY_URL;
  if (!endpoint) {
    throw createSosError(SOS_ERROR_CODES.NOTIFICATION_ERROR, '未配置 SOS 短信通知地址 SOS_SMS_NOTIFY_URL', null, 502);
  }

  if (!payload || !payload.phone) {
    throw createSosError(SOS_ERROR_CODES.PARAM_ERROR, '短信通知缺少手机号', null, 400);
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
          address: payload.address || '未知地址',
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
      `${SOS_ERROR_MESSAGES.NOTIFICATION_ERROR}: 短信发送失败`,
      { detail: err.message },
      502
    );
  }
}

module.exports = {
  sendSmsNotification,
};

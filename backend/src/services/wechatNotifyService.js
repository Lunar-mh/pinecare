'use strict';

const axios = require('axios');
const { SOS_ERROR_CODES, SOS_ERROR_MESSAGES, createSosError } = require('../utils/errorCodes');

const DEFAULT_TIMEOUT_MS = parseInt(process.env.SOS_WECHAT_TIMEOUT_MS || '5000', 10);

async function sendWechatNotification(payload) {
  const endpoint = process.env.SOS_WECHAT_NOTIFY_URL;
  if (!endpoint) {
    throw createSosError(SOS_ERROR_CODES.NOTIFICATION_ERROR, '未配置 SOS 微信通知地址 SOS_WECHAT_NOTIFY_URL', null, 502);
  }

  if (!payload || !payload.open_id) {
    throw createSosError(SOS_ERROR_CODES.PARAM_ERROR, '微信通知缺少 open_id', null, 400);
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
      `${SOS_ERROR_MESSAGES.NOTIFICATION_ERROR}: 微信发送失败`,
      { detail: err.message },
      502
    );
  }
}

module.exports = {
  sendWechatNotification,
};

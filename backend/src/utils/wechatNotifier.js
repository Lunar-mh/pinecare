'use strict';

const axios = require('axios');
const { query } = require('../config/database');

const DEFAULT_TIMEOUT = 5000;
const DEFAULT_RETRY_TIMES = 2;

function createBizError(message, code, statusCode, data) {
  const err = new Error(message);
  err.code = code || 502;
  err.statusCode = statusCode || 502;
  err.data = data || null;
  return err;
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '未知时间';
  }

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');

  return `${y}-${m}-${d} ${hh}:${mm}`;
}

async function findOpenIdByUserId(userId) {
  const [rows] = await query(
    `SELECT id, openid
     FROM users
     WHERE id = ?
     LIMIT 1`,
    [userId]
  );

  const user = rows[0] || null;
  if (!user || !user.openid) {
    throw createBizError('用户未绑定微信openid，无法发送通知', 400, 400);
  }

  return String(user.openid);
}

function resolveTemplateId(type) {
  if (type === 'family') {
    return process.env.WX_MSG_TEMPLATE_ID_FAMILY || process.env.WX_MSG_TEMPLATE_ID || '';
  }
  if (type === 'refill') {
    return process.env.WX_MSG_TEMPLATE_ID_REFILL || process.env.WX_MSG_TEMPLATE_ID || '';
  }
  if (type === 'second') {
    return process.env.WX_MSG_TEMPLATE_ID_SECOND || process.env.WX_MSG_TEMPLATE_ID || '';
  }

  return process.env.WX_MSG_TEMPLATE_ID || '';
}

function buildApiUrl() {
  const baseUrl =
    process.env.WECHAT_NOTIFY_API_URL || 'https://api.weixin.qq.com/cgi-bin/message/subscribe/send';
  const accessToken = process.env.WX_ACCESS_TOKEN || '';

  if (!accessToken) {
    return null;
  }

  return `${baseUrl}?access_token=${encodeURIComponent(accessToken)}`;
}

function mapWechatError(data) {
  const errCode = Number(data && data.errcode);
  const errMsg = String((data && data.errmsg) || '微信服务返回失败');

  if (errCode === -1 || errCode === 45009) {
    return createBizError(`微信服务繁忙：${errMsg}`, 503, 503, data);
  }

  if (errCode === 40001 || errCode === 42001) {
    return createBizError(`微信访问凭证无效：${errMsg}`, 502, 502, data);
  }

  return createBizError(`微信通知发送失败：${errMsg}`, 502, 502, data);
}

function shouldRetry(err) {
  if (!err) return false;

  if (err.response && err.response.data) {
    const errCode = Number(err.response.data.errcode);
    return errCode === -1 || errCode === 45009;
  }

  return ['ECONNABORTED', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET'].includes(err.code);
}

async function requestWithRetry(payload, retryTimes) {
  const apiUrl = buildApiUrl();

  if (!apiUrl || process.env.WECHAT_NOTIFY_MOCK === '1') {
    console.warn('[用药提醒] 微信通知配置缺失，已降级为模拟发送');
    return {
      errcode: 0,
      errmsg: 'mock success',
      msgid: `mock-${Date.now()}`,
    };
  }

  let lastError = null;
  const maxRetries = Number.isInteger(retryTimes) ? retryTimes : DEFAULT_RETRY_TIMES;

  for (let i = 0; i <= maxRetries; i += 1) {
    try {
      const response = await axios.post(apiUrl, payload, {
        timeout: Number(process.env.WECHAT_NOTIFY_TIMEOUT || DEFAULT_TIMEOUT),
      });

      const data = response.data || {};
      if (Number(data.errcode || 0) !== 0) {
        throw mapWechatError(data);
      }

      return data;
    } catch (err) {
      lastError = err;
      if (i < maxRetries && shouldRetry(err)) {
        continue;
      }
      break;
    }
  }

  if (lastError && lastError.code && lastError.statusCode) {
    throw lastError;
  }

  throw createBizError(`微信通知调用失败：${lastError ? lastError.message : '未知错误'}`, 502, 502);
}

async function sendTemplateByOpenId(options) {
  const templateId = resolveTemplateId(options.type);
  if (!templateId) {
    console.warn('[用药提醒] 未配置模板ID，已降级为模拟发送');
    return {
      msgid: `mock-${Date.now()}`,
      mock: true,
    };
  }

  const payload = {
    touser: options.openid,
    template_id: templateId,
    page: options.page || 'pages/medication/index',
    data: options.data || {},
    miniprogram_state: process.env.WECHAT_MINI_PROGRAM_STATE || 'formal',
    lang: 'zh_CN',
  };

  const result = await requestWithRetry(payload, DEFAULT_RETRY_TIMES);

  return {
    msgid: result.msgid || null,
    mock: false,
  };
}

const wechatNotifier = {
  async sendMedicationReminder(params) {
    const openid = await findOpenIdByUserId(params.userId);

    return sendTemplateByOpenId({
      openid,
      type: params.remindType === 'second' ? 'second' : 'first',
      data: {
        thing1: { value: String(params.medicationName || '用药提醒').slice(0, 20) },
        thing2: { value: String(params.dosage || '').slice(0, 20) },
        time3: { value: formatDateTime(params.scheduledTime) },
        thing4: { value: String(params.remark || '请按时服药并确认').slice(0, 20) },
      },
    });
  },

  async sendFamilyMissedReminder(params) {
    const openid = await findOpenIdByUserId(params.familyUserId);

    return sendTemplateByOpenId({
      openid,
      type: 'family',
      data: {
        thing1: { value: String(params.medicationName || '用药提醒').slice(0, 20) },
        time2: { value: formatDateTime(params.scheduledTime) },
        thing3: { value: '老人超过2小时未确认服药'.slice(0, 20) },
      },
    });
  },

  async sendRefillReminder(params) {
    const openid = await findOpenIdByUserId(params.userId);

    return sendTemplateByOpenId({
      openid,
      type: 'refill',
      data: {
        thing1: { value: String(params.medicationName || '药品').slice(0, 20) },
        thing2: {
          value: `剩余${params.remainingQuantity}，阈值${params.reminderThreshold}`.slice(0, 20),
        },
        thing3: { value: '请及时续药，避免断药'.slice(0, 20) },
      },
    });
  },
};

module.exports = wechatNotifier;

'use strict';

const axios = require('axios');

const DEFAULT_TIMEOUT_MS = parseInt(process.env.FALL_NOTIFY_TIMEOUT_MS || '5000', 10);
const DEFAULT_RETRY_TIMES = parseInt(process.env.FALL_NOTIFY_RETRY_TIMES || '2', 10);
const RETRY_DELAY_MS = parseInt(process.env.FALL_NOTIFY_RETRY_DELAY_MS || '500', 10);

/**
 * 通知服务：封装微信/SMS 推送
 */
class NotificationService {
  /**
   * 批量通知联系人
   * @param {object} event
   * @param {Array<{id?:number,contactId:number,contactType:string,notifyMethod:string,phone?:string|null,wechatOpenId?:string|null}>} contacts
   * @returns {Promise<Array<{contactId:number,notifyMethod:string,success:boolean,error?:string}>>}
   */
  async notifyContacts(event, contacts) {
    if (!Array.isArray(contacts) || contacts.length === 0) {
      return [];
    }

    const results = [];
    for (const contact of contacts) {
      try {
        if (contact.notifyMethod === 'sms') {
          await this.sendSms(contact, event);
        } else {
          await this.sendWechat(contact, event);
        }

        results.push({
          contactId: contact.contactId,
          notifyMethod: contact.notifyMethod,
          success: true,
        });
      } catch (err) {
        results.push({
          contactId: contact.contactId,
          notifyMethod: contact.notifyMethod,
          success: false,
          error: err.message,
        });
      }
    }

    return results;
  }

  /**
   * 微信通知
   * @param {object} contact
   * @param {object} event
   * @returns {Promise<void>}
   */
  async sendWechat(contact, event) {
    const endpoint = process.env.FALL_WECHAT_NOTIFY_URL;
    if (!endpoint) {
      throw new Error('未配置微信通知地址 FALL_WECHAT_NOTIFY_URL');
    }

    if (!contact.wechatOpenId) {
      throw new Error('联系人缺少 wechatOpenId');
    }

    const payload = {
      openId: contact.wechatOpenId,
      templateCode: 'fall_detected',
      data: {
        eventId: event.id,
        detectedAt: event.detectedAt,
        sensitivity: event.sensitivity,
        contactType: contact.contactType,
      },
    };

    await this._requestWithRetry(endpoint, payload);
  }

  /**
   * 短信通知
   * @param {object} contact
   * @param {object} event
   * @returns {Promise<void>}
   */
  async sendSms(contact, event) {
    const endpoint = process.env.FALL_SMS_NOTIFY_URL;
    if (!endpoint) {
      throw new Error('未配置短信通知地址 FALL_SMS_NOTIFY_URL');
    }

    if (!contact.phone) {
      throw new Error('联系人缺少手机号');
    }

    const payload = {
      phone: contact.phone,
      templateCode: 'fall_detected',
      params: {
        eventId: String(event.id),
        detectedAt: String(event.detectedAt),
      },
    };

    await this._requestWithRetry(endpoint, payload);
  }

  /**
   * 带重试的 HTTP 请求
   * @param {string} endpoint
   * @param {object} payload
   * @returns {Promise<void>}
   */
  async _requestWithRetry(endpoint, payload) {
    const maxRetry = Number.isFinite(DEFAULT_RETRY_TIMES) ? DEFAULT_RETRY_TIMES : 2;
    const maxAttempts = Math.max(1, maxRetry + 1);

    let lastError;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        await axios.post(endpoint, payload, { timeout: DEFAULT_TIMEOUT_MS });
        return;
      } catch (err) {
        lastError = err;
        if (attempt >= maxAttempts) {
          break;
        }
        await NotificationService._sleep(RETRY_DELAY_MS * attempt);
      }
    }

    const message = lastError && lastError.message ? lastError.message : '通知请求失败';
    throw new Error(message);
  }

  /**
   * 休眠工具
   * @param {number} ms
   * @returns {Promise<void>}
   */
  static async _sleep(ms) {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}

module.exports = new NotificationService();

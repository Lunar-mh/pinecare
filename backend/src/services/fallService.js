'use strict';

const redis = require('../config/redis');
const FallModel = require('../models/fall');
const notificationService = require('./notificationService');

const VALID_SENSITIVITY = ['high', 'medium', 'low'];
const THRESHOLDS = {
  high: { vertical: 2.5, horizontal: 1.5 },
  medium: { vertical: 3.0, horizontal: 2.0 },
  low: { vertical: 4.0, horizontal: 2.5 },
};

const TIMER_SECONDS = parseInt(process.env.FALL_COUNTDOWN_SECONDS || '15', 10);
const SETTINGS_CACHE_TTL = parseInt(process.env.FALL_SETTINGS_CACHE_TTL || '86400', 10);

let workerTimer = null;
let workerRunning = false;

/**
 * 创建业务错误
 * @param {number} code
 * @param {string} message
 * @param {number} [status]
 * @returns {Error}
 */
function createBizError(code, message, status) {
  const err = new Error(message);
  err.code = code;
  err.statusCode = status || code;
  return err;
}

/**
 * 规范化传感器数据
 * @param {object} sensorData
 * @returns {{verticalPeak:number,horizontalChangeRate:number}}
 */
function normalizeSensorData(sensorData) {
  const data = sensorData || {};

  // 优先使用直接提供的统计值
  const directVertical = Number(
    data.verticalPeak !== undefined ? data.verticalPeak : data.vertical_peak
  );
  const directHorizontal = Number(
    data.horizontalChangeRate !== undefined ? data.horizontalChangeRate : data.horizontal_change_rate
  );

  if (Number.isFinite(directVertical) && Number.isFinite(directHorizontal)) {
    return {
      verticalPeak: Math.abs(directVertical),
      horizontalChangeRate: Math.abs(directHorizontal),
    };
  }

  // 兼容常见字段：x/y/z 数组
  const xArr = Array.isArray(data.x) ? data.x : [];
  const yArr = Array.isArray(data.y) ? data.y : [];
  const zArr = Array.isArray(data.z) ? data.z : Array.isArray(data.az) ? data.az : [];
  const tArr = Array.isArray(data.timestamps) ? data.timestamps : [];

  // 兼容 samples 结构
  const samples = Array.isArray(data.samples) ? data.samples : [];
  const sampleX = samples.map((s) => Number(s.x || s.ax || 0));
  const sampleY = samples.map((s) => Number(s.y || s.ay || 0));
  const sampleZ = samples.map((s) => Number(s.z || s.az || 0));
  const sampleT = samples.map((s) => Number(s.ts || s.timestamp || 0));

  const finalX = xArr.length > 0 ? xArr.map(Number) : sampleX;
  const finalY = yArr.length > 0 ? yArr.map(Number) : sampleY;
  const finalZ = zArr.length > 0 ? zArr.map(Number) : sampleZ;
  const finalT = tArr.length > 0 ? tArr.map(Number) : sampleT;

  const verticalPeak = finalZ.reduce((max, v) => {
    const val = Number.isFinite(v) ? Math.abs(v) : 0;
    return val > max ? val : max;
  }, 0);

  let horizontalChangeRate = 0;
  if (finalX.length > 1 && finalY.length > 1) {
    for (let i = 1; i < Math.min(finalX.length, finalY.length); i += 1) {
      const prev = Math.sqrt(Math.pow(finalX[i - 1] || 0, 2) + Math.pow(finalY[i - 1] || 0, 2));
      const curr = Math.sqrt(Math.pow(finalX[i] || 0, 2) + Math.pow(finalY[i] || 0, 2));
      const delta = Math.abs(curr - prev);

      let deltaSec = 1;
      if (finalT[i] && finalT[i - 1] && finalT[i] > finalT[i - 1]) {
        deltaSec = (finalT[i] - finalT[i - 1]) / 1000;
      }

      const rate = deltaSec > 0 ? delta / deltaSec : delta;
      if (rate > horizontalChangeRate) {
        horizontalChangeRate = rate;
      }
    }
  }

  return {
    verticalPeak,
    horizontalChangeRate,
  };
}

/**
 * 生成 Redis key
 */
function timerKey(eventId) {
  return `fall:timer:${eventId}`;
}

function settingsKey(userId) {
  return `fall:settings:${userId}`;
}

/**
 * 解析并校验灵敏度
 * @param {string} sensitivity
 * @returns {'high'|'medium'|'low'}
 */
function ensureSensitivity(sensitivity) {
  const normalized = String(sensitivity || 'medium').toLowerCase();
  if (!VALID_SENSITIVITY.includes(normalized)) {
    throw createBizError(400, '灵敏度仅支持 high/medium/low', 400);
  }
  return normalized;
}

/**
 * 跌倒检测服务
 */
const fallService = {
  /**
   * 三轴加速度阈值算法
   * @param {object} sensorData
   * @param {'high'|'medium'|'low'} sensitivity
   * @returns {{isFall:boolean,verticalPeak:number,horizontalChangeRate:number,threshold:{vertical:number,horizontal:number},sensitivity:string}}
   */
  detectFall(sensorData, sensitivity) {
    const finalSensitivity = ensureSensitivity(sensitivity || 'medium');
    const threshold = THRESHOLDS[finalSensitivity];
    const normalized = normalizeSensorData(sensorData);

    const isFall =
      normalized.verticalPeak > threshold.vertical &&
      normalized.horizontalChangeRate > threshold.horizontal;

    return {
      isFall,
      verticalPeak: normalized.verticalPeak,
      horizontalChangeRate: normalized.horizontalChangeRate,
      threshold,
      sensitivity: finalSensitivity,
    };
  },

  /**
   * 跌倒上报
   * @param {number} userId
   * @param {object} sensorData
   */
  async reportFall(userId, sensorData) {
    if (!userId) {
      throw createBizError(401, '用户未认证', 401);
    }

    const settings = await this.getFallSettings(userId);
    const sensitivity = settings.sensitivity || 'medium';
    const detection = this.detectFall(sensorData, sensitivity);

    if (!detection.isFall) {
      const eventId = await FallModel.createFalseAlarmEvent(userId, sensorData, sensitivity);
      const event = await FallModel.findEventById(eventId);
      return {
        detected: false,
        reason: 'no-fall',
        event,
        detection,
      };
    }

    const eventId = await FallModel.createDetectingEvent(userId, sensorData, sensitivity);
    await redis.set(timerKey(eventId), String(eventId), 'EX', TIMER_SECONDS);

    const event = await FallModel.findEventById(eventId);
    return {
      detected: true,
      event,
      detection,
      countdownSeconds: TIMER_SECONDS,
    };
  },

  /**
   * 取消跌倒事件
   * @param {number} userId
   * @param {number|string} eventId
   */
  async cancelFall(userId, eventId) {
    const numericEventId = Number(eventId);
    if (!Number.isInteger(numericEventId) || numericEventId <= 0) {
      throw createBizError(400, 'eventId 非法', 400);
    }

    const event = await FallModel.findEventByIdAndUser(numericEventId, userId);
    if (!event) {
      throw createBizError(404, '跌倒事件不存在', 404);
    }

    if (event.status !== 'detecting') {
      throw createBizError(409, '当前状态不允许取消', 409);
    }

    const updated = await FallModel.markCancelled(numericEventId);
    if (!updated) {
      throw createBizError(409, '事件已被处理，无法取消', 409);
    }

    await redis.del(timerKey(numericEventId));
    const latest = await FallModel.findEventByIdAndUser(numericEventId, userId);
    return {
      event: latest,
      cancelled: true,
    };
  },

  /**
   * 到期处理 detecting 事件
   * @param {number|string} eventId
   */
  async processPendingFall(eventId) {
    const numericEventId = Number(eventId);
    if (!Number.isInteger(numericEventId) || numericEventId <= 0) {
      return { processed: false, reason: 'invalid-event-id' };
    }

    const event = await FallModel.findEventById(numericEventId);
    if (!event) {
      return { processed: false, reason: 'not-found' };
    }

    if (event.status !== 'detecting') {
      return { processed: false, reason: 'already-processed', event };
    }

    const confirmed = await FallModel.markConfirmed(numericEventId);
    if (!confirmed) {
      return { processed: false, reason: 'race-lost', event };
    }

    await redis.del(timerKey(numericEventId));

    const latestEvent = await FallModel.findEventById(numericEventId);
    const contacts = await FallModel.getNotificationContacts(latestEvent.userId);

    await FallModel.createNotificationRecords(numericEventId, contacts);
    const notifications = await FallModel.findNotificationsByEventId(numericEventId);

    let sentCount = 0;
    let failedCount = 0;

    for (const record of notifications) {
      const contact = contacts.find(
        (item) => item.contactId === record.contactId && item.notifyMethod === record.notifyMethod
      );

      if (!contact) {
        await FallModel.updateNotificationStatus(record.id, 'failed');
        failedCount += 1;
        continue;
      }

      try {
        if (record.notifyMethod === 'sms') {
          await notificationService.sendSms(contact, latestEvent);
        } else {
          await notificationService.sendWechat(contact, latestEvent);
        }
        await FallModel.updateNotificationStatus(record.id, 'sent');
        sentCount += 1;
      } catch (err) {
        await FallModel.updateNotificationStatus(record.id, 'failed');
        failedCount += 1;
      }
    }

    return {
      processed: true,
      event: latestEvent,
      notification: {
        total: notifications.length,
        sent: sentCount,
        failed: failedCount,
      },
    };
  },

  /**
   * 分页查询历史
   * @param {number} userId
   * @param {{page?:number,pageSize?:number,status?:string}} params
   */
  async getFallHistory(userId, params = {}) {
    const page = Math.max(1, Number(params.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(params.pageSize) || 10));

    let status = null;
    if (params.status !== undefined && params.status !== null && params.status !== '') {
      status = String(params.status);
      const validStatus = ['detecting', 'confirmed', 'cancelled', 'false_alarm'];
      if (!validStatus.includes(status)) {
        throw createBizError(400, 'status 参数非法', 400);
      }
    }

    const [total, list] = await Promise.all([
      FallModel.countHistory(userId, { status }),
      FallModel.listHistory(userId, { page, pageSize, status }),
    ]);

    return {
      list,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  },

  /**
   * 获取灵敏度设置（带缓存）
   * @param {number} userId
   */
  async getFallSettings(userId) {
    const cacheKey = settingsKey(userId);

    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (err) {
      // 缓存不可用时降级数据库
      console.warn('读取跌倒设置缓存失败:', err.message);
    }

    const row = await FallModel.getSensitivitySetting(userId);
    const result = {
      sensitivity: row ? row.sensitivity : 'medium',
      updatedAt: row ? row.updatedAt : null,
    };

    try {
      await redis.set(cacheKey, JSON.stringify(result), 'EX', SETTINGS_CACHE_TTL);
    } catch (err) {
      console.warn('写入跌倒设置缓存失败:', err.message);
    }

    return result;
  },

  /**
   * 更新灵敏度设置（并同步缓存）
   * @param {number} userId
   * @param {string} sensitivity
   */
  async updateFallSettings(userId, sensitivity) {
    const finalSensitivity = ensureSensitivity(sensitivity);

    await FallModel.upsertSensitivitySetting(userId, finalSensitivity);
    const settings = await FallModel.getSensitivitySetting(userId);

    const result = {
      sensitivity: settings.sensitivity,
      updatedAt: settings.updatedAt,
    };

    try {
      await redis.set(settingsKey(userId), JSON.stringify(result), 'EX', SETTINGS_CACHE_TTL);
    } catch (err) {
      console.warn('更新跌倒设置缓存失败:', err.message);
    }

    return result;
  },

  /**
   * 启动倒计时 worker（每秒轮询）
   */
  startCountdownWorker() {
    if (workerTimer) {
      return;
    }

    workerTimer = setInterval(async () => {
      if (workerRunning) {
        return;
      }

      workerRunning = true;
      try {
        const events = await FallModel.findExpiredDetectingEvents(TIMER_SECONDS);
        for (const event of events) {
          try {
            await this.processPendingFall(event.id);
          } catch (err) {
            console.error('处理到期跌倒事件失败:', err.message);
          }
        }
      } catch (err) {
        console.error('跌倒 worker 轮询失败:', err.message);
      } finally {
        workerRunning = false;
      }
    }, 1000);

    // 避免阻塞进程退出
    if (typeof workerTimer.unref === 'function') {
      workerTimer.unref();
    }
  },

  /**
   * 停止倒计时 worker
   */
  stopCountdownWorker() {
    if (workerTimer) {
      clearInterval(workerTimer);
      workerTimer = null;
    }
  },
};

module.exports = fallService;

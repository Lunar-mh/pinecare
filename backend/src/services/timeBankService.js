'use strict';

const redis = require('../config/redis');
const TimeBankModel = require('../models/timeBank');
const credentialService = require('./credentialService');
const { verifyChain } = require('../utils/hashChain');

const ACCOUNT_CACHE_TTL = 300;
const BALANCE_CACHE_TTL = 300;
const LEADERBOARD_CACHE_TTL = 300;

/**
 * 安全读缓存，Redis 不可用时降级为直连数据库
 * @param {string} key
 * @returns {Promise<any|null>}
 */
async function getCacheJSON(key) {
  try {
    const raw = await redis.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    return null;
  }
}

/**
 * 安全写缓存，失败时不影响主流程
 * @param {string} key
 * @param {any} value
 * @param {number} ttl
 */
async function setCacheJSON(key, value, ttl) {
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttl);
  } catch (err) {
    // 缓存失败不阻断主链路
  }
}

/**
 * 安全删缓存
 * @param {string[]} keys
 */
async function delCache(...keys) {
  const validKeys = keys.filter(Boolean);
  if (validKeys.length === 0) return;

  try {
    await redis.del(validKeys);
  } catch (err) {
    // 缓存删除失败不阻断主链路
  }
}

/**
 * 统一时长计算：优先 start/end，其次 payload.duration
 * @param {object} payload
 * @returns {number}
 */
function calculateDurationHours(payload) {
  const hasTimeRange = payload.startTime && payload.endTime;
  let durationHours = Number(payload.duration || 0);

  if (hasTimeRange) {
    const start = new Date(payload.startTime).getTime();
    const end = new Date(payload.endTime).getTime();

    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
      const err = new Error('startTime/endTime 非法');
      err.statusCode = 422;
      throw err;
    }

    durationHours = (end - start) / (1000 * 60 * 60);
  }

  const normalized = Math.round(durationHours * 10) / 10;
  if (!Number.isFinite(normalized) || normalized < 0.5 || normalized > 8) {
    const err = new Error('服务时长需在 0.5 到 8 小时之间');
    err.statusCode = 422;
    throw err;
  }

  return normalized;
}

/**
 * 根据时长计算时间币（1小时=1币，向上取整为整数）
 * @param {number} durationHours
 * @returns {number}
 */
function calculateTimeCoins(durationHours) {
  return Math.max(1, Math.ceil(Number(durationHours) * 1));
}

/**
 * 格式化为 MySQL DATETIME 字符串（本地时区）
 * @param {Date} date
 * @returns {string}
 */
function formatMySQLDateTime(date) {
  const pad = (num) => String(num).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

class TimeBankService {
  /**
   * 获取账户详情（自动开户）
   * @param {number} userId
   * @returns {Promise<object>}
   */
  async getAccount(userId) {
    const cacheKey = `timebank:account:${userId}`;
    const cached = await getCacheJSON(cacheKey);
    if (cached) {
      return cached;
    }

    const account = await TimeBankModel.getOrCreateAccountByUserId(userId);
    const data = {
      id: account.id,
      userId: account.user_id,
      balance: account.balance,
      totalEarned: account.total_earned,
      totalSpent: account.total_spent,
      creditScore: account.credit_score,
      creditLevel: account.credit_level,
      createdAt: account.created_at,
      updatedAt: account.updated_at,
    };

    await setCacheJSON(cacheKey, data, ACCOUNT_CACHE_TTL);
    await setCacheJSON(`timebank:balance:${userId}`, { balance: data.balance }, BALANCE_CACHE_TTL);

    return data;
  }

  /**
   * 获取余额（自动开户）
   * @param {number} userId
   * @returns {Promise<{balance: number}>}
   */
  async getBalance(userId) {
    const cacheKey = `timebank:balance:${userId}`;
    const cached = await getCacheJSON(cacheKey);
    if (cached) {
      return cached;
    }

    const account = await this.getAccount(userId);
    const result = { balance: account.balance };

    await setCacheJSON(cacheKey, result, BALANCE_CACHE_TTL);
    return result;
  }

  /**
   * 记录服务
   * @param {number} providerId
   * @param {object} payload
   * @returns {Promise<object>}
   */
  async recordService(providerId, payload) {
    const recipientId = Number(payload.recipientId);
    if (!recipientId) {
      const err = new Error('recipientId 非法');
      err.statusCode = 422;
      throw err;
    }

    if (Number(providerId) === recipientId) {
      const err = new Error('服务者与被服务者不能相同');
      err.statusCode = 422;
      throw err;
    }

    const durationHours = calculateDurationHours(payload);
    const timeCoins = calculateTimeCoins(durationHours);

    let startDate;
    let endDate;

    if (payload.startTime && payload.endTime) {
      startDate = new Date(payload.startTime);
      endDate = new Date(payload.endTime);
    } else {
      endDate = new Date();
      startDate = new Date(endDate.getTime() - durationHours * 60 * 60 * 1000);
    }

    const startTime = formatMySQLDateTime(startDate);
    const endTime = formatMySQLDateTime(endDate);

    const created = await TimeBankModel.createServiceRecord({
      providerId,
      recipientId,
      serviceType: payload.type,
      startTime,
      endTime,
      durationHours,
      timeCoins,
      locationHash: payload.locationHash || null,
    });

    return {
      recordId: created.id,
      recordHash: created.recordHash,
      prevHash: created.prevHash,
      status: created.status,
      startTime,
      endTime,
      durationHours,
      timeCoins,
    };
  }

  /**
   * 确认或取消服务
   * @param {number} userId
   * @param {{recordId: number, action: 'confirm'|'cancel'}} payload
   * @returns {Promise<object>}
   */
  async confirmService(userId, payload) {
    const action = payload.action;
    const recordId = Number(payload.recordId);

    if (!recordId || !['confirm', 'cancel'].includes(action)) {
      const err = new Error('recordId/action 参数非法');
      err.statusCode = 422;
      throw err;
    }

    const record = await TimeBankModel.getServiceRecordById(recordId);
    if (!record) {
      const err = new Error('服务记录不存在');
      err.statusCode = 404;
      throw err;
    }

    if (![Number(record.provider_id), Number(record.recipient_id)].includes(Number(userId))) {
      const err = new Error('无权操作该服务记录');
      err.statusCode = 403;
      throw err;
    }

    if (record.status !== 'pending') {
      const err = new Error('仅 pending 状态可确认或取消');
      err.statusCode = 409;
      throw err;
    }

    const chainOk = verifyChain(record.record_hash, record.prev_hash, {
      provider_id: record.provider_id,
      recipient_id: record.recipient_id,
      service_type: record.service_type,
      start_time: record.start_time,
      end_time: record.end_time,
      duration_hours: record.duration_hours,
      time_coins: record.time_coins,
      location_hash: record.location_hash,
      status: 'pending',
    });

    if (!chainOk) {
      const err = new Error('服务记录哈希链校验失败');
      err.statusCode = 409;
      throw err;
    }

    const baseSignData = {
      recordId: record.id,
      providerId: record.provider_id,
      recipientId: record.recipient_id,
      action,
      timeCoins: record.time_coins,
    };

    const providerSignature = credentialService.generateSignature(
      { ...baseSignData, role: 'provider' },
      `${process.env.HASH_SECRET || 'timebank'}:provider:${record.provider_id}`
    );

    const recipientSignature = credentialService.generateSignature(
      { ...baseSignData, role: 'recipient' },
      `${process.env.HASH_SECRET || 'timebank'}:recipient:${record.recipient_id}`
    );

    const platformSignature = credentialService.generatePlatformSignature(record.id);

    const settled = await TimeBankModel.settleServiceRecord(record.id, action, {
      providerSignature,
      recipientSignature,
      platformSignature,
    });

    await delCache(
      `timebank:account:${record.provider_id}`,
      `timebank:balance:${record.provider_id}`,
      `timebank:account:${record.recipient_id}`,
      `timebank:balance:${record.recipient_id}`
    );

    if (payload.communityId !== undefined && payload.communityId !== null) {
      await delCache(`timebank:leaderboard:${payload.communityId}`);
    }

    return {
      recordId: record.id,
      status: settled.record.status,
      signatures: {
        providerSignature,
        recipientSignature,
        platformSignature,
      },
      account: settled.account,
    };
  }

  /**
   * 服务历史分页查询
   * @param {number} userId
   * @param {'provided'|'received'} type
   * @param {number} page
   * @param {number} pageSize
   * @returns {Promise<object>}
   */
  async getServiceHistory(userId, type, page, pageSize) {
    const result = await TimeBankModel.listServiceHistory(userId, type, page, pageSize);

    return {
      list: result.list.map((item) => ({
        id: item.id,
        providerId: item.provider_id,
        recipientId: item.recipient_id,
        serviceType: item.service_type,
        startTime: item.start_time,
        endTime: item.end_time,
        durationHours: Number(item.duration_hours),
        timeCoins: item.time_coins,
        status: item.status,
        recordHash: item.record_hash,
        prevHash: item.prev_hash,
        providerSignatureDigest: item.provider_signature
          ? `${String(item.provider_signature).slice(0, 12)}...`
          : null,
        recipientSignatureDigest: item.recipient_signature
          ? `${String(item.recipient_signature).slice(0, 12)}...`
          : null,
        platformSignatureDigest: item.platform_signature
          ? `${String(item.platform_signature).slice(0, 12)}...`
          : null,
        createdAt: item.created_at,
      })),
      pagination: result.pagination,
    };
  }

  /**
   * 创建兑换记录
   * @param {number} userId
   * @param {{exchangeType: string, itemName: string, coinsRequired: number}} payload
   * @returns {Promise<object>}
   */
  async createExchange(userId, payload) {
    const coinsRequired = Number(payload.coinsRequired);
    if (!Number.isInteger(coinsRequired) || coinsRequired <= 0) {
      const err = new Error('coinsRequired 必须为正整数');
      err.statusCode = 422;
      throw err;
    }

    const account = await this.getAccount(userId);
    if (account.balance < coinsRequired) {
      const err = new Error('时间币余额不足');
      err.statusCode = 409;
      throw err;
    }

    const exchange = await TimeBankModel.createExchangeRecord(userId, {
      exchangeType: payload.exchangeType,
      itemName: payload.itemName,
      coinsRequired,
    });

    await delCache(`timebank:account:${userId}`, `timebank:balance:${userId}`);

    if (payload.communityId !== undefined && payload.communityId !== null) {
      await delCache(`timebank:leaderboard:${payload.communityId}`);
    }

    return exchange;
  }

  /**
   * 查询兑换历史
   * @param {number} userId
   * @returns {Promise<Array>}
   */
  async getExchangeHistory(userId) {
    const rows = await TimeBankModel.listExchangeHistory(userId);
    return rows.map((item) => ({
      id: item.id,
      userId: item.user_id,
      exchangeType: item.exchange_type,
      itemName: item.item_name,
      coinsRequired: item.coins_required,
      status: item.status,
      createdAt: item.created_at,
      completedAt: item.completed_at,
    }));
  }

  /**
   * 查询排行榜（Redis 缓存 5 分钟）
   * @param {number|string} communityId
   * @returns {Promise<Array>}
   */
  async getLeaderboard(communityId) {
    const cid = communityId === undefined || communityId === null ? 'all' : String(communityId);
    const cacheKey = `timebank:leaderboard:${cid}`;

    const cached = await getCacheJSON(cacheKey);
    if (cached) {
      return cached;
    }

    const rows = await TimeBankModel.getCommunityLeaderboard(communityId);
    const list = rows.map((item, index) => ({
      rank: index + 1,
      userId: item.user_id,
      balance: item.balance,
      totalEarned: item.total_earned,
      creditScore: item.credit_score,
      creditLevel: item.credit_level,
    }));

    await setCacheJSON(cacheKey, list, LEADERBOARD_CACHE_TTL);
    return list;
  }
}

module.exports = new TimeBankService();

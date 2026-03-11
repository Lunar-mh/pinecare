'use strict';

const TimeBankModel = require('../../models/timeBank');
const { LEADERBOARD_CACHE_TTL, createStatusError, delCache, getCacheJSON, setCacheJSON } = require('./shared');

const exchangeService = {
  async createExchange(service, userId, payload) {
    const coinsRequired = Number(payload.coinsRequired);
    if (!Number.isInteger(coinsRequired) || coinsRequired <= 0) {
      throw createStatusError('coinsRequired must be a positive integer.', 422);
    }

    const account = await service.getAccount(userId);
    if (account.balance < coinsRequired) {
      throw createStatusError('Insufficient time bank balance.', 409);
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
  },

  async getExchangeHistory(_service, userId) {
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
  },

  async getLeaderboard(_service, communityId) {
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
  },
};

module.exports = exchangeService;

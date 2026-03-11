'use strict';

const TimeBankModel = require('../../models/timeBank');
const {
  ACCOUNT_CACHE_TTL,
  BALANCE_CACHE_TTL,
  getCacheJSON,
  setCacheJSON,
} = require('./shared');

const accountService = {
  async getAccount(_service, userId) {
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
  },

  async getBalance(service, userId) {
    const cacheKey = `timebank:balance:${userId}`;
    const cached = await getCacheJSON(cacheKey);
    if (cached) {
      return cached;
    }

    const account = await service.getAccount(userId);
    const result = { balance: account.balance };

    await setCacheJSON(cacheKey, result, BALANCE_CACHE_TTL);
    return result;
  },
};

module.exports = accountService;

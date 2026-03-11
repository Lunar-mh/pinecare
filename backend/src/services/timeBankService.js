'use strict';

const accountService = require('./timeBank/accountService');
const serviceRecordService = require('./timeBank/serviceRecordService');
const exchangeService = require('./timeBank/exchangeService');

class TimeBankService {
  getAccount(userId) {
    return accountService.getAccount(this, userId);
  }

  getBalance(userId) {
    return accountService.getBalance(this, userId);
  }

  recordService(providerId, payload) {
    return serviceRecordService.recordService(this, providerId, payload);
  }

  confirmService(userId, payload) {
    return serviceRecordService.confirmService(this, userId, payload);
  }

  getServiceHistory(userId, type, page, pageSize) {
    return serviceRecordService.getServiceHistory(this, userId, type, page, pageSize);
  }

  createExchange(userId, payload) {
    return exchangeService.createExchange(this, userId, payload);
  }

  getExchangeHistory(userId) {
    return exchangeService.getExchangeHistory(this, userId);
  }

  getLeaderboard(communityId) {
    return exchangeService.getLeaderboard(this, communityId);
  }
}

module.exports = new TimeBankService();

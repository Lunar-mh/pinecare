'use strict';

const timeBankService = require('../services/timeBankService');
const { ok } = require('../utils/response');
const { sendControllerError } = require('../utils/controllerError');

function sendTimeBankError(res, error, action, defaultMessage) {
  return sendControllerError(res, error, {
    moduleName: 'timeBankController',
    action,
    defaultMessage,
  });
}

async function getAccount(req, res) {
  try {
    const data = await timeBankService.getAccount(req.user.userId);
    return ok(res, data, 'Time bank account loaded.');
  } catch (error) {
    return sendTimeBankError(res, error, 'get_account_failed', 'Failed to load time bank account.');
  }
}

async function getBalance(req, res) {
  try {
    const data = await timeBankService.getBalance(req.user.userId);
    return ok(res, data, 'Time bank balance loaded.');
  } catch (error) {
    return sendTimeBankError(res, error, 'get_balance_failed', 'Failed to load time bank balance.');
  }
}

async function recordService(req, res) {
  try {
    const data = await timeBankService.recordService(req.user.userId, req.body || {});
    return ok(res, data, 'Volunteer service recorded.');
  } catch (error) {
    return sendTimeBankError(res, error, 'record_service_failed', 'Failed to record volunteer service.');
  }
}

async function confirmService(req, res) {
  try {
    const data = await timeBankService.confirmService(req.user.userId, req.body || {});
    return ok(res, data, 'Time bank record settled.');
  } catch (error) {
    return sendTimeBankError(res, error, 'confirm_service_failed', 'Failed to settle time bank record.');
  }
}

async function getServiceHistory(req, res) {
  try {
    const { type, page, pageSize } = req.query;
    const data = await timeBankService.getServiceHistory(req.user.userId, type, page, pageSize);
    return ok(res, data, 'Time bank history loaded.');
  } catch (error) {
    return sendTimeBankError(res, error, 'get_history_failed', 'Failed to load time bank history.');
  }
}

async function createExchange(req, res) {
  try {
    const data = await timeBankService.createExchange(req.user.userId, req.body || {});
    return ok(res, data, 'Time bank exchange created.');
  } catch (error) {
    return sendTimeBankError(res, error, 'create_exchange_failed', 'Failed to create time bank exchange.');
  }
}

async function getExchangeHistory(req, res) {
  try {
    const data = await timeBankService.getExchangeHistory(req.user.userId);
    return ok(res, data, 'Exchange history loaded.');
  } catch (error) {
    return sendTimeBankError(res, error, 'get_exchange_history_failed', 'Failed to load exchange history.');
  }
}

async function getLeaderboard(req, res) {
  try {
    const { communityId } = req.query;
    const data = await timeBankService.getLeaderboard(communityId === undefined ? null : communityId);
    return ok(res, data, 'Time bank leaderboard loaded.');
  } catch (error) {
    return sendTimeBankError(res, error, 'get_leaderboard_failed', 'Failed to load time bank leaderboard.');
  }
}

module.exports = {
  getAccount,
  getBalance,
  recordService,
  confirmService,
  getServiceHistory,
  createExchange,
  getExchangeHistory,
  getLeaderboard,
};
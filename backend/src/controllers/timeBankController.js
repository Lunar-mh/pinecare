'use strict';

const timeBankService = require('../services/timeBankService');
const { ok, fail } = require('../utils/response');

/**
 * 统一业务错误输出
 * @param {object} res
 * @param {Error} err
 */
function handleError(res, err) {
  const code = err.statusCode || err.code || 500;
  const message = err.message || '服务器内部错误';
  return fail(res, code, message, null, code >= 100 && code < 600 ? code : 500);
}

/**
 * GET /time-bank/account
 */
async function getAccount(req, res) {
  try {
    const data = await timeBankService.getAccount(req.user.userId);
    return ok(res, data, 'success');
  } catch (err) {
    return handleError(res, err);
  }
}

/**
 * GET /time-bank/balance
 */
async function getBalance(req, res) {
  try {
    const data = await timeBankService.getBalance(req.user.userId);
    return ok(res, data, 'success');
  } catch (err) {
    return handleError(res, err);
  }
}

/**
 * POST /time-bank/service/record
 */
async function recordService(req, res) {
  try {
    const { recipientId, type, duration, startTime, endTime, locationHash } = req.body || {};

    if (!recipientId || !type) {
      return fail(res, 422, 'recipientId 和 type 为必填参数', null, 422);
    }

    if (!duration && !(startTime && endTime)) {
      return fail(res, 422, 'duration 或 startTime/endTime 至少提供一组', null, 422);
    }

    const data = await timeBankService.recordService(req.user.userId, {
      recipientId,
      type,
      duration,
      startTime,
      endTime,
      locationHash,
    });

    return ok(res, data, 'success');
  } catch (err) {
    return handleError(res, err);
  }
}

/**
 * POST /time-bank/service/confirm
 */
async function confirmService(req, res) {
  try {
    const { recordId, action, communityId } = req.body || {};

    if (!recordId || !action) {
      return fail(res, 422, 'recordId 和 action 为必填参数', null, 422);
    }

    if (!['confirm', 'cancel'].includes(action)) {
      return fail(res, 422, 'action 必须为 confirm 或 cancel', null, 422);
    }

    const data = await timeBankService.confirmService(req.user.userId, {
      recordId,
      action,
      communityId,
    });

    return ok(res, data, 'success');
  } catch (err) {
    return handleError(res, err);
  }
}

/**
 * GET /time-bank/service/history
 */
async function getServiceHistory(req, res) {
  try {
    const type = req.query.type || 'provided';
    const page = req.query.page || 1;
    const pageSize = req.query.pageSize || 10;

    if (!['provided', 'received'].includes(type)) {
      return fail(res, 422, 'type 仅支持 provided 或 received', null, 422);
    }

    const data = await timeBankService.getServiceHistory(req.user.userId, type, page, pageSize);
    return ok(res, data, 'success');
  } catch (err) {
    return handleError(res, err);
  }
}

/**
 * POST /time-bank/exchange
 */
async function createExchange(req, res) {
  try {
    const { exchangeType, itemName, coinsRequired, communityId } = req.body || {};
    const allowTypes = ['service', 'goods', 'medical', 'donation'];

    if (!exchangeType || !itemName || coinsRequired === undefined) {
      return fail(res, 422, 'exchangeType、itemName、coinsRequired 为必填参数', null, 422);
    }

    if (!allowTypes.includes(exchangeType)) {
      return fail(res, 422, 'exchangeType 非法', null, 422);
    }

    if (!Number.isInteger(Number(coinsRequired)) || Number(coinsRequired) <= 0) {
      return fail(res, 422, 'coinsRequired 必须为正整数', null, 422);
    }

    const data = await timeBankService.createExchange(req.user.userId, {
      exchangeType,
      itemName,
      coinsRequired: Number(coinsRequired),
      communityId,
    });

    return ok(res, data, 'success');
  } catch (err) {
    return handleError(res, err);
  }
}

/**
 * GET /time-bank/exchange/history
 */
async function getExchangeHistory(req, res) {
  try {
    const data = await timeBankService.getExchangeHistory(req.user.userId);
    return ok(res, data, 'success');
  } catch (err) {
    return handleError(res, err);
  }
}

/**
 * GET /time-bank/leaderboard
 */
async function getLeaderboard(req, res) {
  try {
    const { communityId } = req.query || {};

    if (communityId !== undefined && communityId !== '' && Number.isNaN(Number(communityId))) {
      return fail(res, 422, 'communityId 必须为数字', null, 422);
    }

    const parsedCommunityId =
      communityId === undefined || communityId === '' ? null : Number(communityId);

    const data = await timeBankService.getLeaderboard(parsedCommunityId);
    return ok(res, data, 'success');
  } catch (err) {
    return handleError(res, err);
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

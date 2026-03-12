'use strict';

const { fail } = require('../utils/response');
const { parseEnum, parsePagination, parsePositiveInt, requireString } = require('../utils/requestValidation');

const EXCHANGE_TYPES = ['service', 'goods', 'medical', 'donation'];
const HISTORY_TYPES = ['provided', 'received'];
const SETTLEMENT_ACTIONS = ['confirm', 'cancel'];

function validateRecordService(req, res, next) {
  const body = req.body || {};

  const recipientIdResult = parsePositiveInt(body.recipientId, 'recipientId');
  if (!recipientIdResult.ok) {
    return fail(res, 422, recipientIdResult.message, null, 422);
  }

  const typeResult = requireString(body.type, 'type', { maxLength: 64 });
  if (!typeResult.ok) {
    return fail(res, 422, typeResult.message, null, 422);
  }

  if (!body.duration && !(body.startTime && body.endTime)) {
    return fail(res, 422, 'duration or startTime/endTime is required.', null, 422);
  }

  req.body.recipientId = recipientIdResult.data;
  req.body.type = typeResult.data;
  if (body.locationHash !== undefined && body.locationHash !== null) {
    req.body.locationHash = String(body.locationHash).trim();
  }
  return next();
}

function validateConfirmService(req, res, next) {
  const body = req.body || {};

  const recordIdResult = parsePositiveInt(body.recordId, 'recordId');
  if (!recordIdResult.ok) {
    return fail(res, 422, recordIdResult.message, null, 422);
  }

  const actionResult = parseEnum(body.action, 'action', SETTLEMENT_ACTIONS);
  if (!actionResult.ok) {
    return fail(res, 422, actionResult.message, null, 422);
  }

  req.body.recordId = recordIdResult.data;
  req.body.action = actionResult.data;
  if (body.communityId !== undefined && body.communityId !== null && body.communityId !== '') {
    const communityIdResult = parsePositiveInt(body.communityId, 'communityId');
    if (!communityIdResult.ok) {
      return fail(res, 422, communityIdResult.message, null, 422);
    }
    req.body.communityId = communityIdResult.data;
  }

  return next();
}

function validateServiceHistoryQuery(req, res, next) {
  const paginationResult = parsePagination(req.query || {}, {
    defaultPage: 1,
    defaultPageSize: 10,
    maxPageSize: 100,
  });
  if (!paginationResult.ok) {
    return fail(res, 422, paginationResult.message, null, 422);
  }

  const typeResult = parseEnum((req.query || {}).type || 'provided', 'type', HISTORY_TYPES);
  if (!typeResult.ok) {
    return fail(res, 422, typeResult.message, null, 422);
  }

  req.query.type = typeResult.data;
  req.query.page = paginationResult.data.page;
  req.query.pageSize = paginationResult.data.pageSize;
  return next();
}

function validateExchangeCreate(req, res, next) {
  const body = req.body || {};

  const exchangeTypeResult = parseEnum(body.exchangeType, 'exchangeType', EXCHANGE_TYPES);
  if (!exchangeTypeResult.ok) {
    return fail(res, 422, exchangeTypeResult.message, null, 422);
  }

  const itemNameResult = requireString(body.itemName, 'itemName', { maxLength: 120 });
  if (!itemNameResult.ok) {
    return fail(res, 422, itemNameResult.message, null, 422);
  }

  const coinsRequiredResult = parsePositiveInt(body.coinsRequired, 'coinsRequired');
  if (!coinsRequiredResult.ok) {
    return fail(res, 422, coinsRequiredResult.message, null, 422);
  }

  req.body.exchangeType = exchangeTypeResult.data;
  req.body.itemName = itemNameResult.data;
  req.body.coinsRequired = coinsRequiredResult.data;

  if (body.communityId !== undefined && body.communityId !== null && body.communityId !== '') {
    const communityIdResult = parsePositiveInt(body.communityId, 'communityId');
    if (!communityIdResult.ok) {
      return fail(res, 422, communityIdResult.message, null, 422);
    }
    req.body.communityId = communityIdResult.data;
  }

  return next();
}

function validateLeaderboardQuery(req, res, next) {
  const rawCommunityId = req.query && req.query.communityId;
  if (rawCommunityId === undefined || rawCommunityId === null || rawCommunityId === '') {
    req.query.communityId = null;
    return next();
  }

  const communityIdResult = parsePositiveInt(rawCommunityId, 'communityId');
  if (!communityIdResult.ok) {
    return fail(res, 422, communityIdResult.message, null, 422);
  }

  req.query.communityId = communityIdResult.data;
  return next();
}

module.exports = {
  validateConfirmService,
  validateExchangeCreate,
  validateLeaderboardQuery,
  validateRecordService,
  validateServiceHistoryQuery,
};

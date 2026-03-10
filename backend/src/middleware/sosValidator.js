'use strict';

const { fail } = require('../utils/response');

const VALID_HISTORY_STATUS = ['triggered', 'confirmed', 'resolved', 'cancelled'];

function validateTrigger(req, res, next) {
  const body = req.body || {};
  const hasLatitude = body.latitude !== undefined;
  const hasLongitude = body.longitude !== undefined;

  if (hasLatitude !== hasLongitude) {
    return fail(res, 400, 'latitude 与 longitude 需要同时传入', null, 400);
  }

  if (hasLatitude && hasLongitude) {
    const latitude = Number(body.latitude);
    const longitude = Number(body.longitude);

    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      return fail(res, 400, 'latitude 必须在 -90 到 90 之间', null, 400);
    }

    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      return fail(res, 400, 'longitude 必须在 -180 到 180 之间', null, 400);
    }
  }

  return next();
}

function validateEventId(req, res, next) {
  const body = req.body || {};
  const eventId = Number(body.event_id);

  if (!Number.isInteger(eventId) || eventId <= 0) {
    return fail(res, 400, 'event_id 必须为正整数', null, 400);
  }

  req.body.event_id = eventId;
  return next();
}

function validateHistoryQuery(req, res, next) {
  const page = req.query.page !== undefined ? Number(req.query.page) : 1;
  const pageSize = req.query.page_size !== undefined ? Number(req.query.page_size) : 10;

  if (!Number.isInteger(page) || page <= 0) {
    return fail(res, 400, 'page 必须为正整数', null, 400);
  }

  if (!Number.isInteger(pageSize) || pageSize <= 0 || pageSize > 100) {
    return fail(res, 400, 'page_size 必须为 1 到 100 的整数', null, 400);
  }

  if (req.query.status !== undefined && req.query.status !== '' && !VALID_HISTORY_STATUS.includes(req.query.status)) {
    return fail(res, 400, 'status 参数非法', null, 400);
  }

  req.query.page = page;
  req.query.page_size = pageSize;
  return next();
}

module.exports = {
  validateTrigger,
  validateEventId,
  validateHistoryQuery,
};

'use strict';

const { fail } = require('../utils/response');
const { parseEnum, parseNumberInRange, parsePagination, parsePositiveInt } = require('../utils/requestValidation');

const VALID_HISTORY_STATUS = ['triggered', 'confirmed', 'resolved', 'cancelled'];

function validateTrigger(req, res, next) {
  const body = req.body || {};
  const hasLatitude = body.latitude !== undefined;
  const hasLongitude = body.longitude !== undefined;

  if (hasLatitude !== hasLongitude) {
    return fail(res, 400, 'latitude and longitude must be provided together.', null, 400);
  }

  if (!hasLatitude) {
    return next();
  }

  const latitudeResult = parseNumberInRange(body.latitude, 'latitude', -90, 90);
  if (!latitudeResult.ok) {
    return fail(res, 400, latitudeResult.message, null, 400);
  }

  const longitudeResult = parseNumberInRange(body.longitude, 'longitude', -180, 180);
  if (!longitudeResult.ok) {
    return fail(res, 400, longitudeResult.message, null, 400);
  }

  req.body.latitude = latitudeResult.data;
  req.body.longitude = longitudeResult.data;
  return next();
}

function validateEventId(req, res, next) {
  const eventIdResult = parsePositiveInt(req.body && req.body.event_id, 'event_id');
  if (!eventIdResult.ok) {
    return fail(res, 400, eventIdResult.message, null, 400);
  }

  req.body.event_id = eventIdResult.data;
  return next();
}

function validateEventIdParam(req, res, next) {
  const eventIdResult = parsePositiveInt(req.params && req.params.eventId, 'eventId');
  if (!eventIdResult.ok) {
    return fail(res, 400, eventIdResult.message, null, 400);
  }

  req.params.eventId = String(eventIdResult.data);
  return next();
}

function validateHistoryQuery(req, res, next) {
  const paginationResult = parsePagination(req.query || {}, { defaultPage: 1, defaultPageSize: 10, maxPageSize: 100 });
  if (!paginationResult.ok) {
    return fail(res, 400, paginationResult.message, null, 400);
  }

  if (req.query.status !== undefined && String(req.query.status).trim() !== '') {
    const statusResult = parseEnum(req.query.status, 'status', VALID_HISTORY_STATUS);
    if (!statusResult.ok) {
      return fail(res, 400, statusResult.message, null, 400);
    }
    req.query.status = statusResult.data;
  }

  req.query.page = paginationResult.data.page;
  req.query.page_size = paginationResult.data.pageSize;
  return next();
}

module.exports = {
  validateTrigger,
  validateEventId,
  validateEventIdParam,
  validateHistoryQuery,
};

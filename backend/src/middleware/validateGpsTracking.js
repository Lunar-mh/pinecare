'use strict';

const { fail } = require('../utils/response');
const {
  parseDateString,
  parseEnum,
  parseNumberInRange,
  parsePositiveInt,
} = require('../utils/requestValidation');

const LOCATION_TYPES = ['gps', 'wifi', 'smart_band', 'cell_tower'];

function validateUpload(req, res, next) {
  const body = req.body || {};
  const latitudeResult = parseNumberInRange(body.latitude, 'latitude', -90, 90);
  if (!latitudeResult.ok) {
    return fail(res, 400, latitudeResult.message, null, 400);
  }

  const longitudeResult = parseNumberInRange(body.longitude, 'longitude', -180, 180);
  if (!longitudeResult.ok) {
    return fail(res, 400, longitudeResult.message, null, 400);
  }

  const accuracyResult = parseNumberInRange(body.accuracy, 'accuracy', 0, Number.MAX_SAFE_INTEGER, {
    required: false,
  });
  if (!accuracyResult.ok) {
    return fail(res, 400, accuracyResult.message, null, 400);
  }

  const locationTypeResult = parseEnum(body.locationType, 'locationType', LOCATION_TYPES, {
    required: false,
  });
  if (!locationTypeResult.ok) {
    return fail(res, 400, locationTypeResult.message, null, 400);
  }

  req.body.latitude = latitudeResult.data;
  req.body.longitude = longitudeResult.data;
  if (accuracyResult.data !== null) {
    req.body.accuracy = accuracyResult.data;
  }
  if (locationTypeResult.data) {
    req.body.locationType = locationTypeResult.data;
  }

  return next();
}

function validateTrailQuery(req, res, next) {
  const startDateResult = parseDateString(req.query.startDate, 'startDate');
  if (!startDateResult.ok) {
    return fail(res, 400, startDateResult.message, null, 400);
  }

  const endDateResult = parseDateString(req.query.endDate, 'endDate');
  if (!endDateResult.ok) {
    return fail(res, 400, endDateResult.message, null, 400);
  }

  const limitResult = parsePositiveInt(req.query.limit, 'limit', { required: false });
  if (!limitResult.ok) {
    return fail(res, 400, limitResult.message, null, 400);
  }

  req.query.startDate = startDateResult.data;
  req.query.endDate = endDateResult.data;
  if (limitResult.data !== null) {
    req.query.limit = limitResult.data;
  }

  return next();
}

function validateFenceId(req, res, next) {
  const fenceIdResult = parsePositiveInt(req.params.fenceId, 'fenceId');
  if (!fenceIdResult.ok) {
    return fail(res, 400, fenceIdResult.message, null, 400);
  }

  req.params.fenceId = String(fenceIdResult.data);
  return next();
}

module.exports = {
  validateFenceId,
  validateTrailQuery,
  validateUpload,
};

'use strict';

const { fail } = require('../utils/response');
const { parsePositiveInt, requireString } = require('../utils/requestValidation');

function validateTrendQuery(req, res, next) {
  const metricTypeResult = requireString(req.query.metric_type, 'metric_type', { maxLength: 50 });
  if (!metricTypeResult.ok) {
    return fail(res, 400, metricTypeResult.message, null, 400);
  }

  const periodResult = requireString(req.query.period, 'period', { maxLength: 20 });
  if (!periodResult.ok) {
    return fail(res, 400, periodResult.message, null, 400);
  }

  req.query.metric_type = metricTypeResult.data;
  req.query.period = periodResult.data;
  return next();
}

function validateSyncPayload(req, res, next) {
  const body = req.body || {};
  if (!Array.isArray(body.records) || body.records.length === 0) {
    return fail(res, 400, 'records must be a non-empty array.', null, 400);
  }

  if (body.device_id !== undefined || body.deviceId !== undefined) {
    const deviceResult = parsePositiveInt(
      body.device_id !== undefined ? body.device_id : body.deviceId,
      'device_id'
    );
    if (!deviceResult.ok) {
      return fail(res, 400, deviceResult.message, null, 400);
    }
  }

  return next();
}

function validateManualPayload(req, res, next) {
  const body = req.body || {};
  const metricTypeResult = requireString(body.metric_type || body.metricType, 'metric_type', {
    maxLength: 50,
  });
  if (!metricTypeResult.ok) {
    return fail(res, 400, metricTypeResult.message, null, 400);
  }

  if (body.value === undefined || body.value === null || body.value === '') {
    return fail(res, 400, 'value is required.', null, 400);
  }

  if (body.device_id !== undefined || body.deviceId !== undefined) {
    const deviceResult = parsePositiveInt(
      body.device_id !== undefined ? body.device_id : body.deviceId,
      'device_id'
    );
    if (!deviceResult.ok) {
      return fail(res, 400, deviceResult.message, null, 400);
    }
  }

  return next();
}

module.exports = {
  validateManualPayload,
  validateSyncPayload,
  validateTrendQuery,
};

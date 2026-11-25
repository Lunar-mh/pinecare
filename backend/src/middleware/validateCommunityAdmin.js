'use strict';

const { fail } = require('../utils/response');

const ORDER_STATUS = ['pending', 'assigned', 'processing', 'completed', 'cancelled'];
const ADMIN_ROLE = ['admin', 'leader', 'volunteer'];
const COMMUNITY_ORDER_STATUS = ['cancelled', 'completed'];
const MEDICATION_LOG_STATUS = ['pending', 'taken', 'skipped', 'missed'];
const SOS_EVENT_STATUS = ['triggered', 'confirmed', 'resolved', 'cancelled'];
const SOS_UPDATE_STATUS = ['confirmed', 'resolved', 'cancelled'];
const FALL_EVENT_STATUS = ['detecting', 'confirmed', 'cancelled', 'false_alarm'];
const MAX_PAGE_SIZE = 100;

const err = (message, code = 400, status = 400) => ({ message, code, status });
const send = (res, error) => fail(res, error.code, error.message, null, error.status);
const int = (value) => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
};
const dateMs = (value) => {
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
};

function validatePagination(query = {}) {
  if (query.page !== undefined && int(query.page) === null) {
    return err('page must be a positive integer.');
  }
  const pageSize = query.pageSize !== undefined ? query.pageSize : query.page_size;
  if (pageSize === undefined) {
    return null;
  }
  const size = int(pageSize);
  return size && size <= MAX_PAGE_SIZE
    ? null
    : err(`page_size/pageSize must be in 1-${MAX_PAGE_SIZE}.`);
}

function validateCommunityScope(req) {
  const query = req.query || {};
  const body = req.body || {};
  const rawId = query.community_id !== undefined ? query.community_id : body.community_id;
  if (rawId === undefined || rawId === null || rawId === '') {
    return null;
  }
  const communityId = int(rawId);
  if (communityId === null) {
    return err('community_id must be a positive integer.');
  }
  if (req.adminScope && req.adminScope.isGlobalAdmin === true) {
    req.adminScope.communityId = communityId;
    return null;
  }
  return Number(req.adminScope && req.adminScope.communityId) === communityId
    ? null
    : err('Forbidden.', 403, 403);
}

const enumCheck = (source, field, values, message) => (req) => {
  const value = (req[source] || {})[field];
  return value !== undefined && !values.includes(value) ? err(message) : null;
};
const intCheck = (source, field, message, optional = false) => (req) => {
  const value = (req[source] || {})[field];
  return optional && (value === undefined || value === null)
    ? null
    : int(value) === null
      ? err(message)
      : null;
};
const dateCheck = (source, field, message, required = false) => (req) => {
  const value = (req[source] || {})[field];
  return !value ? (required ? err(message) : null) : dateMs(value) === null ? err(message) : null;
};
const limitCheck = (max, message) => (req) => {
  const { limit } = req.query || {};
  return limit === undefined || (int(limit) && int(limit) <= max) ? null : err(message);
};
const requiredText = (source, field) => (req) => {
  const value = (req[source] || {})[field];
  return typeof value === 'string' && value.trim() ? null : err(`${field} is required.`);
};
const reasonCheck = (req) => {
  const { reason } = req.body || {};
  return reason !== undefined && typeof reason !== 'string' ? err('reason must be a string.') : null;
};
const statusBodyCheck = (values, message) => (req) => {
  const { status } = req.body || {};
  return status && values.includes(status) ? null : err(message);
};
const idCheck = (name) => (req) => {
  const value = int((req.params || {})[name]);
  if (value === null) {
    return err(`${name} must be a positive integer.`);
  }
  req.params[name] = String(value);
  return null;
};
function chain(...checks) {
  return (req, res, next) => {
    for (const check of checks) {
      const error = check(req);
      if (error) return send(res, error);
    }
    return next();
  };
}

const pageCheck = (req) => validatePagination(req.query || {});
const scopeCheck = (req) => validateCommunityScope(req);
const pageAndScope = [pageCheck, scopeCheck];

const validateVolunteerQuery = chain(
  ...pageAndScope,
  enumCheck('query', 'role', ADMIN_ROLE, 'Invalid role.')
);
const validateOrderId = chain(idCheck('orderId'));
const validateOrderQuery = chain(
  pageCheck,
  enumCheck('query', 'status', ORDER_STATUS, 'status is invalid.'),
  scopeCheck
);
const validateCreateOrder = chain(
  requiredText('body', 'service_type'),
  intCheck('body', 'elder_id', 'elder_id must be a positive integer.'),
  intCheck('body', 'volunteer_id', 'volunteer_id must be a positive integer.', true),
  enumCheck('body', 'status', ORDER_STATUS, 'status is invalid.'),
  scopeCheck
);
const validateAssignOrder = chain(
  intCheck('body', 'volunteer_id', 'volunteer_id must be a positive integer.'),
  dateCheck('body', 'scheduled_at', 'Invalid scheduled_at.')
);
const validateUpdateOrderStatus = chain(
  statusBodyCheck(
    COMMUNITY_ORDER_STATUS,
    `status must be one of: ${COMMUNITY_ORDER_STATUS.join(', ')}.`
  ),
  reasonCheck
);
const validateStatsQuery = chain(
  dateCheck('query', 'start_date', 'Invalid start_date.'),
  dateCheck('query', 'end_date', 'Invalid end_date.'),
  (req) => {
    const { start_date, end_date } = req.query || {};
    return start_date && end_date && dateMs(start_date) > dateMs(end_date)
      ? err('start_date cannot be later than end_date.')
      : null;
  },
  scopeCheck
);
const validateHealthOverviewQuery = chain(...pageAndScope);
const validateMedicationLogsQuery = chain(
  pageCheck,
  enumCheck('query', 'status', MEDICATION_LOG_STATUS, 'status is invalid.'),
  dateCheck('query', 'startDate', 'startDate is invalid.'),
  dateCheck('query', 'endDate', 'endDate is invalid.'),
  scopeCheck
);
const validateMedicationLogId = chain(idCheck('logId'));
const validateMedicationLogStatus = chain(
  statusBodyCheck(MEDICATION_LOG_STATUS, 'status must be one of: pending, taken, skipped, missed.')
);
const validateGpsCurrentQuery = chain(...pageAndScope);
const validateGpsTrailQuery = chain(
  intCheck('query', 'userId', 'userId must be a positive integer.'),
  dateCheck('query', 'startDate', 'startDate is invalid.', true),
  dateCheck('query', 'endDate', 'endDate is invalid.', true),
  (req) =>
    dateMs(req.query.endDate) < dateMs(req.query.startDate)
      ? err('endDate must be >= startDate.')
      : null,
  limitCheck(5000, 'limit must be in 1-5000.'),
  scopeCheck
);
const validateFamilyBindingsQuery = chain(...pageAndScope);
const validateSosEventQuery = chain(
  pageCheck,
  enumCheck('query', 'status', SOS_EVENT_STATUS, 'status is invalid.'),
  scopeCheck
);
const validateSosEventId = chain(idCheck('eventId'));
const validateUpdateSosEventStatus = chain(
  statusBodyCheck(SOS_UPDATE_STATUS, 'status must be one of: confirmed, resolved, cancelled.'),
  reasonCheck
);
const validateFallEventsQuery = chain(
  pageCheck,
  enumCheck('query', 'status', FALL_EVENT_STATUS, 'status is invalid.'),
  scopeCheck
);

module.exports = {
  validateVolunteerQuery,
  validateOrderQuery,
  validateOrderId,
  validateCreateOrder,
  validateAssignOrder,
  validateUpdateOrderStatus,
  validateStatsQuery,
  validateHealthOverviewQuery,
  validateMedicationLogsQuery,
  validateMedicationLogId,
  validateMedicationLogStatus,
  validateGpsCurrentQuery,
  validateGpsTrailQuery,
  validateFamilyBindingsQuery,
  validateSosEventQuery,
  validateSosEventId,
  validateUpdateSosEventStatus,
  validateFallEventsQuery,
};

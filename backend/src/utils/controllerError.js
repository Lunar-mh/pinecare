'use strict';

const logger = require('./logger');
const { fail } = require('./response');

function sendControllerError(res, err, options = {}) {
  const defaultCode = Number(options.defaultCode || 500);
  const defaultStatus = Number(options.defaultStatus || defaultCode || 500);
  const defaultMessage = options.defaultMessage || 'Internal server error.';
  const includeData = options.includeData !== false;
  const moduleName = options.moduleName || 'controller';
  const action = options.action || 'request_failed';
  const preferErrorMessage = options.preferErrorMessage === true;

  logger.error(moduleName, action, {
    coded: Boolean(err && (err.code || err.statusCode)),
    code: err && (err.code || err.statusCode) ? Number(err.code || err.statusCode) : defaultCode,
    message: err && err.message ? err.message : defaultMessage,
  });

  if (err && (err.code || err.statusCode)) {
    const code = Number(err.code || err.statusCode || defaultCode);
    const status = Number(err.statusCode || err.code || defaultStatus);
    const message = err.message || options.codedMessage || defaultMessage;
    const data = includeData && Object.prototype.hasOwnProperty.call(err, 'data') ? err.data : null;
    return fail(res, code, message, data, status);
  }

  const message = preferErrorMessage && err && err.message ? err.message : defaultMessage;
  return fail(res, defaultCode, message, null, defaultStatus);
}

module.exports = {
  sendControllerError,
};

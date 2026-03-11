'use strict';

const { fail } = require('./response');

function sendControllerError(res, err, options = {}) {
  const defaultCode = Number(options.defaultCode || 500);
  const defaultStatus = Number(options.defaultStatus || defaultCode || 500);
  const defaultMessage = options.defaultMessage || 'Internal server error.';
  const includeData = options.includeData !== false;

  if (err && (err.code || err.statusCode)) {
    const code = Number(err.code || err.statusCode || defaultCode);
    const status = Number(err.statusCode || err.code || defaultStatus);
    const message = err.message || options.codedMessage || defaultMessage;
    const data = includeData && Object.prototype.hasOwnProperty.call(err, 'data') ? err.data : null;
    return fail(res, code, message, data, status);
  }

  return fail(res, defaultCode, defaultMessage, null, defaultStatus);
}

module.exports = {
  sendControllerError,
};

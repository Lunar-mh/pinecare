'use strict';

function createBizError(code, message, statusCode = code, data = null) {
  const err = new Error(message);
  err.code = code;
  err.statusCode = statusCode;
  if (data !== null && data !== undefined) {
    err.data = data;
  }
  return err;
}

function createBizErrorFromMessage(message, code = 400, statusCode = code, data = null) {
  return createBizError(code, message, statusCode, data);
}

module.exports = {
  createBizError,
  createBizErrorFromMessage,
};

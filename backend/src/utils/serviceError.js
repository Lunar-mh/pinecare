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

function createBusinessError(code, message, arg3 = null, arg4 = null) {
  let data = null;
  let statusCode = code;

  if (typeof arg3 === 'number') {
    statusCode = arg3;
    data = arg4;
  } else {
    data = arg3;
    statusCode = typeof arg4 === 'number' ? arg4 : code;
  }

  return createBizError(code, message, statusCode, data);
}

module.exports = {
  createBizError,
  createBizErrorFromMessage,
  createBusinessError,
};

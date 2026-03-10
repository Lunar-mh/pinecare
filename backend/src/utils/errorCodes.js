'use strict';

const SOS_ERROR_CODES = {
  PARAM_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  EVENT_NOT_FOUND: 404,
  CANCEL_TIMEOUT: 408,
  INVALID_STATUS: 409,
  ILLEGAL_TRANSITION: 409,
  NOTIFICATION_ERROR: 502,
  INTERNAL_ERROR: 500,
};

const SOS_ERROR_MESSAGES = {
  PARAM_ERROR: '请求参数不合法',
  UNAUTHORIZED: '用户未认证',
  FORBIDDEN: '无权操作该 SOS 事件',
  EVENT_NOT_FOUND: 'SOS 事件不存在',
  CANCEL_TIMEOUT: '取消窗口已超时',
  INVALID_STATUS: '当前状态不允许该操作',
  ILLEGAL_TRANSITION: 'SOS 状态流转不合法',
  NOTIFICATION_ERROR: '通知服务暂时不可用',
  INTERNAL_ERROR: '服务器内部错误',
};

function createSosError(code, message, data = null, statusCode = null) {
  const err = new Error(message);
  err.code = code;
  err.statusCode = statusCode || (code >= 400 && code < 600 ? code : 400);
  err.data = data;
  return err;
}

module.exports = {
  SOS_ERROR_CODES,
  SOS_ERROR_MESSAGES,
  createSosError,
};

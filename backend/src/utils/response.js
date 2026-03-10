'use strict';

/**
 * 统一响应工具
 * 强制 {code, message, data} 输出格式
 */

/**
 * 成功响应
 * @param {object} res - Express response 对象
 * @param {any} data - 响应数据
 * @param {string} message - 响应消息
 */
const ok = (res, data = null, message = 'ok') => {
  return res.json({ code: 0, message, data });
};

/**
 * 失败响应
 * @param {object} res - Express response 对象
 * @param {number} code - 业务错误码
 * @param {string} message - 错误消息
 * @param {any} data - 附加数据
 * @param {number} httpStatus - HTTP 状态码（默认400）
 */
const fail = (res, code, message, data = null, httpStatus = null) => {
  const status = httpStatus || (code >= 400 && code < 600 ? code : 400);
  return res.status(status).json({ code, message, data });
};

module.exports = { ok, fail };

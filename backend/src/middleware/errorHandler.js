'use strict';

/**
 * 全局错误处理中间件（4 参数，必须放在所有路由之后）
 * 统一响应格式: { code, message, data }
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error('全局错误:', err);

  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || '服务器内部错误';

  const response = {
    code: statusCode,
    message,
    data: null,
  };

  // 开发环境附带堆栈信息
  if (process.env.NODE_ENV !== 'production') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

module.exports = errorHandler;

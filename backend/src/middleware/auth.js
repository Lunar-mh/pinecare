'use strict';

const jwt = require('jsonwebtoken');

/**
 * JWT 认证中间件
 * 从 Authorization: Bearer <token> 提取并验证令牌
 * 验证成功后将 { userId } 注入 req.user
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      code: 401,
      message: '未提供认证令牌',
      data: null,
    });
  }

  const token = authHeader.slice(7); // 去掉 "Bearer " 前缀

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    req.user = { userId: decoded.userId };
    next();
  } catch (err) {
    return res.status(401).json({
      code: 401,
      message: '认证令牌无效或已过期',
      data: null,
    });
  }
}

module.exports = authMiddleware;

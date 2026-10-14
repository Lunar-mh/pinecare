'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const adminUserController = require('../controllers/adminUserController');

const router = express.Router();

// Admin用户操作限流 - 防止批量创建/修改攻击
const adminMutationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1分钟
  max: 10, // 最多10次写操作
  message: { code: 429, message: '操作过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Admin查询限流 - 防止数据爬取
const adminQueryLimiter = rateLimit({
  windowMs: 60 * 1000, // 1分钟
  max: 60, // 最多60次查询
  message: { code: 429, message: '请求过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(auth, adminAuth);

// 查询路由
router.get('/', adminQueryLimiter, adminUserController.list);
router.get('/:userId', adminQueryLimiter, adminUserController.detail);

// 写操作路由 - 使用更严格的限流
router.post('/', adminMutationLimiter, adminUserController.create);
router.put('/:userId/status', adminMutationLimiter, adminUserController.updateStatus);

module.exports = router;

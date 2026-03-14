'use strict';

const express = require('express');
const auth = require('../middleware/auth');
const { createRateLimiter } = require('../middleware/rateLimiter');
const {
  sendChat,
  getHistory,
  clearHistory,
  voiceConsult,
  getProfile,
  updateProfile,
} = require('../controllers/aiConsultController');

const router = express.Router();

// AI 接口限流：30次/分钟/用户
const aiRateLimiter = createRateLimiter({ max: 30, windowSeconds: 60, keyPrefix: 'ratelimit:ai' });

// US1: 文字健康咨询
router.post('/chat', auth, aiRateLimiter, sendChat);

// US1: 查询咨询历史
router.get('/history', auth, getHistory);
router.post('/history/clear', auth, clearHistory);

// US2: 语音健康咨询
router.post('/voice', auth, aiRateLimiter, voiceConsult);

// US3: 查询健康画像
router.get('/profile', auth, getProfile);

// US3: 更新健康画像
router.put('/profile', auth, updateProfile);

module.exports = router;

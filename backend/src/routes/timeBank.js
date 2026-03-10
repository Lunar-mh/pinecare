'use strict';

const express = require('express');
const auth = require('../middleware/auth');
const {
  getAccount,
  getBalance,
  recordService,
  confirmService,
  getServiceHistory,
  createExchange,
  getExchangeHistory,
  getLeaderboard,
} = require('../controllers/timeBankController');

const router = express.Router();

// 账户相关
router.get('/account', auth, getAccount);
router.get('/balance', auth, getBalance);

// 服务记录
router.post('/service/record', auth, recordService);
router.post('/service/confirm', auth, confirmService);
router.get('/service/history', auth, getServiceHistory);

// 兑换
router.post('/exchange', auth, createExchange);
router.get('/exchange/history', auth, getExchangeHistory);

// 排行榜
router.get('/leaderboard', auth, getLeaderboard);

module.exports = router;

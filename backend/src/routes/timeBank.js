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
const {
  validateConfirmService,
  validateExchangeCreate,
  validateLeaderboardQuery,
  validateRecordService,
  validateServiceHistoryQuery,
} = require('../middleware/validateTimeBank');

const router = express.Router();

router.get('/account', auth, getAccount);
router.get('/balance', auth, getBalance);

router.post('/service/record', auth, validateRecordService, recordService);
router.post('/service/confirm', auth, validateConfirmService, confirmService);
router.get('/service/history', auth, validateServiceHistoryQuery, getServiceHistory);

router.post('/exchange', auth, validateExchangeCreate, createExchange);
router.get('/exchange/history', auth, getExchangeHistory);

router.get('/leaderboard', auth, validateLeaderboardQuery, getLeaderboard);

module.exports = router;

'use strict';

const express = require('express');
const auth = require('../middleware/auth');
const { createRateLimiter } = require('../middleware/rateLimiter');
const fallService = require('../services/fallService');
const {
  report,
  cancel,
  history,
  getSettings,
  updateSettings,
} = require('../controllers/fallController');

const router = express.Router();

const writeLimiter = createRateLimiter({
  max: 20,
  windowSeconds: 60,
  keyPrefix: 'ratelimit:fall-write',
});

if (process.env.NODE_ENV !== 'test' && !global.__fallWorkerInitialized) {
  fallService.startCountdownWorker();

  const shutdown = () => {
    fallService.stopCountdownWorker();
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
  global.__fallWorkerInitialized = true;
}

router.post('/report', auth, writeLimiter, report);
router.post('/cancel', auth, writeLimiter, cancel);
router.get('/history', auth, history);
router.get('/settings', auth, getSettings);
router.put('/settings', auth, updateSettings);

module.exports = router;

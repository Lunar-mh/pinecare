'use strict';

const express = require('express');
const auth = require('../middleware/auth');
const sosController = require('../controllers/sosController');
const { createRateLimiter } = require('../middleware/rateLimiter');
const { validateTrigger, validateEventId, validateEventIdParam, validateHistoryQuery } = require('../middleware/sosValidator');

const router = express.Router();
const sosMutationLimiter = createRateLimiter({ max: 8, windowSeconds: 60, keyPrefix: 'sos-action' });
const sosHistoryLimiter = createRateLimiter({ max: 30, windowSeconds: 60, keyPrefix: 'sos-history' });

router.post('/trigger', auth, sosMutationLimiter, validateTrigger, sosController.trigger);
router.post('/cancel', auth, sosMutationLimiter, validateEventId, sosController.cancel);
router.get('/history', auth, sosHistoryLimiter, validateHistoryQuery, sosController.history);
router.get('/events/:eventId', auth, sosHistoryLimiter, validateEventIdParam, sosController.detail);
router.post('/confirm', auth, sosMutationLimiter, validateEventId, sosController.confirm);
router.post('/resolve', auth, sosMutationLimiter, validateEventId, sosController.resolve);

module.exports = router;

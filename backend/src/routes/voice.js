'use strict';

const express = require('express');
const auth = require('../middleware/auth');
const { createRateLimiter } = require('../middleware/rateLimiter');
const voiceController = require('../controllers/voiceController');
const {
  validateRecognize,
  validateSynthesize,
  validatePagination,
  validateSessionId,
} = require('../middleware/voiceValidators');

const router = express.Router();
const voiceWriteLimiter = createRateLimiter({ max: 12, windowSeconds: 60, keyPrefix: 'voice-write' });
const voiceReadLimiter = createRateLimiter({ max: 40, windowSeconds: 60, keyPrefix: 'voice-read' });

router.use(auth);

router.post('/recognize', voiceWriteLimiter, validateRecognize, voiceController.recognize);
router.post('/synthesize', voiceWriteLimiter, validateSynthesize, voiceController.synthesize);
router.get('/sessions', voiceReadLimiter, validatePagination, voiceController.getSessions);
router.get(
  '/sessions/:sessionId/logs',
  voiceReadLimiter,
  validateSessionId,
  validatePagination,
  voiceController.getSessionLogs
);

module.exports = router;

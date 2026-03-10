'use strict';

const express = require('express');
const auth = require('../middleware/auth');
const voiceController = require('../controllers/voiceController');
const {
  validateRecognize,
  validateSynthesize,
  validatePagination,
  validateSessionId,
} = require('../middleware/voiceValidators');

const router = express.Router();

router.use(auth);

router.post('/recognize', validateRecognize, voiceController.recognize);
router.post('/synthesize', validateSynthesize, voiceController.synthesize);
router.get('/sessions', validatePagination, voiceController.getSessions);
router.get('/sessions/:sessionId/logs', validateSessionId, validatePagination, voiceController.getSessionLogs);

module.exports = router;

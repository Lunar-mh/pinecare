'use strict';

const express = require('express');
const auth = require('../middleware/auth');
const sosController = require('../controllers/sosController');
const { validateTrigger, validateEventId, validateHistoryQuery } = require('../middleware/sosValidator');

const router = express.Router();

router.post('/trigger', auth, validateTrigger, sosController.trigger);
router.post('/cancel', auth, validateEventId, sosController.cancel);
router.get('/history', auth, validateHistoryQuery, sosController.history);
router.post('/confirm', auth, validateEventId, sosController.confirm);
router.post('/resolve', auth, validateEventId, sosController.resolve);

module.exports = router;

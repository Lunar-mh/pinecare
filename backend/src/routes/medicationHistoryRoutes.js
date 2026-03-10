'use strict';

const express = require('express');
const auth = require('../middleware/auth');
const medicationHistoryController = require('../controllers/medicationHistoryController');
const { validateHistoryCalendarMonth } = require('../middleware/validators/historyCalendarValidator');

const router = express.Router();

router.get('/calendar', auth, validateHistoryCalendarMonth, medicationHistoryController.calendar);

module.exports = router;

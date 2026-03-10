'use strict';

const express = require('express');
const auth = require('../middleware/auth');
const medicationLogController = require('../controllers/medicationLogController');

const router = express.Router();

router.get('/logs', auth, medicationLogController.list);
router.post('/confirm', auth, medicationLogController.confirm);

module.exports = router;

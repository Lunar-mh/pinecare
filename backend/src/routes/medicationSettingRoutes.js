'use strict';

const express = require('express');
const auth = require('../middleware/auth');
const medicationSettingController = require('../controllers/medicationSettingController');

const router = express.Router();

router.get('/', auth, medicationSettingController.getSettings);
router.put('/', auth, medicationSettingController.updateSettings);

module.exports = router;

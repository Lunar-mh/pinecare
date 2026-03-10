'use strict';

const express = require('express');
const medicationPlanRoutes = require('./medicationPlanRoutes');
const medicationLogRoutes = require('./medicationLogRoutes');
const medicationHistoryRoutes = require('./medicationHistoryRoutes');
const medicationSettingRoutes = require('./medicationSettingRoutes');

const router = express.Router();

router.use('/plans', medicationPlanRoutes);
router.use('/', medicationLogRoutes);
router.use('/history', medicationHistoryRoutes);
router.use('/settings', medicationSettingRoutes);

module.exports = router;

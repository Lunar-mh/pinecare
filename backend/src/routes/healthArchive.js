'use strict';

const express = require('express');
const auth = require('../middleware/auth');
const familyAccess = require('../middleware/familyAccess');
const healthController = require('../controllers/healthController');
const deviceController = require('../controllers/deviceController');

const router = express.Router();

// 健康档案查询与录入接口
router.get('/today', auth, familyAccess, healthController.today);
router.get('/trend', auth, familyAccess, healthController.trend);
router.get('/blood-pressure/latest', auth, familyAccess, healthController.latestBloodPressure);
router.get('/heart-rate/latest', auth, familyAccess, healthController.latestHeartRate);
router.post('/sync', auth, healthController.sync);
router.post('/manual', auth, healthController.manual);
// 设备管理接口
router.post('/device/bind', auth, deviceController.bind);
router.post('/device/unbind', auth, deviceController.unbind);
router.get('/device/list', auth, deviceController.list);
router.post('/device/set-primary', auth, deviceController.setPrimary);

module.exports = router;

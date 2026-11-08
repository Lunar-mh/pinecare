'use strict';

const express = require('express');
const auth = require('../middleware/auth');
const familyAccess = require('../middleware/familyAccess');
const healthController = require('../controllers/healthController');
const deviceController = require('../controllers/deviceController');
const { deprecatedRoute } = require('../utils/deprecation');
const {
  validateManualPayload,
  validateSyncPayload,
  validateTrendQuery,
} = require('../middleware/validateHealthArchive');

const router = express.Router();

router.use((req, res, next) => {
  if (req.baseUrl && String(req.baseUrl).includes('health-archive')) {
    return deprecatedRoute((innerReq) => {
      if (innerReq.path.startsWith('/device/') || innerReq.path.startsWith('/devices')) {
        return innerReq.path;
      }
      return `/health${innerReq.path}`;
    })(req, res, next);
  }
  next();
});

router.get('/today', auth, familyAccess, healthController.today);
router.get('/trend', auth, familyAccess, validateTrendQuery, healthController.trend);
router.get('/blood-pressure/latest', auth, familyAccess, healthController.latestBloodPressure);
router.get('/heart-rate/latest', auth, familyAccess, healthController.latestHeartRate);
router.put('/alerts/:id/dismiss', auth, healthController.dismissAlert);
router.post('/sync', auth, validateSyncPayload, healthController.sync);
router.post('/manual', auth, validateManualPayload, healthController.manual);

// 硬件设备绑定规范收拢接口 (/health/devices/*)
router.get('/devices', auth, deviceController.list);
router.get('/devices/list', auth, deviceController.list);
router.post('/devices/bind', auth, deviceController.bind);
router.post('/devices/unbind', auth, deviceController.unbind);
router.post('/devices/set-primary', auth, deviceController.setPrimary);

// 兼容历史老路径
router.post('/device/bind', auth, deviceController.bind);
router.post('/device/unbind', auth, deviceController.unbind);
router.get('/device/list', auth, deviceController.list);
router.post('/device/set-primary', auth, deviceController.setPrimary);

module.exports = router;

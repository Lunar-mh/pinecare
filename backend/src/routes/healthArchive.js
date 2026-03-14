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

router.use(
  deprecatedRoute((req) => {
    if (req.path.startsWith('/device/')) {
      return req.path;
    }
    return `/health${req.path}`;
  })
);

router.get('/today', auth, familyAccess, healthController.today);
router.get('/trend', auth, familyAccess, validateTrendQuery, healthController.trend);
router.get('/blood-pressure/latest', auth, familyAccess, healthController.latestBloodPressure);
router.get('/heart-rate/latest', auth, familyAccess, healthController.latestHeartRate);
router.put('/alerts/:id/dismiss', auth, healthController.dismissAlert);
router.post('/sync', auth, validateSyncPayload, healthController.sync);
router.post('/manual', auth, validateManualPayload, healthController.manual);

router.post('/device/bind', auth, deviceController.bind);
router.post('/device/unbind', auth, deviceController.unbind);
router.get('/device/list', auth, deviceController.list);
router.post('/device/set-primary', auth, deviceController.setPrimary);

module.exports = router;

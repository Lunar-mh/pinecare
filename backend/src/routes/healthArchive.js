'use strict';

const express = require('express');
const auth = require('../middleware/auth');
const familyAccess = require('../middleware/familyAccess');
const healthController = require('../controllers/healthController');
const deviceController = require('../controllers/deviceController');
const { deprecatedRoute } = require('../utils/deprecation');

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
router.get('/trend', auth, familyAccess, healthController.trend);
router.get('/blood-pressure/latest', auth, familyAccess, healthController.latestBloodPressure);
router.get('/heart-rate/latest', auth, familyAccess, healthController.latestHeartRate);
router.post('/sync', auth, healthController.sync);
router.post('/manual', auth, healthController.manual);

router.post('/device/bind', auth, deviceController.bind);
router.post('/device/unbind', auth, deviceController.unbind);
router.get('/device/list', auth, deviceController.list);
router.post('/device/set-primary', auth, deviceController.setPrimary);

module.exports = router;

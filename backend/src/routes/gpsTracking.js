'use strict';

const express = require('express');
const auth = require('../middleware/auth');
const locationController = require('../controllers/locationController');
const fenceController = require('../controllers/fenceController');
const alertController = require('../controllers/alertController');
const {
  validateFenceId,
  validateTrailQuery,
  validateUpload,
} = require('../middleware/validateGpsTracking');

const router = express.Router();

router.post('/upload', auth, validateUpload, locationController.upload);
router.get('/current', auth, locationController.current);
router.get('/trail', auth, validateTrailQuery, locationController.trail);

router.get('/fences', auth, fenceController.list);
router.post('/fences', auth, fenceController.create);
router.put('/fences/:fenceId', auth, validateFenceId, fenceController.update);
router.delete('/fences/:fenceId', auth, validateFenceId, fenceController.remove);
router.put('/fences/:fenceId/toggle', auth, validateFenceId, fenceController.toggle);

router.get('/alerts', auth, alertController.list);

module.exports = router;

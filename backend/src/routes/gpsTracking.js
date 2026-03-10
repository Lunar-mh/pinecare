'use strict';

const express = require('express');
const auth = require('../middleware/auth');
const locationController = require('../controllers/locationController');
const fenceController = require('../controllers/fenceController');
const alertController = require('../controllers/alertController');

const router = express.Router();

router.post('/upload', auth, locationController.upload);
router.get('/current', auth, locationController.current);
router.get('/trail', auth, locationController.trail);

router.get('/fences', auth, fenceController.list);
router.post('/fences', auth, fenceController.create);
router.put('/fences/:fenceId', auth, fenceController.update);
router.delete('/fences/:fenceId', auth, fenceController.remove);
router.put('/fences/:fenceId/toggle', auth, fenceController.toggle);

router.get('/alerts', auth, alertController.list);

module.exports = router;

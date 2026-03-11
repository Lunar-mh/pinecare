'use strict';

const express = require('express');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const statisticsController = require('../controllers/statisticsController');
const { deprecatedRoute } = require('../utils/deprecation');

const router = express.Router();

router.use(auth, adminAuth);

router.get('/overview', deprecatedRoute('/community/stats'), statisticsController.overview);
router.get('/activities', deprecatedRoute('/community/stats'), statisticsController.activities);

module.exports = router;

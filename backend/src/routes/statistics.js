'use strict';

const express = require('express');
const auth = require('../middleware/auth');
const statisticsController = require('../controllers/statisticsController');
const { deprecatedRoute } = require('../utils/deprecation');

const router = express.Router();

router.get('/overview', auth, deprecatedRoute('/community/stats'), statisticsController.overview);
router.get(
  '/activities',
  auth,
  deprecatedRoute('/community/stats'),
  statisticsController.activities
);

module.exports = router;

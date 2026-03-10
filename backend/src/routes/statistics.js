'use strict';

const express = require('express');
const auth = require('../middleware/auth');
const statisticsController = require('../controllers/statisticsController');

const router = express.Router();

router.get('/overview', auth, statisticsController.overview);
router.get('/activities', auth, statisticsController.activities);

module.exports = router;

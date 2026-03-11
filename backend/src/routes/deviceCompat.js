'use strict';

const express = require('express');
const auth = require('../middleware/auth');
const deviceController = require('../controllers/deviceController');

const router = express.Router();

router.use(auth);
router.post('/bind', deviceController.bind);
router.post('/unbind', deviceController.unbind);
router.get('/list', deviceController.list);
router.post('/set-primary', deviceController.setPrimary);

module.exports = router;
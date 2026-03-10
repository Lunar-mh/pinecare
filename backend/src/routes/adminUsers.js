'use strict';

const express = require('express');
const auth = require('../middleware/auth');
const adminUserController = require('../controllers/adminUserController');

const router = express.Router();

router.get('/', auth, adminUserController.list);
router.get('/:userId', auth, adminUserController.detail);
router.post('/', auth, adminUserController.create);
router.put('/:userId/status', auth, adminUserController.updateStatus);

module.exports = router;

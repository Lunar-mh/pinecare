'use strict';

const express = require('express');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const adminUserController = require('../controllers/adminUserController');

const router = express.Router();

router.use(auth, adminAuth);

router.get('/', adminUserController.list);
router.get('/:userId', adminUserController.detail);
router.post('/', adminUserController.create);
router.put('/:userId/status', adminUserController.updateStatus);

module.exports = router;

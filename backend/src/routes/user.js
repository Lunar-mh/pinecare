'use strict';

const express = require('express');
const auth = require('../middleware/auth');
const userController = require('../controllers/userController');

const router = express.Router();

router.get('/profile', auth, userController.getProfile);
router.put('/profile', auth, userController.updateProfile);

router.get('/emergency-contacts', auth, userController.listEmergencyContacts);
router.post('/emergency-contacts', auth, userController.createEmergencyContact);
router.delete('/emergency-contacts/:id', auth, userController.deleteEmergencyContact);

router.post('/binding/qrcode', auth, userController.createBindingQrcode);
router.post('/binding/approve', auth, userController.approveBinding);

router.post('/account/delete', auth, userController.deleteAccount);
router.post('/unlock', userController.unlockAccount);

module.exports = router;

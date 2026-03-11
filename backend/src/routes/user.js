'use strict';

const express = require('express');
const auth = require('../middleware/auth');
const userController = require('../controllers/userController');
const { deprecatedRoute } = require('../utils/deprecation');

const router = express.Router();

router.get('/profile', auth, userController.getProfile);
router.put('/profile', auth, userController.updateProfile);

// Backward-compatible alias for legacy mini-program clients.
router.get('/info', auth, deprecatedRoute('/user/profile'), userController.getProfile);
router.put('/info', auth, deprecatedRoute('/user/profile'), userController.updateProfile);

router.get('/emergency-contacts', auth, userController.listEmergencyContacts);
router.post('/emergency-contacts', auth, userController.createEmergencyContact);
router.put('/emergency-contacts/:id', auth, userController.updateEmergencyContact);
router.put('/emergency-contacts/:id/primary', auth, userController.setPrimaryContact);
router.delete('/emergency-contacts/:id', auth, userController.deleteEmergencyContact);

// Backward-compatible alias for legacy delete call.
router.post(
  '/emergency-contacts/:id/delete',
  auth,
  deprecatedRoute('/user/emergency-contacts/:id'),
  userController.deleteEmergencyContact
);

router.post('/binding/qrcode', auth, userController.createBindingQrcode);
router.post('/binding/approve', auth, userController.approveBinding);

router.post('/account/delete', auth, userController.deleteAccount);
router.post('/unlock', userController.unlockAccount);

module.exports = router;

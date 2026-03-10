'use strict';

const express = require('express');
const auth = require('../middleware/auth');
const familySpaceController = require('../controllers/familySpaceController');
const { uploadAudio, uploadImage } = require('../middleware/upload');
const {
  validatePagination,
  validateSendMessage,
  validateUploadAlbum,
  validateFamilyIdQuery,
} = require('../middleware/familySpaceValidators');

const router = express.Router();

router.use(auth);

router.post('/message/send', uploadAudio, validateSendMessage, familySpaceController.sendMessage);
router.get('/message/list', validatePagination, familySpaceController.listMessages);

router.post('/album/upload', uploadImage, validateUploadAlbum, familySpaceController.uploadAlbum);
router.get('/album/list', validateFamilyIdQuery, validatePagination, familySpaceController.listAlbum);

router.get('/points', validatePagination, familySpaceController.getPoints);
router.get('/leaderboard', validateFamilyIdQuery, validatePagination, familySpaceController.getLeaderboard);

module.exports = router;

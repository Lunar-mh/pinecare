'use strict';

const express = require('express');
const auth = require('../middleware/auth');
const volunteerAuth = require('../middleware/volunteerAuth');
const volunteerController = require('../controllers/volunteerController');
const {
  validateTaskQuery,
  validateTaskAction,
  validateTrainingQuery,
} = require('../middleware/validateVolunteer');

const router = express.Router();

router.use(auth, volunteerAuth);

router.get('/profile', volunteerController.getProfile);
router.get('/tasks', validateTaskQuery, volunteerController.getTasks);
router.post('/tasks/:taskId/accept', validateTaskAction, volunteerController.acceptTask);
router.post('/tasks/:taskId/check-in', validateTaskAction, volunteerController.checkInTask);
router.post('/tasks/:taskId/check-out', validateTaskAction, volunteerController.checkOutTask);
router.post('/tasks/:taskId/complete', validateTaskAction, volunteerController.completeTask);
router.get('/training', validateTrainingQuery, volunteerController.getTraining);

module.exports = router;

'use strict';

const express = require('express');
const auth = require('../middleware/auth');
const medicationPlanController = require('../controllers/medicationPlanController');
const { validateCreatePlan, validateUpdatePlan } = require('../middleware/validators/medicationPlanValidator');

const router = express.Router();

router.get('/', auth, medicationPlanController.list);
router.post('/', auth, validateCreatePlan, medicationPlanController.create);
router.put('/:id', auth, validateUpdatePlan, medicationPlanController.update);
router.delete('/:id', auth, medicationPlanController.remove);

module.exports = router;

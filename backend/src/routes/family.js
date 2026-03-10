'use strict';

const express = require('express');
const auth = require('../middleware/auth');
const familyController = require('../controllers/familyController');
const { fail } = require('../utils/response');

const router = express.Router();

/**
 * elderId 参数校验
 */
function validateElderId(req, res, next) {
  const elderId = Number(req.params.elderId);
  if (!Number.isInteger(elderId) || elderId <= 0) {
    return fail(res, 422, 'elderId 必须为正整数', null, 422);
  }
  return next();
}

/**
 * 通知设置更新参数校验
 */
function validateSettingsPayload(req, res, next) {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return fail(res, 422, '请求体必须为对象', null, 422);
  }
  return next();
}

router.use(auth);

router.get('/bindings', familyController.getBindings);
router.get('/elderly-overview', familyController.getElderlyOverview);
router.get('/health/:elderId', validateElderId, familyController.getHealthByElderId);
router.get('/settings', familyController.getSettings);
router.put('/settings', validateSettingsPayload, familyController.updateSettings);

module.exports = router;

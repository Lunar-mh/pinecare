'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');
const { fail } = require('../utils/response');
const authController = require('../controllers/authController');

const router = express.Router();

const smsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${req.ip}:${(req.body && req.body.phone) || 'unknown'}`,
  handler: (_req, res) => fail(res, 429, 'Too many SMS requests.', null, 429),
});

const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${req.ip}:${req.path}`,
  handler: (_req, res) => fail(res, 429, 'Too many authentication requests.', null, 429),
});

router.post('/send-sms', smsLimiter, authController.sendSms);
router.post('/admin/login', loginLimiter, authController.adminLogin);

router.post('/sms-code', smsLimiter, (req, res) => {
  req.body = req.body || {};
  if (!req.body.purpose) {
    req.body.purpose = 'login';
  }
  return authController.sendSms(req, res);
});

router.post('/register/phone', loginLimiter, authController.registerPhone);
router.post('/login/phone', loginLimiter, authController.loginPhone);
router.post('/phone', loginLimiter, authController.loginPhoneByCode);
router.post('/refresh-token', authController.refreshToken);
router.post('/login/wechat', loginLimiter, authController.loginWechat);
router.post('/wechat', loginLimiter, authController.loginWechatMiniProgram);

module.exports = router;

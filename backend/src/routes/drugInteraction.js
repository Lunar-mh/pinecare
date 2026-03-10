'use strict';

const express = require('express');
const auth = require('../middleware/auth');
const {
  check,
  history,
  acknowledge,
  contraindication,
  food,
} = require('../controllers/drugInteractionController');

const router = express.Router();

// 全量接口默认要求鉴权
router.use(auth);

router.post('/check', check);
router.get('/history', history);
router.post('/acknowledge', acknowledge);
router.get('/contraindication', contraindication);
router.get('/food', food);

module.exports = router;

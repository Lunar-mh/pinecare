'use strict';

const express = require('express');
const aiConsultRouter = require('./aiConsult');

const router = express.Router();

// 健康检查
router.get('/', (req, res) => {
  res.json({ code: 0, message: '银伴后端服务运行中', data: null });
});

// AI健康顾问路由
router.use('/ai-consult', aiConsultRouter);

module.exports = router;

'use strict';

const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const { startMedicationJobs } = require('./jobs');

const app = express();

// 解析 JSON（限制10MB以支持音频base64）
app.use(express.json({ limit: '10mb' }));

// 跨域
app.use(cors());

// 路由
// 同时支持无前缀与 /api/v1 前缀（便于小程序前端对接）
app.use('/api/v1', routes);
app.use('/', routes);

// 非测试环境启动用药定时任务
if (process.env.NODE_ENV !== 'test') {
  startMedicationJobs();
}

// 全局错误处理（必须放在最后）
app.use(errorHandler);

module.exports = app;

'use strict';

const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// 解析 JSON（限制10MB以支持音频base64）
app.use(express.json({ limit: '10mb' }));

// 跨域
app.use(cors());

// 路由
app.use('/', routes);

// 全局错误处理（必须放在最后）
app.use(errorHandler);

module.exports = app;

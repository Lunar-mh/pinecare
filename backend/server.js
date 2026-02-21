'use strict';

require('dotenv').config();

const app = require('./src/app');

const port = process.env.PORT || 3000;

const server = app.listen(port, () => {
  console.log(`银伴后端服务已启动，端口: ${port}`);
});

// 优雅关闭
function gracefulShutdown(signal) {
  console.log(`收到 ${signal} 信号，正在关闭服务...`);
  server.close(() => {
    console.log('服务已关闭');
    process.exit(0);
  });

  // 若10秒内未关闭，强制退出
  setTimeout(() => {
    console.error('服务关闭超时，强制退出');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

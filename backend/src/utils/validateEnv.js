'use strict';

/**
 * 环境变量启动验证工具
 * 检查必需环境变量，缺失则抛出明确错误
 */

const REQUIRED_VARS = [
  'DB_HOST',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
  'REDIS_HOST',
  'DASHSCOPE_API_KEY',
  'JWT_SECRET',
];

/**
 * 验证所有必需的环境变量是否已设置
 * 若有缺失，打印缺失列表并抛出错误退出进程
 */
function validateEnv() {
  const missing = REQUIRED_VARS.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error('===== 启动失败: 缺少必需的环境变量 =====');
    missing.forEach((key) => {
      console.error(`  ✗ ${key}`);
    });
    console.error('请参考 .env.example 配置环境变量');
    process.exit(1);
  }

  console.log('环境变量验证通过 ✓');
}

module.exports = { validateEnv };

// 测试配置文件
// 如需添加全局测试配置逻辑请在此处添加

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
process.env.RUNTIME_MODE = process.env.RUNTIME_MODE || 'COMPETITION_SANDBOX';
process.env.COMPETITION_SANDBOX = process.env.COMPETITION_SANDBOX || '1';
process.env.PRODUCTION_LIVE = process.env.PRODUCTION_LIVE || '0';
